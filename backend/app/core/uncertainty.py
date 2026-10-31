"""
RetinaVision-AI: Bayesian Deep Learning & Epistemic Uncertainty Estimation Module
Referencing standards from Oxford Applied and Theoretical Machine Learning (OATML)
BDL Benchmarks (https://github.com/OATML/bdl-benchmarks.git) and Gal & Ghahramani (2016):
"Dropout as a Bayesian Approximation: Representing Model Uncertainty in Deep Learning".

Clinical Objectives (Problem Statement 14):
1. Monte Carlo Dropout (MC Dropout) sampling for PyTorch inference with calibrated temperature scaling.
2. Formal uncertainty decomposition into:
   - Predictive Entropy H(p): Total Predictive Uncertainty.
   - Expected Entropy E[H(p)]: Aleatoric Uncertainty (inherent data noise, optical blur, fundus artifacts).
   - Mutual Information I(y, w | x) = H(p) - E[H(p)]: Epistemic Uncertainty (model ambiguity / out-of-distribution pathology).
3. 95% Confidence Intervals and Class-wise Standard Deviations.
4. Autonomous Clinical Safety Gate: If uncertainty_score (predictive entropy) > safe_threshold (default 0.50),
   automatically set `requires_manual_doctor_review = True` to prevent unvalidated automated diagnoses.
"""

import math
import numpy as np
import torch
import torch.nn as nn
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field

from app.config import ICDR_CLASSES

# Clinical Safety Default Thresholds based on OATML Diabetic Retinopathy Benchmarks
DEFAULT_SAFE_ENTROPY_THRESHOLD = 0.50     # Clinical entropy threshold for DR grading
DEFAULT_EPISTEMIC_THRESHOLD = 0.12        # Mutual information threshold (BALD)
DEFAULT_CONFIDENCE_THRESHOLD = 0.65       # Minimum confidence for autonomous clearance
DEFAULT_MC_SAMPLES = 20                   # Monte Carlo stochastic passes
EPSILON = 1e-12                           # Numerical stability epsilon


@dataclass
class UncertaintyResult:
    """Structured Bayesian Deep Learning inference output."""
    predicted_grade: int
    grade_name: str
    confidence: float
    class_probabilities: Dict[str, float]
    entropy: float
    uncertainty_score: float
    normalized_entropy: float
    epistemic_uncertainty: float
    aleatoric_uncertainty: float
    requires_manual_doctor_review: bool
    confidence_interval: Dict[str, Any]
    safety_rationale: List[str]
    mc_samples: int
    is_epistemic_reliable: bool

    def to_dict(self) -> Dict[str, Any]:
        return {
            "predicted_grade": self.predicted_grade,
            "grade_name": self.grade_name,
            "confidence": round(self.confidence, 4),
            "class_probabilities": {k: round(v, 4) for k, v in self.class_probabilities.items()},
            "entropy": round(self.entropy, 4),
            "uncertainty_score": round(self.uncertainty_score, 4),
            "normalized_entropy": round(self.normalized_entropy, 4),
            "epistemic_uncertainty": round(self.epistemic_uncertainty, 4),
            "aleatoric_uncertainty": round(self.aleatoric_uncertainty, 4),
            "requires_manual_doctor_review": self.requires_manual_doctor_review,
            "confidence_interval": self.confidence_interval,
            "safety_rationale": self.safety_rationale,
            "mc_samples": self.mc_samples,
            "is_epistemic_reliable": self.is_epistemic_reliable,
        }


def enable_mc_dropout(model: nn.Module) -> int:
    """
    Puts all Dropout layers into training mode while preserving
    BatchNorm and other layers in eval mode (OATML BDL standard).
    Returns count of active dropout modules.
    """
    model.eval()
    active_count = 0
    for m in model.modules():
        if isinstance(m, (nn.Dropout, nn.Dropout2d, nn.Dropout3d)):
            m.train()
            active_count += 1
    return active_count


