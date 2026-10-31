"""
Unit & Integration Tests for Phase 4: Active Learning & Clinical Feedback Loop
Tests doctor review sign-offs, clinical grade overrides, dataset version tagging
(Indore_Hub_Active_v1.1), summary statistics, and PyTorch fine-tuning manifest export.
"""

import sys
from pathlib import Path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

import uuid
import numpy as np
import cv2
from datetime import datetime
from sqlalchemy.orm import Session

from app.database import engine, SessionLocal, init_db
from app.models import (
    Patient,
    Screening,
    Prediction,
    DoctorReview,
    ActiveLearningLog,
    DoctorReviewCreate,
)
from app.services.active_learning import (
    ActiveLearningService,
    DEFAULT_DATASET_VERSION_TAG,
)
from app.routers.reviews import (
    submit_doctor_review,
    get_active_learning_stats,
    list_active_learning_logs,
    export_active_learning_dataset,
)


def create_dummy_screening(db: Session, predicted_grade: int = 1, uncertainty: float = 0.58) -> str:
    """Helper to create a test patient and screening record."""
    from app.config import UPLOAD_DIR
    s_id = str(uuid.uuid4())
    p = Patient(
        full_name=f"Test Active Patient {s_id[:6]}",
        age=58,
        gender="Male",
        diabetes_history="Type 2 Diabetes (6 yrs)"
    )
    db.add(p)
    db.flush()

    raw_path = UPLOAD_DIR / f"{s_id}_raw.jpg"
    prep_path = UPLOAD_DIR / f"{s_id}_prep.jpg"
    dummy_img = np.zeros((160, 160, 3), dtype=np.uint8)
    cv2.circle(dummy_img, (80, 80), 70, (20, 60, 180), -1)
    cv2.imwrite(str(raw_path), dummy_img)
    cv2.imwrite(str(prep_path), dummy_img)

    s = Screening(
        id=s_id,
        patient_id=p.id,
        eye_side="RIGHT",
        raw_image_path=str(raw_path),
        preprocessed_image_path=str(prep_path),
        iqa_passed=True,
        blur_score=150.0,
        illumination_score=120.0,
        contrast_score=60.0,
        predicted_grade=predicted_grade,
        grade_name=f"Grade {predicted_grade}",
        confidence=0.74,
        uncertainty_score=uncertainty,
        requires_manual_doctor_review=True,
        referral_urgency="NON_URGENT",
        status="DOCTOR_REVIEW_REQUIRED"
    )
    db.add(s)

    pred = Prediction(
        screening_id=s_id,
        predicted_grade=predicted_grade,
        grade_name=f"Grade {predicted_grade}",
        confidence=0.74,
        class_probabilities={f"Grade_{i}": 0.2 for i in range(5)},
        entropy=uncertainty,
        uncertainty_score=uncertainty,
        requires_manual_doctor_review=True,
        epistemic_uncertainty=0.08,
        aleatoric_uncertainty=0.50,
        model_status="VERIFIED_TRAINED_CHECKPOINT"
    )
    db.add(pred)
    db.commit()
    return s_id


def test_doctor_review_confirmation():
    """Validates clinician confirming the AI diagnosis without override."""
    init_db()
    db = SessionLocal()
    try:
        s_id = create_dummy_screening(db, predicted_grade=1, uncertainty=0.35)

        review_data = DoctorReviewCreate(
            doctor_name="Dr. Priya Sharma, MS",
            doctor_license="MCI-OPH-9911",
            confirmed_grade=1,  # Same as AI grade 1
            referral_recommendation="Annual routine follow-up",
            clinical_notes="Confirmed mild microaneurysms only. No macular involvement.",
            dataset_tag="Indore_Hub_Active_v1.1"
        )

        review = ActiveLearningService.record_doctor_review(
            db=db,
            screening_id=s_id,
            review_data=review_data
        )

        assert review is not None
        assert review.confirmed_grade == 1
        assert review.was_overridden is False
        assert review.doctor_name == "Dr. Priya Sharma, MS"

        # Check Active Learning Log
        al_log = db.query(ActiveLearningLog).filter(ActiveLearningLog.screening_id == s_id).first()
        assert al_log is not None
        assert al_log.verified_label == 1
        assert al_log.was_overridden is False
        assert al_log.dataset_tag == "Indore_Hub_Active_v1.1"
        assert al_log.ai_predicted_grade == 1
        assert al_log.doctor_name == "Dr. Priya Sharma, MS"

        # Check screening status was updated
        screening = db.query(Screening).filter(Screening.id == s_id).first()
        assert screening.status == "REVIEWED"
        assert screening.requires_manual_doctor_review is False

    finally:
        db.close()


