"""
RetinaVision-AI: Clinical Retinal Inference Pipeline
Integrates PyTorch Deep Learning Classification with Bayesian Deep Learning (BDL)
Monte Carlo Dropout Uncertainty Estimation and Clinical Safety Gating.

Standards Reference:
Oxford Applied and Theoretical Machine Learning (OATML) BDL Benchmarks
https://github.com/OATML/bdl-benchmarks.git
"""

import time
import numpy as np
import torch
from typing import Dict, Any, Optional

from app.core.classifier import DiabeticRetinopathyClassifier, ModelStatus
from app.core.uncertainty import (
    BayesianUncertaintyEstimator,
    UncertaintyResult,
    DEFAULT_SAFE_ENTROPY_THRESHOLD,
    DEFAULT_MC_SAMPLES,
)


class RetinalInferencePipeline:
    """
    Production-grade Clinical Retinal Inference Pipeline.
    Executes:
    1. Preprocessing normalization (ImageNet mean/std)
    2. PyTorch EfficientNet-B0 inference with Platt temperature calibration
    3. Bayesian Monte Carlo Dropout (MC Dropout) sampling for epistemic uncertainty estimation
    4. Information-theoretic uncertainty decomposition (Predictive Entropy, Aleatoric, Epistemic BALD)
    5. Autonomous Safety Gate: Flags `requires_manual_doctor_review = True` if uncertainty_score > safe_threshold
    """

    def __init__(
        self,
        classifier: Optional[DiabeticRetinopathyClassifier] = None,
        uncertainty_estimator: Optional[BayesianUncertaintyEstimator] = None,
        entropy_threshold: float = DEFAULT_SAFE_ENTROPY_THRESHOLD,
        num_mc_samples: int = DEFAULT_MC_SAMPLES
    ):
        self.classifier = classifier or DiabeticRetinopathyClassifier()
        self.uncertainty_estimator = uncertainty_estimator or BayesianUncertaintyEstimator(
            entropy_threshold=entropy_threshold,
            num_samples=num_mc_samples
        )
        self.entropy_threshold = float(entropy_threshold)
        self.num_mc_samples = int(num_mc_samples)

    @property
    def model(self):
        """Pass-through property to access underlying PyTorch model (e.g. for Grad-CAM)."""
        return self.classifier.model

    @property
    def model_status(self):
        return self.classifier.model_status

    @property
    def temperature(self):
        return self.classifier.temperature

    def run_inference(
        self,
        image_rgb_160: np.ndarray,
        suspected_lesions: Optional[Dict[str, int]] = None,
        num_mc_samples: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Executes unified Bayesian inference pipeline.
        Returns full diagnostic dictionary with calibrated predictions,
        uncertainty scores, confidence intervals, and clinician safety flags.
        """
        start_time = time.perf_counter()
        n_samples = num_mc_samples or self.num_mc_samples

        if self.classifier.model is not None and self.classifier.model_status == ModelStatus.VERIFIED_TRAINED_CHECKPOINT:
            # 1. Normalize with ImageNet parameters
            img_norm = image_rgb_160.astype(np.float32) / 255.0
            mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
            std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
            img_norm = (img_norm - mean) / std

            # Tensor (1, 3, 160, 160)
            tensor = torch.from_numpy(img_norm).permute(2, 0, 1).unsqueeze(0).float().to(self.classifier.device)

            # 2. Run Monte Carlo Dropout Epistemic Uncertainty Estimation
            uncertainty_result: UncertaintyResult = self.uncertainty_estimator.estimate_uncertainty(
                model=self.classifier.model,
                tensor=tensor,
                temperature=self.classifier.temperature,
                num_samples=n_samples
            )

            elapsed_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

            res_dict = uncertainty_result.to_dict()
            res_dict.update({
                "uncertainty_note": (
                    f"Bayesian MC Dropout ({n_samples} stochastic forward passes) with temperature calibration. "
                    f"Epistemic (model) uncertainty: {uncertainty_result.epistemic_uncertainty:.4f}, "
                    f"Aleatoric (data) uncertainty: {uncertainty_result.aleatoric_uncertainty:.4f}."
                ),
                "inference_time_ms": elapsed_ms,
                "temperature": round(self.classifier.temperature, 4),
                "model_status": self.classifier.model_status,
                "model_provenance": "EfficientNet-B0 (APTOS 2019 Trained Checkpoint + OATML BDL MC Dropout)",
                "is_verified_checkpoint": True,
                "device_used": str(self.classifier.device),
            })
            return res_dict

        else:
            # Fallback path if deep weights are unverified: morphological ICDR baseline
            baseline = self.classifier._predict_morphological_baseline(suspected_lesions or {}, 0.0)
            elapsed_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

            probs_list = [baseline["class_probabilities"][f"Grade_{i}"] for i in range(5)]
            probs = np.array(probs_list, dtype=np.float32)

            uncertainty_result = self.uncertainty_estimator.estimate_baseline_uncertainty(
                probs=probs,
                suspected_lesions=suspected_lesions
            )

            res_dict = uncertainty_result.to_dict()
            res_dict.update({
                "uncertainty_note": "Rule-based baseline with heuristic uncertainty estimation.",
                "inference_time_ms": elapsed_ms,
                "temperature": 1.0,
                "model_status": self.classifier.model_status,
                "model_provenance": "Rule-Based Morphological Baseline (Weights Unavailable)",
                "is_verified_checkpoint": False,
                "device_used": "cpu"
            })
            return res_dict

    # Alias for backward compatibility
    predict = run_inference


# Standard Alias
InferenceService = RetinalInferencePipeline
