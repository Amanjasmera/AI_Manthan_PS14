import cv2
import numpy as np
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Query, status
from fastapi.responses import FileResponse, JSONResponse
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import UPLOAD_DIR, REPORT_DIR
from app.models import Screening, Patient, ScreeningDetailResponse, IqaResult
from app.services.screening_service import ScreeningService
from app.core.iqa import ImageQualityAssessor
from app.core.report_generator import PDFReportGenerator

router = APIRouter(prefix="/screenings", tags=["Screenings"])
service = ScreeningService()

ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/tiff", "image/bmp", "application/octet-stream"]

@router.post(
    "/analyze",
    response_model=ScreeningDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload & Analyze Retinal Fundus Photograph"
)
async def analyze_retinal_image(
    file: UploadFile = File(..., description="Fundus photograph (JPG, PNG, TIFF)"),
    patient_name: str = Form("Anonymous Patient"),
    age: int = Form(55, ge=0, le=125),
    gender: str = Form("Female"),
    eye_side: str = Form("RIGHT", pattern="^(RIGHT|LEFT)$"),
    diabetes_history: str = Form("Type 2 Diabetes"),
    db: Session = Depends(get_db)
):
    """
    Primary Retinal Screening Intake:
    1. Validates file header and dimensions.
    2. Runs OpenCV Image Quality Assessment (IQA Gate).
       - Zero-Charge Billing Protection: Waives fee (₹0 Charged) on poor quality / blurry scans.
    3. Runs non-blocking PyTorch EfficientNet-B0 inference off the main event loop.
    4. Computes Grad-CAM explainability and segments microvascular anomalies.
    5. Generates bilingual clinical PDF report and saves structured database records.
    """
    if file.content_type and file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type: {file.content_type}. Supported: JPG, PNG, TIFF."
        )

    image_bytes = await file.read()
    if not image_bytes or len(image_bytes) < 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty or corrupted."
        )

    try:
        # Run heavy numerical CV & DL inference in background threadpool to prevent blocking the async event loop
        result = await run_in_threadpool(
            service.process_screening,
            db=db,
            image_bytes=image_bytes,
            patient_name=patient_name,
            age=age,
            gender=gender,
            eye_side=eye_side,
            diabetes_history=diabetes_history
        )
        return result
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Diagnostic screening engine error: {str(e)}"
        )


@router.post(
    "/iqa-check",
    response_model=IqaResult,
    status_code=status.HTTP_200_OK,
    summary="Rapid Pre-Inference Image Quality Check (< 100ms)"
)
async def check_image_quality(file: UploadFile = File(...)):
    """
    Rapid Image Quality Assessment.
    Detects blur, underexposure, overexposure, and non-retinal photographs
    before committing to full model inference.
    """
    image_bytes = await file.read()
    np_arr = np.frombuffer(image_bytes, np.uint8)
    img_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    if img_bgr is None:
        return {
            "passed": False,
            "error_codes": ["INVALID_IMAGE"],
            "blur_score": 0.0,
            "illumination_score": 0.0,
            "contrast_score": 0.0,
            "fov_score": 0.0,
            "feedback": "Unable to decode file as an image.",
            "recapture_instructions": "Check file format and re-upload."
        }

    iqa_result = await run_in_threadpool(ImageQualityAssessor.assess_image, img_bgr)
    return iqa_result


@router.get("", summary="List Patient Screening History")
def list_screenings(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    urgency: Optional[str] = Query(None, description="Filter by ROUTINE, NON_URGENT, URGENT, CRITICAL, RETAKE"),
    db: Session = Depends(get_db)
):
    """Returns paginated longitudinal patient screening records."""
    query = db.query(Screening).join(Patient)
    if urgency:
        query = query.filter(Screening.referral_urgency == urgency)

    total = query.count()
    screenings = query.order_by(Screening.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    items = []
    for s in screenings:
        p = s.patient
        pred = s.prediction
        doctor = s.doctor_review
        
        grade_val = pred.predicted_grade if pred else (s.predicted_grade if s.predicted_grade is not None else 0)
        grade_str = pred.grade_name if pred else (s.grade_name or ("Retake Required" if not s.iqa_passed else "N/A"))
        conf_val = pred.confidence if pred else (s.confidence or 0.0)

        items.append({
            "id": s.id,
            "patient_name": p.full_name,
            "age": p.age,
            "gender": p.gender,
            "eye_side": s.eye_side,
            "iqa_passed": s.iqa_passed,
            "predicted_grade": grade_val,
            "grade_name": grade_str,
            "confidence": conf_val,
            "uncertainty_score": round(s.uncertainty_score, 4) if hasattr(s, "uncertainty_score") and s.uncertainty_score is not None else (round(pred.entropy, 4) if pred else 0.0),
            "requires_manual_doctor_review": bool(s.requires_manual_doctor_review) if hasattr(s, "requires_manual_doctor_review") else False,
            "referral_urgency": s.referral_urgency,
            "status": s.status,
            "confirmed_grade": doctor.confirmed_grade if doctor else None,
            "created_at": s.created_at.isoformat(),
            "billing_status": s.billing_status or ("₹0 Charged — Waived by IQA Gatekeeper" if not s.iqa_passed else "₹25 Valid Scan"),
            "systemic_risk": s.systemic_risk or "Low Systemic Risk",
            "next_screening_interval": s.next_screening_interval or "12 Months"
        })

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "items": items
    }


