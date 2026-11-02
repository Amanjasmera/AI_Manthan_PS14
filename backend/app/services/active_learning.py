"""
RetinaVision-AI: Active Learning & Clinical Feedback Loop Service (Phase 4)
Manages the curation, dataset versioning, and continuous fine-tuning pipeline
linking city ophthalmologist reviews back to the PyTorch neural network.

Transforms static benchmark data (APTOS 2019 / IDRiD) into a dynamic real-world
learning cycle tagged for regional Indian clinical deployment (Indore Hub v1.1).
"""

from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models import (
    Screening,
    DoctorReview,
    ActiveLearningLog,
    AuditLog,
    DoctorReviewCreate,
)
from app.core.triage import get_triage_info
from app.core.report_generator import PDFReportGenerator

DEFAULT_DATASET_VERSION_TAG = "Indore_Hub_Active_v1.1"


class ActiveLearningService:
    """
    Active Learning Service coordinating:
    1. Clinician verification and override capture
    2. Version-controlled dataset tagging (Indore_Hub_Active_v1.1)
    3. Fine-tuning manifest generation for PyTorch retraining
    4. Dataset metrics, class balance, and hard-sample tracking
    """

    @staticmethod
    def record_doctor_review(
        db: Session,
        screening_id: str,
        review_data: DoctorReviewCreate,
        dataset_tag: Optional[str] = None
    ) -> DoctorReview:
        """
        Receives an ophthalmologist's clinical verification, confirms or overrides
        the AI grade, updates clinical triage, generates active learning records,
        and regenerates the bilingual PDF report.
        """
        screening = db.query(Screening).filter(Screening.id == screening_id).first()
        if not screening:
            raise ValueError(f"Screening record {screening_id} not found.")

        pred = screening.prediction
        ai_grade = pred.predicted_grade if pred else screening.predicted_grade
        confirmed_grade = int(review_data.confirmed_grade)
        was_overridden = bool(ai_grade is not None and ai_grade != confirmed_grade)
        version_tag = dataset_tag or review_data.dataset_tag or DEFAULT_DATASET_VERSION_TAG

        # 1. Update or create DoctorReview
        doctor_review = db.query(DoctorReview).filter(DoctorReview.screening_id == screening_id).first()
        if doctor_review:
            doctor_review.doctor_name = review_data.doctor_name
            doctor_review.doctor_license = review_data.doctor_license or "MCI-REG-AI"
            doctor_review.confirmed_grade = confirmed_grade
            doctor_review.was_overridden = was_overridden
            doctor_review.referral_recommendation = (
                review_data.referral_recommendation or "Specialist ophthalmologist consultation"
            )
            doctor_review.clinical_notes = review_data.clinical_notes or ""
            doctor_review.reviewed_at = datetime.utcnow()
        else:
            doctor_review = DoctorReview(
                screening_id=screening_id,
                doctor_name=review_data.doctor_name,
                doctor_license=review_data.doctor_license or "MCI-REG-AI",
                confirmed_grade=confirmed_grade,
                was_overridden=was_overridden,
                referral_recommendation=(
                    review_data.referral_recommendation or "Specialist ophthalmologist consultation"
                ),
                clinical_notes=review_data.clinical_notes or "",
                reviewed_at=datetime.utcnow()
            )
            db.add(doctor_review)

        # 2. Record Active Learning Log with dynamic dataset version tag
        active_log = db.query(ActiveLearningLog).filter(ActiveLearningLog.screening_id == screening_id).first()
        image_path = screening.preprocessed_image_path or screening.raw_image_path
        uncertainty_score = float(screening.uncertainty_score or (pred.entropy if pred else 0.0))

        if active_log:
            active_log.verified_label = confirmed_grade
            active_log.dataset_tag = version_tag
            active_log.ai_predicted_grade = ai_grade
            active_log.was_overridden = was_overridden
            active_log.doctor_name = review_data.doctor_name
            active_log.clinical_notes = review_data.clinical_notes or ""
            active_log.uncertainty_score = uncertainty_score
            active_log.image_path = image_path
            active_log.updated_at = datetime.utcnow()
        else:
            active_log = ActiveLearningLog(
                screening_id=screening_id,
                verified_label=confirmed_grade,
                dataset_tag=version_tag,
                ai_predicted_grade=ai_grade,
                was_overridden=was_overridden,
                doctor_name=review_data.doctor_name,
                clinical_notes=review_data.clinical_notes or "",
                uncertainty_score=uncertainty_score,
                image_path=image_path,
                updated_at=datetime.utcnow()
            )
            db.add(active_log)

        # 3. Update screening status and update risk stratification to match confirmed grade
        screening.status = "Doctor Verified"
        screening.doctor_notes = review_data.clinical_notes or ""
        screening.requires_manual_doctor_review = False  # Clinician review completed, gate fulfilled
        if screening.prediction:
            screening.prediction.requires_manual_doctor_review = False

        triage = get_triage_info(confirmed_grade)
        screening.systemic_risk = triage["systemic_risk"]
        screening.next_screening_interval = triage["next_interval"]
        screening.referral_urgency = triage["urgency"]

        # 4. Audit Log
        override_note = f"OVERRIDDEN from Grade {ai_grade}" if was_overridden else "CONFIRMED AI prediction"
        audit = AuditLog(
            screening_id=screening_id,
            event_type="DOCTOR_REVIEW",
            details=(
                f"Dr. {review_data.doctor_name} ({review_data.doctor_license}) verified Grade {confirmed_grade} "
                f"({override_note}). Queued into Active Learning dataset [{version_tag}]."
            )
        )
        db.add(audit)

        db.commit()
        db.refresh(doctor_review)

        # 5. Regenerate PDF report with doctor's clinical review included
        try:
            from app.services.screening_service import ScreeningService
            screening_dict = ScreeningService.get_screening_dict(db, screening_id)
            if screening_dict:
                pdf_filename = f"RetinaVision_Report_{screening_id}.pdf"
                PDFReportGenerator.generate_report(screening_dict, pdf_filename)
        except Exception as pdf_err:
            print(f"Notice: PDF update notice on review: {pdf_err}")

        return doctor_review

    @staticmethod
    def get_dataset_statistics(db: Session, dataset_tag: Optional[str] = None) -> Dict[str, Any]:
        """
        Calculates aggregate statistics of clinician-verified active learning data
        for model governance, dataset distribution, and fine-tuning readiness.
        """
        query = db.query(ActiveLearningLog)
        if dataset_tag:
            query = query.filter(ActiveLearningLog.dataset_tag == dataset_tag)

        logs = query.all()
        total_samples = len(logs)

        # Breakdown by tag
        tag_counts = {}
        for l in logs:
            tag_counts[l.dataset_tag] = tag_counts.get(l.dataset_tag, 0) + 1

        # Overridden vs confirmed
        overridden_count = sum(1 for l in logs if l.was_overridden)
        confirmed_count = total_samples - overridden_count
        override_rate = round((overridden_count / total_samples * 100), 2) if total_samples > 0 else 0.0

        # Class distribution of verified labels (0 to 4)
        class_distribution = {f"Grade_{i}": 0 for i in range(5)}
        for l in logs:
            if 0 <= l.verified_label <= 4:
                class_distribution[f"Grade_{l.verified_label}"] += 1

        # Average uncertainty score of verified samples
        uncertainty_scores = [l.uncertainty_score for l in logs if l.uncertainty_score is not None]
        avg_uncertainty = round(float(sum(uncertainty_scores) / len(uncertainty_scores)), 4) if uncertainty_scores else 0.0

        ready_for_fine_tuning = total_samples >= 5

        return {
            "total_verified_samples": total_samples,
            "current_active_tag": dataset_tag or DEFAULT_DATASET_VERSION_TAG,
            "version_tags_breakdown": tag_counts,
            "overridden_samples_count": overridden_count,
            "confirmed_samples_count": confirmed_count,
            "clinician_override_rate_pct": override_rate,
            "verified_class_distribution": class_distribution,
            "average_uncertainty_score": avg_uncertainty,
            "is_ready_for_fine_tuning": ready_for_fine_tuning,
            "status": "FINE_TUNING_READY" if ready_for_fine_tuning else "COLLECTING_SAMPLES",
            "fine_tuning_recommendation": (
                f"{total_samples} verified Indian real-world cases available. Ready for PyTorch fine-tuning epoch (v1 -> v1.1)."
                if ready_for_fine_tuning
                else f"Currently collected {total_samples}/5 samples. Continue clinician sign-offs to trigger retraining."
            )
        }

    @staticmethod
    def export_fine_tuning_manifest(db: Session, dataset_tag: Optional[str] = None) -> Dict[str, Any]:
        """
        Exports clean, verified training manifest for PyTorch dataset loaders
        to execute fine-tuning epochs from v1 to v1.1/v2.
        """
        query = db.query(ActiveLearningLog)
        target_tag = dataset_tag or DEFAULT_DATASET_VERSION_TAG
        if dataset_tag:
            query = query.filter(ActiveLearningLog.dataset_tag == dataset_tag)

        logs = query.order_by(ActiveLearningLog.updated_at.desc()).all()

        samples = []
        for l in logs:
            samples.append({
                "screening_id": l.screening_id,
                "image_path": l.image_path,
                "verified_grade": l.verified_label,
                "ai_predicted_grade": l.ai_predicted_grade,
                "was_overridden": l.was_overridden,
                "doctor_name": l.doctor_name,
                "clinical_notes": l.clinical_notes,
                "uncertainty_score": l.uncertainty_score,
                "dataset_tag": l.dataset_tag,
                "verified_at": l.updated_at.isoformat() if l.updated_at else None
            })

        return {
            "manifest_version": "1.1",
            "exported_at": datetime.utcnow().isoformat(),
            "dataset_tag": target_tag,
            "total_samples": len(samples),
            "samples": samples
        }
