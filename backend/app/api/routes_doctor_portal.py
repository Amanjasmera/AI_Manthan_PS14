"""
Doctor Portal API Router
Provides dedicated endpoints for verified ophthalmologists/clinicians:
- Doctor KPI Summary Statistics (GET /api/doctor/stats)
- Review Queue with filtering (GET /api/doctor/queue)
- Clinical Review, Advice & Contact Sign-Off (PATCH /api/doctor/screenings/{record_id}/review)
Strictly guarded by RBAC: 401 Unauthorized if unauthenticated, 403 Forbidden if not doctor.
"""

from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc, cast, String as SqlString

from app.database import get_db
from app.models import Screening, Patient, DoctorReview, User
from app.core.auth import require_doctor
from app.schemas import (
    DoctorStatsResponse,
    DoctorQueueItem,
    DoctorQueuePatient,
    DoctorReviewActionPayload
)
from app.services.screening_service import ScreeningService

router = APIRouter(prefix="/doctor", tags=["Doctor Portal"])
service = ScreeningService()


@router.get("/stats", response_model=DoctorStatsResponse, summary="Doctor Portal KPI Statistics")
def get_doctor_portal_stats(
    current_user: User = Depends(require_doctor),
    db: Session = Depends(get_db)
):
    """
    Returns high-level KPI metrics for the clinician workspace:
    - Pending Reviews
    - Urgent / High-Risk Cases (Grade 3–4)
    - Completed Reviews
    - Total Clinic Screenings
    """
    total_screenings = db.query(Screening).count()

    pending_reviews = db.query(Screening).filter(
        or_(
            Screening.review_status == "PENDING_REVIEW",
            and_(
                Screening.requires_manual_doctor_review == True,
                Screening.review_status != "REVIEWED",
                Screening.approval_status != "CLINICIAN_SIGNED_OFF"
            )
        )
    ).count()

    high_risk_cases = db.query(Screening).filter(
        or_(
            Screening.icdr_grade >= 3,
            Screening.predicted_grade >= 3
        )
    ).count()

    completed_reviews = db.query(Screening).filter(
        or_(
            Screening.review_status.in_(["REVIEWED", "URGENT_FOLLOWUP"]),
            Screening.approval_status == "CLINICIAN_SIGNED_OFF",
            Screening.status == "Doctor Verified"
        )
    ).count()

    return DoctorStatsResponse(
        pending_reviews=pending_reviews,
        high_risk_cases=high_risk_cases,
        completed_reviews=completed_reviews,
        total_screenings=total_screenings
    )


@router.get("/queue", response_model=List[DoctorQueueItem], summary="Doctor Review Queue")
def get_doctor_review_queue(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter: PENDING_REVIEW, HIGH_RISK, REVIEWED, ALL"),
    icdr_grade: Optional[int] = Query(None, ge=0, le=4, description="Filter by ICDR Grade 0-4"),
    search: Optional[str] = Query(None, description="Search by patient name, phone, email, or record ID"),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(require_doctor),
    db: Session = Depends(get_db)
):
    """
    Returns list of screening cases for clinician review.
    Sorted by urgency (pending review & high-risk first, then newest first).
    """
    query = db.query(Screening).join(Patient, Screening.patient_id == Patient.id, isouter=True)

    if status_filter:
        normalized_status = status_filter.upper()
        if normalized_status == "PENDING_REVIEW":
            query = query.filter(
                or_(
                    Screening.review_status == "PENDING_REVIEW",
                    and_(
                        Screening.requires_manual_doctor_review == True,
                        Screening.review_status != "REVIEWED",
                        Screening.approval_status != "CLINICIAN_SIGNED_OFF"
                    )
                )
            )
        elif normalized_status == "HIGH_RISK":
            query = query.filter(
                or_(
                    Screening.icdr_grade >= 3,
                    Screening.predicted_grade >= 3
                )
            )
        elif normalized_status == "REVIEWED":
            query = query.filter(
                or_(
                    Screening.review_status.in_(["REVIEWED", "URGENT_FOLLOWUP"]),
                    Screening.approval_status == "CLINICIAN_SIGNED_OFF",
                    Screening.status == "Doctor Verified"
                )
            )

    if icdr_grade is not None:
        query = query.filter(
            or_(
                Screening.icdr_grade == icdr_grade,
                Screening.predicted_grade == icdr_grade
            )
        )

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Patient.name.ilike(search_term),
                Patient.full_name.ilike(search_term),
                Screening.patient_phone.ilike(search_term),
                Screening.patient_email.ilike(search_term),
                Screening.record_id.ilike(search_term)
            )
        )

    # Sort: pending / urgent reviews top priority, followed by creation date desc
    screenings = query.order_by(
        desc(Screening.review_status == "PENDING_REVIEW"),
        desc(Screening.icdr_grade),
        desc(Screening.created_at)
    ).limit(limit).all()

    items = []
    for s in screenings:
        p = s.patient
        doctor = s.doctor_review
        rec_id = s.record_id or str(s.id)
        pat_name = (p.name or p.full_name) if p else "Anonymous Patient"

        grade_val = s.icdr_grade if s.icdr_grade is not None else (s.predicted_grade if s.predicted_grade is not None else 0)
        stage_str = s.stage_label or s.grade_name or "No DR"
        conf_val = s.model_confidence if s.model_confidence is not None else (s.confidence or 0.0)

        raw_url = s.raw_image_url
        if not raw_url and s.raw_image_path:
            from pathlib import Path
            raw_url = f"/api/v1/files/{Path(s.raw_image_path).name}"

        heatmap_url = s.heatmap_image_url

        doc_name = None
        if s.reviewed_by_doctor:
            doc_name = s.reviewed_by_doctor.full_name or s.reviewed_by_doctor.username
        elif doctor:
            doc_name = doctor.doctor_name

        items.append(DoctorQueueItem(
            id=rec_id,
            record_id=rec_id,
            patient=DoctorQueuePatient(
                id=p.id if p else None,
                name=pat_name,
                age=p.age if p else None,
                gender=p.gender if p else None,
                phone=s.patient_phone,
                email=s.patient_email,
                diabetes_history=p.diabetes_history if p else "Type 2 Diabetes",
                symptoms=p.symptoms if p else None
            ),
            patient_name=pat_name,
            age=p.age if p else None,
            gender=p.gender if p else None,
            eye_side=s.eye_side or "Right Eye (OD)",
            icdr_grade=grade_val,
            stage_label=stage_str,
            model_confidence=conf_val,
            entropy=s.entropy or 0.0,
            epistemic_uncertainty=s.epistemic_uncertainty or 0.0,
            aleatoric_uncertainty=s.aleatoric_uncertainty or 0.0,
            hard_exudates=s.hard_exudates or 0,
            soft_exudates=s.soft_exudates or 0,
            raw_image_url=raw_url,
            heatmap_image_url=heatmap_url,
            review_requested=bool(s.review_requested),
            review_status=s.review_status or "NOT_REQUESTED",
            doctor_suggestion=s.doctor_suggestion or (doctor.clinical_notes if doctor else None),
            doctor_contact_info=s.doctor_contact_info,
            reviewed_at=s.reviewed_at.isoformat() if s.reviewed_at else (doctor.reviewed_at.isoformat() if doctor and doctor.reviewed_at else None),
            reviewed_by_doctor_name=doc_name,
            created_at=s.created_at.isoformat() if s.created_at else None,
            referral_urgency=s.referral_urgency or "ROUTINE",
            status=s.status or "ANALYZED"
        ))

    return items