@router.get("/{screening_id}", response_model=ScreeningDetailResponse, summary="Get Screening Details")
def get_screening_detail(screening_id: str, db: Session = Depends(get_db)):
    """Retrieves full diagnostic record including IQA, prediction, lesions, and doctor review."""
    data = service.get_screening_dict(db, screening_id)
    if not data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Screening record not found.")
    return data


@router.get("/{screening_id}/report.pdf", summary="Download Bilingual PDF Report")
def download_screening_report(screening_id: str, db: Session = Depends(get_db)):
    """Downloads clinical bilingual screening report in PDF format."""
    screening = db.query(Screening).filter(Screening.id == screening_id).first()
    if not screening:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Screening not found.")

    pdf_filename = f"RetinaVision_Report_{screening_id}.pdf"
    pdf_path = REPORT_DIR / pdf_filename

    if not pdf_path.exists():
        PDFReportGenerator.generate_report(screening_id, pdf_filename, db=db)

    return FileResponse(
        str(pdf_path),
        media_type="application/pdf",
        filename=pdf_filename
    )


@router.get("/export/excel", summary="Export Screening Registry as Excel (.xlsx)")
def export_screenings_excel(db: Session = Depends(get_db)):
    """Generates and downloads the full clinical screening registry in Excel OpenXML (.xlsx) format."""
    from app.core.excel_exporter import generate_excel_xlsx, extract_registry_rows, SCREENING_REGISTRY_HEADERS
    from fastapi import Response
    rows = extract_registry_rows(db)
    xlsx_bytes = generate_excel_xlsx(SCREENING_REGISTRY_HEADERS, rows)
    return Response(
        content=xlsx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=netra_x_screening_registry.xlsx"}
    )


@router.get("/export/csv", summary="Export Screening Registry as CSV")
def export_screenings_csv(db: Session = Depends(get_db)):
    """Generates and downloads the full clinical screening registry in CSV format."""
    from app.core.excel_exporter import generate_csv, extract_registry_rows, SCREENING_REGISTRY_HEADERS
    from fastapi import Response
    rows = extract_registry_rows(db)
    csv_str = generate_csv(SCREENING_REGISTRY_HEADERS, rows)
    return Response(
        content=csv_str.encode("utf-8"),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=netra_x_screening_registry.csv"}
    )


@router.get("/unverified", summary="List Unverified Screenings Requiring Doctor Review")
def list_unverified_screenings(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Retrieves all clinical screenings that have not yet been evaluated by an ophthalmologist."""
    query = db.query(Screening).filter(
        (Screening.status != "Doctor Verified") & (Screening.doctor_review == None)
    ).order_by(Screening.created_at.desc())
    total = query.count()
    screenings = query.offset((page - 1) * limit).limit(limit).all()
    items = []
    for s in screenings:
        p = s.patient
        items.append({
            "id": s.id,
            "patient_name": p.full_name if p else "Unknown",
            "age": p.age if p else None,
            "gender": p.gender if p else None,
            "eye_side": s.eye_side,
            "predicted_grade": s.predicted_grade,
            "grade_name": s.grade_name,
            "confidence": s.confidence,
            "referral_urgency": s.referral_urgency,
            "status": s.status,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "billing_status": s.billing_status or "₹25 Valid Scan"
        })
    return {
        "total": total,
        "page": page,
        "limit": limit,
        "items": items
    }
