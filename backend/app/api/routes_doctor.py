from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    Screening,
    DoctorReview,
    AuditLog,
    ActiveLearningLog,
    DoctorReviewCreate,
    DoctorReviewResponse,
    ActiveLearningLogResponse
)
from app.core.report_generator import PDFReportGenerator
from app.services.screening_service import ScreeningService
from app.core.triage import get_triage_info

router = APIRouter(prefix="/screenings", tags=["Doctor Review & Active Learning"])

@router.post("/{screening_id}/doctor-review", response_model=DoctorReviewResponse)
def submit_doctor_review(
    screening_id: str,
    review_data: DoctorReviewCreate,
    db: Session = Depends(get_db)
):
    """
    Submits a clinician's expert evaluation, confirming or overriding
    the AI model's predicted grade, adding clinical notes and referral instructions.
    
    Automatically records into active_learning_logs with tag 'Indore_Hub_v2'
    to bridge the domain gap between legacy APTOS 2019 and real-world clinical data.
    """
    screening = db.query(Screening).filter(Screening.id == screening_id).first()
    if not screening:
        raise HTTPException(status_code=404, detail="Screening record not found.")

    pred = screening.prediction
    was_overridden = False
    ai_grade = pred.predicted_grade if pred else screening.predicted_grade
    if ai_grade is not None and ai_grade != review_data.confirmed_grade:
        was_overridden = True

    # 1. Update or create DoctorReview
    doctor_review = db.query(DoctorReview).filter(DoctorReview.screening_id == screening_id).first()
    if doctor_review:
        doctor_review.doctor_name = review_data.doctor_name
        doctor_review.doctor_license = review_data.doctor_license or "MCI-REG-AI"
        doctor_review.confirmed_grade = review_data.confirmed_grade
        doctor_review.was_overridden = was_overridden
        doctor_review.referral_recommendation = review_data.referral_recommendation or "Specialist ophthalmologist consultation"
        doctor_review.clinical_notes = review_data.clinical_notes or ""
        doctor_review.reviewed_at = datetime.utcnow()
    else:
        doctor_review = DoctorReview(
            screening_id=screening_id,
            doctor_name=review_data.doctor_name,
            doctor_license=review_data.doctor_license or "MCI-REG-AI",
            confirmed_grade=review_data.confirmed_grade,
            was_overridden=was_overridden,
            referral_recommendation=review_data.referral_recommendation or "Specialist ophthalmologist consultation",
            clinical_notes=review_data.clinical_notes or ""
        )
        db.add(doctor_review)

    # 2. Record Active Learning Log for model fine-tuning (APTOS vs Real-World Data domain adaptation)
    active_log = db.query(ActiveLearningLog).filter(ActiveLearningLog.screening_id == screening_id).first()
    if active_log:
        active_log.verified_label = review_data.confirmed_grade
        active_log.dataset_tag = "Indore_Hub_v2"
        active_log.updated_at = datetime.utcnow()
    else:
        active_log = ActiveLearningLog(
            screening_id=screening_id,
            verified_label=review_data.confirmed_grade,
            dataset_tag="Indore_Hub_v2",
            updated_at=datetime.utcnow()
        )
        db.add(active_log)

    # 3. Update screening status and update risk stratification to match confirmed grade
    screening.status = "REVIEWED"
    triage = get_triage_info(review_data.confirmed_grade)
    screening.systemic_risk = triage["systemic_risk"]
    screening.next_screening_interval = triage["next_interval"]
    screening.referral_urgency = triage["urgency"]

    # 4. Audit Log
    audit = AuditLog(
        screening_id=screening_id,
        event_type="DOCTOR_REVIEW",
        details=f"Dr. {review_data.doctor_name} set confirmed grade to {review_data.confirmed_grade} (Overridden: {was_overridden}). Synced to Active Learning (Indore_Hub_v2)."
    )
    db.add(audit)

    db.commit()
    db.refresh(doctor_review)

    # 5. Regenerate PDF report with doctor's clinical review included
    screening_dict = ScreeningService.get_screening_dict(db, screening_id)
    if screening_dict:
        pdf_filename = f"RetinaVision_Report_{screening_id}.pdf"
        PDFReportGenerator.generate_report(screening_dict, pdf_filename)

    return doctor_review


@router.get("/active-learning/logs", response_model=List[ActiveLearningLogResponse], summary="List Active Learning Samples")
def list_active_learning_logs(
    tag: str = Query("Indore_Hub_v2", description="Dataset tag filter"),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """
    Returns verified clinician labels accumulated through active learning
    for continual training and domain adaptation (Indore_Hub_v2).
    """
    logs = db.query(ActiveLearningLog).filter(ActiveLearningLog.dataset_tag == tag).order_by(ActiveLearningLog.updated_at.desc()).limit(limit).all()
    return logs