@router.patch("/screenings/{record_id}/review", summary="Clinician Review & Suggestion Sign-Off")
def submit_doctor_portal_review(
    record_id: str,
    payload: DoctorReviewActionPayload,
    current_user: User = Depends(require_doctor),
    db: Session = Depends(get_db)
):
    """
    Submits doctor's expert review, clinical suggestion/advice, and clinic contact info.
    Transitions status to 'REVIEWED' or 'URGENT_FOLLOWUP', and marks approval_status as 'CLINICIAN_SIGNED_OFF'.
    """
    screening = db.query(Screening).filter(
        or_(
            Screening.record_id == str(record_id),
            cast(Screening.id, SqlString) == str(record_id)
        )
    ).first()
    if not screening:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Screening record {record_id} not found.")

    target_record_id = screening.record_id or str(screening.id)
    now_utc = datetime.utcnow()

    # Update screening fields
    screening.doctor_suggestion = payload.doctor_suggestion
    screening.review_status = payload.review_status
    if payload.doctor_contact_info:
        screening.doctor_contact_info = payload.doctor_contact_info
    screening.reviewed_by_doctor_id = current_user.id
    screening.reviewed_at = now_utc
    screening.approval_status = "CLINICIAN_SIGNED_OFF"
    screening.status = "Doctor Verified"
    screening.clinician_notes = payload.doctor_suggestion
    screening.doctor_notes = payload.doctor_suggestion
    screening.requires_manual_doctor_review = False

    if payload.confirmed_grade is not None:
        screening.icdr_grade = payload.confirmed_grade
        screening.predicted_grade = payload.confirmed_grade

    # Update or create DoctorReview record
    doc_name = current_user.full_name or current_user.username or "Doctor"
    doc_license = current_user.license_id or "MCI-CLINICAL"
    effective_grade = screening.icdr_grade if screening.icdr_grade is not None else 0

    review = db.query(DoctorReview).filter(DoctorReview.screening_id == target_record_id).first()
    if not review:
        review = DoctorReview(
            screening_id=target_record_id,
            doctor_name=doc_name,
            doctor_license=doc_license,
            confirmed_grade=effective_grade,
            was_overridden=(payload.confirmed_grade is not None and payload.confirmed_grade != screening.predicted_grade),
            referral_recommendation="Specialist clinical review complete.",
            clinical_notes=payload.doctor_suggestion,
            reviewed_at=now_utc
        )
        db.add(review)
    else:
        review.doctor_name = doc_name
        review.doctor_license = doc_license
        review.confirmed_grade = effective_grade
        review.clinical_notes = payload.doctor_suggestion
        review.reviewed_at = now_utc

    db.commit()
    db.refresh(screening)

    screening_dict = service.get_screening_dict(db, target_record_id)

    return {
        "status": "success",
        "record_id": target_record_id,
        "review_status": screening.review_status,
        "approval_status": screening.approval_status,
        "doctor_suggestion": screening.doctor_suggestion,
        "doctor_contact_info": screening.doctor_contact_info,
        "reviewed_at": now_utc.isoformat(),
        "screening": screening_dict
    }