class BayesianUncertaintyEstimator:
    """
    Epistemic & Aleatoric Uncertainty Estimator utilizing Monte Carlo Dropout
    and Information-Theoretic Uncertainty Decomposition.
    """

    def __init__(
        self,
        entropy_threshold: float = DEFAULT_SAFE_ENTROPY_THRESHOLD,
        epistemic_threshold: float = DEFAULT_EPISTEMIC_THRESHOLD,
        confidence_threshold: float = DEFAULT_CONFIDENCE_THRESHOLD,
        num_samples: int = DEFAULT_MC_SAMPLES
    ):
        self.entropy_threshold = float(entropy_threshold)
        self.epistemic_threshold = float(epistemic_threshold)
        self.confidence_threshold = float(confidence_threshold)
        self.num_samples = int(max(2, num_samples))

    def estimate_uncertainty(
        self,
        model: nn.Module,
        tensor: torch.Tensor,
        temperature: float = 1.0,
        num_samples: Optional[int] = None
    ) -> UncertaintyResult:
        """
        Executes Monte Carlo Dropout sampling on PyTorch model.
        Args:
            model: PyTorch DR model (e.g., DRGrader EfficientNet-B0).
            tensor: Preprocessed normalized input tensor (1, 3, H, W).
            temperature: Calibrated Platt temperature parameter.
            num_samples: Number of stochastic forward passes (default: self.num_samples).
        """
        n_passes = int(num_samples or self.num_samples)
        temperature = max(1e-4, float(temperature))
        device = tensor.device

        # Optimized execution: if architecture has separate backbone and classifier head
        has_backbone_classifier = hasattr(model, "backbone") and hasattr(model, "classifier")

        with torch.no_grad():
            if has_backbone_classifier:
                # 1. Feature extraction through backbone in eval mode (deterministic)
                model.eval()
                features = model.backbone(tensor)  # (1, feature_dim)

                # 2. Activate MC Dropout on classifier head
                enable_mc_dropout(model.classifier)

                # 3. Batched stochastic forward passes through classifier head
                # PyTorch independently samples dropout masks for each element in the batch
                batch_features = features.expand(n_passes, -1)
                logits = model.classifier(batch_features)  # (n_passes, num_classes)
                probs = torch.softmax(logits / temperature, dim=1).cpu().numpy()

                # Restore classifier to eval mode
                model.classifier.eval()
            else:
                # Generic model: multi-pass MC Dropout
                enable_mc_dropout(model)
                sample_probs = []
                for _ in range(n_passes):
                    out = model(tensor)
                    p = torch.softmax(out / temperature, dim=1).squeeze(0).cpu().numpy()
                    sample_probs.append(p)
                probs = np.stack(sample_probs, axis=0)  # (n_passes, num_classes)
                model.eval()

        return self._compute_uncertainty_metrics(probs, n_passes)

    def _compute_uncertainty_metrics(
        self,
        probs: np.ndarray,
        n_passes: int
    ) -> UncertaintyResult:
        """
        Computes formal BDL benchmark uncertainty metrics from MC sample probabilities:
        - Predictive distribution mean
        - Predictive Entropy H(p) [Total Uncertainty]
        - Expected Entropy E[H(p)] [Aleatoric Uncertainty]
        - Mutual Information I(y, w | x) [Epistemic Uncertainty]
        - Variance / 95% Confidence Intervals
        - Safety Gate assessment: requires_manual_doctor_review
        """
        # 1. Predictive Mean: bar{p} = (1/T) sum_{t=1}^T p_t
        mean_probs = np.mean(probs, axis=0)  # (num_classes,)
        mean_probs = np.clip(mean_probs, 1e-12, 1.0)
        mean_probs = mean_probs / np.sum(mean_probs)  # Ensure exact normalization

        predicted_grade = int(np.argmax(mean_probs))
        confidence = float(mean_probs[predicted_grade])
        grade_name = ICDR_CLASSES[predicted_grade]["name"]

        # 2. Total Uncertainty: Predictive Entropy H(bar{p}) = - sum bar{p}_c log(bar{p}_c)
        predictive_entropy = float(-np.sum(mean_probs * np.log(mean_probs + EPSILON)))
        max_possible_entropy = math.log(len(mean_probs))  # log(5) approx 1.6094
        normalized_entropy = float(predictive_entropy / max_possible_entropy)

        # 3. Aleatoric Uncertainty: Expected Entropy E[H(p)] = (1/T) sum_{t=1}^T H(p_t)
        per_sample_entropy = -np.sum(probs * np.log(np.clip(probs, EPSILON, 1.0)), axis=1)
        expected_entropy = float(np.mean(per_sample_entropy))

        # 4. Epistemic Uncertainty: Mutual Information (BALD) = H(bar{p}) - E[H(p)]
        # Quantifies model disagreement / ambiguity distinct from data noise
        mutual_info = float(max(0.0, predictive_entropy - expected_entropy))

        # 5. Class-wise Standard Deviations and Variance
        class_stds = np.std(probs, axis=0)  # (num_classes,)
        pred_std = float(class_stds[predicted_grade])

        # 6. Empirical 95% Confidence Interval for predicted grade probability
        ci_lower = float(np.clip(np.percentile(probs[:, predicted_grade], 2.5), 0.0, 1.0))
        ci_upper = float(np.clip(np.percentile(probs[:, predicted_grade], 97.5), 0.0, 1.0))
        ci_parametric_lower = float(np.clip(confidence - 1.96 * pred_std, 0.0, 1.0))
        ci_parametric_upper = float(np.clip(confidence + 1.96 * pred_std, 0.0, 1.0))

        confidence_interval = {
            "lower_95": round(ci_lower, 4),
            "upper_95": round(ci_upper, 4),
            "parametric_lower_95": round(ci_parametric_lower, 4),
            "parametric_upper_95": round(ci_parametric_upper, 4),
            "std_dev": round(pred_std, 4),
            "class_std_devs": {f"Grade_{i}": round(float(class_stds[i]), 4) for i in range(len(mean_probs))}
        }

        # 7. Clinical Safety Gating & Decision Boundary Validation
        uncertainty_score = predictive_entropy
        requires_manual_doctor_review = False
        safety_rationale = []

        if uncertainty_score > self.entropy_threshold:
            requires_manual_doctor_review = True
            safety_rationale.append(
                f"Predictive entropy ({uncertainty_score:.4f}) exceeds safe clinical threshold ({self.entropy_threshold:.2f})."
            )

        if mutual_info > self.epistemic_threshold:
            requires_manual_doctor_review = True
            safety_rationale.append(
                f"High epistemic uncertainty / model disagreement ({mutual_info:.4f} > {self.epistemic_threshold:.2f}) indicates out-of-distribution artifacts or ambiguous pathology."
            )

        if confidence < self.confidence_threshold:
            requires_manual_doctor_review = True
            safety_rationale.append(
                f"Model predictive confidence ({confidence*100:.1f}%) is below safe autonomous threshold ({self.confidence_threshold*100:.1f}%)."
            )

        # Check for close decision boundary competition (e.g., Grade 1 vs Grade 2)
        sorted_probs = np.sort(mean_probs)[::-1]
        top1_top2_margin = float(sorted_probs[0] - sorted_probs[1])
        if top1_top2_margin < 0.15:
            requires_manual_doctor_review = True
            safety_rationale.append(
                f"Narrow diagnostic margin between top 2 grades (margin: {top1_top2_margin:.3f} < 0.150). Borderline severity requires clinician confirmation."
            )

        if requires_manual_doctor_review:
            safety_rationale.append(
                "Clinical Safety Gate Triggered: Autonomous auto-approval blocked. Human ophthalmologist review mandated."
            )

        class_probabilities = {f"Grade_{i}": round(float(mean_probs[i]), 4) for i in range(len(mean_probs))}

        return UncertaintyResult(
            predicted_grade=predicted_grade,
            grade_name=grade_name,
            confidence=confidence,
            class_probabilities=class_probabilities,
            entropy=predictive_entropy,
            uncertainty_score=uncertainty_score,
            normalized_entropy=normalized_entropy,
            epistemic_uncertainty=mutual_info,
            aleatoric_uncertainty=expected_entropy,
            requires_manual_doctor_review=requires_manual_doctor_review,
            confidence_interval=confidence_interval,
            safety_rationale=safety_rationale,
            mc_samples=n_passes,
            is_epistemic_reliable=True
        )

    def estimate_baseline_uncertainty(
        self,
        probs: np.ndarray,
        suspected_lesions: Optional[Dict[str, int]] = None
    ) -> UncertaintyResult:
        """
        Uncertainty estimation for heuristic morphological baseline fallback
        when deep weights are unverified or running in rule-based mode.
        """
        probs = np.clip(probs, 1e-12, 1.0)
        probs = probs / np.sum(probs)
        predicted_grade = int(np.argmax(probs))
        confidence = float(probs[predicted_grade])
        grade_name = ICDR_CLASSES[predicted_grade]["name"]

        entropy = float(-np.sum(probs * np.log(probs + EPSILON)))
        max_ent = math.log(len(probs))
        norm_entropy = float(entropy / max_ent)

        # In rule-based fallback, epistemic uncertainty represents baseline model unverified status
        epistemic = float(min(entropy, 0.25))
        aleatoric = float(max(0.0, entropy - epistemic))

        uncertainty_score = entropy
        requires_manual_doctor_review = False
        safety_rationale = []

        if uncertainty_score > self.entropy_threshold:
            requires_manual_doctor_review = True
            safety_rationale.append(
                f"Predictive entropy ({uncertainty_score:.4f}) exceeds safe threshold ({self.entropy_threshold:.2f})."
            )

        if confidence < self.confidence_threshold:
            requires_manual_doctor_review = True
            safety_rationale.append(
                f"Heuristic confidence ({confidence*100:.1f}%) below {self.confidence_threshold*100:.1f}%."
            )

        # Morphological ambiguity check (e.g. 4 microaneurysms is right on the boundary between Mild and Moderate)
        lesions = suspected_lesions or {}
        ma = lesions.get("microaneurysms", 0)
        he = lesions.get("hemorrhages", 0)
        if ma in [3, 4, 5] or he in [2, 3, 4]:
            requires_manual_doctor_review = True
            safety_rationale.append("Borderline lesion count detected near ICDR grade boundary.")

        if requires_manual_doctor_review:
            safety_rationale.append("Clinical Safety Gate Triggered: Mandatory doctor review required.")

        class_probabilities = {f"Grade_{i}": round(float(probs[i]), 4) for i in range(len(probs))}
        ci = {
            "lower_95": round(max(0.0, confidence - 0.15), 4),
            "upper_95": round(min(1.0, confidence + 0.15), 4),
            "std_dev": 0.08,
            "class_std_devs": {f"Grade_{i}": 0.08 for i in range(len(probs))}
        }

        return UncertaintyResult(
            predicted_grade=predicted_grade,
            grade_name=grade_name,
            confidence=confidence,
            class_probabilities=class_probabilities,
            entropy=entropy,
            uncertainty_score=uncertainty_score,
            normalized_entropy=norm_entropy,
            epistemic_uncertainty=epistemic,
            aleatoric_uncertainty=aleatoric,
            requires_manual_doctor_review=requires_manual_doctor_review,
            confidence_interval=ci,
            safety_rationale=safety_rationale,
            mc_samples=1,
            is_epistemic_reliable=False
        )