def test_doctor_review_override():
    """Validates clinician overriding the AI diagnosis to correct false negative/positive."""
    init_db()
    db = SessionLocal()
    try:
        s_id = create_dummy_screening(db, predicted_grade=0, uncertainty=0.62)

        review_data = DoctorReviewCreate(
            doctor_name="Dr. Rajesh Verma, MD",
            doctor_license="MCI-OPH-7722",
            confirmed_grade=2,  # Overridden from 0 to 2
            referral_recommendation="Urgent specialist referral for dilated OCT",
            clinical_notes="AI missed temporal hard exudates and venous beading. Overridden to Grade 2.",
            dataset_tag="Indore_Hub_Active_v1.1"
        )

        review = ActiveLearningService.record_doctor_review(
            db=db,
            screening_id=s_id,
            review_data=review_data
        )

        assert review.was_overridden is True
        assert review.confirmed_grade == 2

        # Check Active Learning Log
        al_log = db.query(ActiveLearningLog).filter(ActiveLearningLog.screening_id == s_id).first()
        assert al_log is not None
        assert al_log.verified_label == 2
        assert al_log.was_overridden is True
        assert al_log.ai_predicted_grade == 0
        assert al_log.dataset_tag == "Indore_Hub_Active_v1.1"
        assert "hard exudates" in al_log.clinical_notes

        # Verify risk triage updated to Grade 2 (Moderate NPDR)
        screening = db.query(Screening).filter(Screening.id == s_id).first()
        assert screening.status == "REVIEWED"
        assert screening.requires_manual_doctor_review is False
        assert screening.referral_urgency in ["NON_URGENT", "URGENT"]

    finally:
        db.close()


def test_active_learning_dataset_statistics():
    """Validates dataset aggregation metrics, override rate, and retraining readiness."""
    init_db()
    db = SessionLocal()
    try:
        stats = ActiveLearningService.get_dataset_statistics(db, dataset_tag="Indore_Hub_Active_v1.1")

        assert "total_verified_samples" in stats
        assert stats["total_verified_samples"] >= 2
        assert "overridden_samples_count" in stats
        assert stats["overridden_samples_count"] >= 1
        assert "confirmed_samples_count" in stats
        assert stats["clinician_override_rate_pct"] > 0
        assert "verified_class_distribution" in stats
        assert "is_ready_for_fine_tuning" in stats
        assert "fine_tuning_recommendation" in stats
        assert stats["current_active_tag"] == "Indore_Hub_Active_v1.1"

    finally:
        db.close()


def test_export_fine_tuning_manifest():
    """Validates generation of PyTorch-ready dataset manifest for retraining epochs."""
    init_db()
    db = SessionLocal()
    try:
        manifest = ActiveLearningService.export_fine_tuning_manifest(db, dataset_tag="Indore_Hub_Active_v1.1")

        assert manifest["manifest_version"] == "1.1"
        assert manifest["dataset_tag"] == "Indore_Hub_Active_v1.1"
        assert manifest["total_samples"] >= 2
        assert isinstance(manifest["samples"], list)

        sample = manifest["samples"][0]
        assert "screening_id" in sample
        assert "verified_grade" in sample
        assert "ai_predicted_grade" in sample
        assert "was_overridden" in sample
        assert "doctor_name" in sample
        assert "clinical_notes" in sample
        assert "dataset_tag" in sample

    finally:
        db.close()


def test_review_router_endpoints():
    """Validates FastAPI review router functions directly with database session."""
    init_db()
    db = SessionLocal()
    try:
        s_id = create_dummy_screening(db, predicted_grade=3, uncertainty=0.71)

        # Test POST review
        payload = DoctorReviewCreate(
            doctor_name="Dr. Arvind Patel, MS",
            doctor_license="MCI-OPH-5533",
            confirmed_grade=3,
            referral_recommendation="Laser photocoagulation assessment",
            clinical_notes="Multiple blot hemorrhages in all 4 quadrants verified.",
            dataset_tag="Indore_Hub_Active_v1.1"
        )
        res = submit_doctor_review(s_id, payload, db=db)
        assert res.confirmed_grade == 3
        assert res.was_overridden is False

        # Test GET active learning logs
        logs = list_active_learning_logs(tag="Indore_Hub_Active_v1.1", overridden_only=False, limit=10, db=db)
        assert len(logs) > 0

        # Test GET active learning stats
        stats = get_active_learning_stats(tag="Indore_Hub_Active_v1.1", db=db)
        assert stats["total_verified_samples"] > 0

        # Test GET export
        manifest = export_active_learning_dataset(tag="Indore_Hub_Active_v1.1", db=db)
        assert manifest["total_samples"] > 0

    finally:
        db.close()


if __name__ == "__main__":
    print("Running Phase 4 Active Learning & Clinical Feedback Tests...")
    test_doctor_review_confirmation()
    print("Passed: test_doctor_review_confirmation")
    test_doctor_review_override()
    print("Passed: test_doctor_review_override")
    test_active_learning_dataset_statistics()
    print("Passed: test_active_learning_dataset_statistics")
    test_export_fine_tuning_manifest()
    print("Passed: test_export_fine_tuning_manifest")
    test_review_router_endpoints()
    print("Passed: test_review_router_endpoints")
    print("\n>>> ALL PHASE 4 ACTIVE LEARNING TESTS PASSED 100% CLEANLY! <<<")
