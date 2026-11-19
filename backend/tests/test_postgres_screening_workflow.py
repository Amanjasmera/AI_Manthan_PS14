import cv2
import numpy as np
import pytest
from sqlalchemy.orm import Session

from app.database import init_db, SessionLocal
from app.models import Screening, Patient
from app.services.screening_service import ScreeningService
from app.schemas import ScreeningSignOffRequest
from app.api.routes_screenings import (
    list_screenings,
    get_screening_detail,
    sign_off_screening,
    delete_screening
)

def create_sample_fundus_bytes() -> bytes:
    img = np.zeros((512, 512, 3), dtype=np.uint8)
    cv2.circle(img, (256, 256), 220, (15, 60, 180), -1)  # Retinal background
    cv2.circle(img, (180, 256), 35, (120, 210, 245), -1)  # Optic disc
    cv2.circle(img, (330, 260), 20, (10, 40, 130), -1)   # Macula
    _, encoded = cv2.imencode(".jpg", img)
    return encoded.tobytes()

def test_full_postgres_screening_lifecycle():
    init_db()
    db = SessionLocal()
    try:
        service = ScreeningService()
        img_bytes = create_sample_fundus_bytes()

        # 1. Test auto-save of patient & screening to DB returning record_id
        result = service.process_screening(
            db=db,
            image_bytes=img_bytes,
            patient_name="Ramesh Chandra",
            age=62,
            gender="Male",
            eye_side="Right Eye (OD)",
            diabetes_history="Type 2 Diabetes (8 yrs)",
            symptoms="Occasional blurred vision in bright light"
        )
        assert "id" in result
        assert "record_id" in result
        record_id = result["record_id"]
        assert record_id is not None
        assert result["patient"]["full_name"] == "Ramesh Chandra"
        assert result["patient"]["symptoms"] == "Occasional blurred vision in bright light"
        assert result["approval_status"] in ["AUTO_APPROVED", "MANUAL_REVIEW_REQUIRED"]

        # 2. Test GET /api/screenings with pagination, name search, and icdr_grade filter
        paged = list_screenings(page=1, limit=10, name="Ramesh", db=db)
        assert "items" in paged
        assert paged["total"] >= 1
        found = [it for it in paged["items"] if it["record_id"] == record_id or it["id"] == record_id]
        assert len(found) >= 1
        screening_item = found[0]
        assert screening_item["patient_name"] == "Ramesh Chandra"
        assert "icdr_grade" in screening_item

        # 3. Test GET /api/screenings/{record_id}
        detail = get_screening_detail(record_id, db=db)
        assert detail["id"] == record_id or detail["record_id"] == record_id
        assert detail["patient"]["name"] == "Ramesh Chandra"

        # 4. Test PATCH /api/screenings/{record_id}/sign-off
        notes = "Clinician Dr. Mehta verified moderate NPDR with microaneurysms. Prescribed regular monitoring."
        sign_off_req = ScreeningSignOffRequest(clinician_notes=notes)
        signoff_res = sign_off_screening(record_id, sign_off_req, db=db)
        assert signoff_res["status"] == "success"
        assert signoff_res["approval_status"] == "CLINICIAN_SIGNED_OFF"
        assert signoff_res["clinician_notes"] == notes
        assert "updated_at" in signoff_res

        # Verify status in database
        db_record = db.query(Screening).filter(
            (Screening.record_id == record_id) | (Screening.id == record_id)
        ).first()
        assert db_record is not None
        assert db_record.approval_status == "CLINICIAN_SIGNED_OFF"
        assert db_record.status == "Doctor Verified"
        assert db_record.clinician_notes == notes

        # 5. Test DELETE /api/screenings/{record_id}
        del_res = delete_screening(record_id, db=db)
        assert del_res["status"] == "success"
        assert del_res["record_id"] == record_id

        # Verify record is deleted
        deleted_record = db.query(Screening).filter(Screening.record_id == record_id).first()
        assert deleted_record is None

    finally:
        db.close()
