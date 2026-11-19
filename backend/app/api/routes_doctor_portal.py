"""
Doctor Portal API Router
Provides dedicated endpoints for verified ophthalmologists/clinicians:
- Doctor KPI Summary Statistics (GET /api/doctor/stats)
- Review Queue with filtering (GET /api/doctor/queue)
- Clinical Review, Advice & Contact Sign-Off (PATCH /api/doctor/screenings/{record_id}/review)
Strictly guarded by RBAC: 401 Unauthorized if unauthenticated, 403 Forbidden if not doctor.
"""

from datetime import datetime
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File, Form, Header
from starlette.concurrency import run_in_threadpool
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc, cast, String as SqlString

from app.database import get_db
from app.models import Screening, Patient, DoctorReview, User, ClinicDevice
from app.core.auth import require_doctor, get_optional_current_user
from app.schemas import (
    DoctorStatsResponse,
    DoctorQueueItem,
    DoctorQueuePatient,
    DoctorReviewActionPayload,
    ClinicDeviceCreate,
    ClinicDeviceResponse
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
            doctor_final_grade=s.doctor_final_grade if s.doctor_final_grade is not None else (doctor.confirmed_grade if doctor else None),
            ai_overridden=bool(s.ai_overridden) if s.ai_overridden is not None else (doctor.was_overridden if doctor else False),
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

    final_grade = payload.doctor_final_grade if payload.doctor_final_grade is not None else payload.confirmed_grade
    ai_grade = screening.predicted_grade if screening.predicted_grade is not None else (screening.icdr_grade or 0)

    if final_grade is not None:
        screening.doctor_final_grade = final_grade
        screening.ai_overridden = bool(final_grade != ai_grade)
        screening.icdr_grade = final_grade
    else:
        screening.doctor_final_grade = ai_grade
        screening.ai_overridden = False

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

    # Update or create DoctorReview record
    doc_name = current_user.full_name or current_user.username or "Doctor"
    doc_license = current_user.license_id or "MCI-CLINICAL"
    effective_grade = screening.doctor_final_grade if screening.doctor_final_grade is not None else (screening.icdr_grade or 0)

    review = db.query(DoctorReview).filter(DoctorReview.screening_id == target_record_id).first()
    if not review:
        review = DoctorReview(
            screening_id=target_record_id,
            doctor_name=doc_name,
            doctor_license=doc_license,
            confirmed_grade=effective_grade,
            was_overridden=screening.ai_overridden,
            referral_recommendation="Specialist clinical review complete.",
            clinical_notes=payload.doctor_suggestion,
            reviewed_at=now_utc
        )
        db.add(review)
    else:
        review.doctor_name = doc_name
        review.doctor_license = doc_license
        review.confirmed_grade = effective_grade
        review.was_overridden = screening.ai_overridden
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
        "doctor_final_grade": screening.doctor_final_grade,
        "ai_overridden": screening.ai_overridden,
        "reviewed_by_doctor_name": doc_name,
        "doctor_license": doc_license,
        "reviewed_at": now_utc.isoformat(),
        "screening": screening_dict
    }


# =====================================================================
# CLINIC IMAGING DEVICES & DIRECT CAMERA CAPTURE (DOCTOR PORTAL)
# =====================================================================

@router.get("/devices", response_model=List[ClinicDeviceResponse], summary="List Registered Imaging Devices")
def list_doctor_devices(
    current_user: User = Depends(require_doctor),
    db: Session = Depends(get_db)
):
    """
    List all fundus cameras, retinal adapters, and network imaging devices
    registered to the logged-in ophthalmologist.
    """
    devices = db.query(ClinicDevice).filter(
        ClinicDevice.doctor_id == current_user.id
    ).order_by(desc(ClinicDevice.created_at)).all()
    return devices


@router.post("/devices", response_model=ClinicDeviceResponse, summary="Register New Clinic Imaging Device")
def register_doctor_device(
    payload: ClinicDeviceCreate,
    current_user: User = Depends(require_doctor),
    db: Session = Depends(get_db)
):
    """
    Register a new clinic fundus camera or USB live camera adapter.
    Generates a secure API token for direct hardware integrations.
    """
    api_key = f"nx-dev-{uuid.uuid4().hex}"
    device = ClinicDevice(
        doctor_id=current_user.id,
        device_name=payload.device_name.strip(),
        device_model=payload.device_model.strip(),
        connection_type=payload.connection_type.strip(),
        device_api_key=api_key,
        status="ONLINE"
    )
    db.add(device)
    db.commit()
    db.refresh(device)
    return device


@router.delete("/devices/{device_id}", summary="Delete Registered Imaging Device")
def delete_doctor_device(
    device_id: int,
    current_user: User = Depends(require_doctor),
    db: Session = Depends(get_db)
):
    """
    Removes a registered imaging device belonging to the doctor.
    """
    device = db.query(ClinicDevice).filter(
        ClinicDevice.id == device_id,
        ClinicDevice.doctor_id == current_user.id
    ).first()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Device with ID {device_id} not found or does not belong to you."
        )
    db.delete(device)
    db.commit()
    return {"status": "success", "message": f"Device {device_id} successfully deleted."}


@router.post("/device-capture", summary="Direct Machine & Live Camera Retinal Capture")
def capture_device_screening(
    file: UploadFile = File(..., description="Fundus camera photo or live camera frame"),
    patient_name: str = Form("Walk-in Patient"),
    patient_age: Optional[int] = Form(50),
    patient_gender: Optional[str] = Form("Other"),
    eye_side: str = Form("Right Eye (OD)"),
    diabetes_history: str = Form("Type 2 Diabetes"),
    symptoms: Optional[str] = Form(None),
    device_id: Optional[int] = Form(None),
    x_device_key: Optional[str] = Header(None, alias="X-Device-Key"),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """
    Direct retinal capture endpoint for Doctor Portal.
    Accepts captured eye image from live USB fundus camera viewfinder or machine push,
    runs full AI pipeline (IQA + 5-stage grading + Grad-CAM heatmap), links device,
    sets review_status='PENDING_REVIEW', and returns screening detail for instant inspection.
    """
    device = None
    target_doctor_id = None

    if x_device_key:
        device = db.query(ClinicDevice).filter(ClinicDevice.device_api_key == x_device_key).first()
        if not device:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid X-Device-Key token. Machine registration not found."
            )
        target_doctor_id = device.doctor_id
    elif current_user:
        if current_user.role.lower() != "doctor":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Doctor Portal access restricted to certified doctors."
            )
        target_doctor_id = current_user.id
        if device_id:
            device = db.query(ClinicDevice).filter(
                ClinicDevice.id == device_id,
                ClinicDevice.doctor_id == current_user.id
            ).first()
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required: Provide Bearer token or X-Device-Key header."
        )

    if hasattr(file, "file") and hasattr(file.file, "read"):
        file.file.seek(0)
        image_bytes = file.file.read()
    elif hasattr(file, "read"):
        image_bytes = file.read()
    else:
        image_bytes = b""

    if not image_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded eye image is empty.")

    try:
        res = service.process_screening(
            db=db,
            image_bytes=image_bytes,
            patient_name=patient_name,
            age=patient_age or 50,
            gender=patient_gender or "Other",
            eye_side=eye_side,
            diabetes_history=diabetes_history,
            symptoms=symptoms,
            uploaded_by_id=target_doctor_id
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    screening_id = res.get("record_id") or res.get("id")
    if screening_id:
        screening = db.query(Screening).filter(Screening.record_id == screening_id).first()
        if screening:
            if device:
                screening.device_id = device.id
            screening.review_requested = True
            screening.review_status = "PENDING_REVIEW"
            screening.requires_manual_doctor_review = True
            db.commit()
            db.refresh(screening)
            return service.get_screening_dict(db, screening_id)

    return res


