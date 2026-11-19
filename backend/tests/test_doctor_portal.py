import sys
from pathlib import Path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

import uuid
import pytest
from fastapi import HTTPException
from app.database import SessionLocal, init_db
from app.models import User, Patient, Screening
from app.core.auth import seed_default_users, require_doctor
from app.schemas import (
    ReviewRequestPayload,
    DoctorReviewActionPayload,
    DoctorStatsResponse,
    ClinicDeviceCreate
)
from app.api.routes_doctor_portal import (
    get_doctor_portal_stats,
    get_doctor_review_queue,
    submit_doctor_portal_review,
    list_doctor_devices,
    register_doctor_device,
    delete_doctor_device,
    capture_device_screening
)
from app.api.routes_screenings import request_doctor_review


@pytest.fixture(scope="module")
def db_session():
    init_db()
    db = SessionLocal()
    seed_default_users(db)
    yield db
    db.close()


def test_doctor_portal_rbac_security(db_session):
    """
    Verifies strict role-based access control:
    - 403 Forbidden for regular 'user' role
    - Success for verified 'doctor' role
    """
    regular_user = db_session.query(User).filter(User.role.ilike("user")).first()
    doctor_user = db_session.query(User).filter(User.role.ilike("doctor")).first()

    assert regular_user is not None
    assert doctor_user is not None

    # 1. require_doctor rejects regular user
    with pytest.raises(HTTPException) as exc_info:
        require_doctor(current_user=regular_user)
    assert exc_info.value.status_code == 403
    assert "restricted" in exc_info.value.detail.lower() or "doctor" in exc_info.value.detail.lower()

    # 2. require_doctor allows verified doctor
    doc = require_doctor(current_user=doctor_user)
    assert doc.id == doctor_user.id

    # 3. Stats endpoint works for doctor
    stats = get_doctor_portal_stats(current_user=doctor_user, db=db_session)
    assert isinstance(stats, DoctorStatsResponse)
    assert stats.total_screenings >= 0
    assert stats.pending_reviews >= 0
    assert stats.high_risk_cases >= 0
    assert stats.completed_reviews >= 0


def test_user_request_review_and_doctor_signoff_workflow(db_session):
    """
    Tests full user-to-doctor review cycle:
    1. Create test patient and screening record
    2. User requests review with phone & note (request_doctor_review)
    3. Verify record shows in doctor queue under 'PENDING_REVIEW'
    4. Doctor submits clinical review & contact info (submit_doctor_portal_review)
    5. Verify review is completed and updated in DB
    """
    doctor_user = db_session.query(User).filter(User.role.ilike("doctor")).first()
    assert doctor_user is not None

    rec_id = f"test-portal-{uuid.uuid4().hex[:8]}"
    patient = Patient(
        name="Sunita Devi",
        age=58,
        gender="Female",
        diabetes_history="Type 2 Diabetes (8 years)",
        symptoms="Occasional blurriness in right eye"
    )
    db_session.add(patient)
    db_session.flush()

    screening = Screening(
        record_id=rec_id,
        patient_id=patient.id,
        eye_side="Right Eye (OD)",
        icdr_grade=3,
        stage_label="Severe NPDR",
        model_confidence=0.92,
        entropy=0.18,
        review_requested=False,
        review_status="NOT_REQUESTED",
        requires_manual_doctor_review=True,
        referral_urgency="URGENT"
    )
    db_session.add(screening)
    db_session.commit()

    # 1. User submits review request
    req_payload = ReviewRequestPayload(
        patient_phone="+91 9876543210",
        patient_email="sunita@example.com",
        notes="Patient reports seeing dark floaters."
    )
    res_req = request_doctor_review(record_id=rec_id, payload=req_payload, db=db_session)
    assert res_req["status"] == "success"
    assert res_req["review_status"] == "PENDING_REVIEW"
    assert res_req["record_id"] == rec_id

    # 2. Check doctor queue
    queue_items = get_doctor_review_queue(
        status_filter="PENDING_REVIEW",
        icdr_grade=None,
        search=None,
        limit=100,
        current_user=doctor_user,
        db=db_session
    )
    matching = [it for it in queue_items if it.record_id == rec_id]
    assert len(matching) == 1
    target = matching[0]
    assert target.patient_name == "Sunita Devi"
    assert target.patient.phone == "+91 9876543210"
    assert target.review_status == "PENDING_REVIEW"
    assert target.icdr_grade == 3

    # 3. Doctor submits expert review & clinical suggestion
    doctor_action = DoctorReviewActionPayload(
        doctor_suggestion="Urgent optical coherence tomography (OCT) and anti-VEGF consultation recommended within 48 hours.",
        review_status="URGENT_FOLLOWUP",
        doctor_contact_info="+91 9988776655 (District Eye Hospital Helpline)",
        confirmed_grade=3
    )
    review_resp = submit_doctor_portal_review(
        record_id=rec_id,
        payload=doctor_action,
        current_user=doctor_user,
        db=db_session
    )
    assert review_resp["status"] == "success"
    assert review_resp["review_status"] == "URGENT_FOLLOWUP"
    assert review_resp["approval_status"] == "CLINICIAN_SIGNED_OFF"
    assert "OCT" in review_resp["doctor_suggestion"]
    assert review_resp["doctor_contact_info"] == "+91 9988776655 (District Eye Hospital Helpline)"

    # 4. Refresh screening from db and check fields
    db_session.refresh(screening)
    assert screening.review_status == "URGENT_FOLLOWUP"
    assert screening.approval_status == "CLINICIAN_SIGNED_OFF"
    assert screening.status == "Doctor Verified"
    assert screening.doctor_suggestion is not None
    assert screening.doctor_contact_info == "+91 9988776655 (District Eye Hospital Helpline)"
    assert screening.reviewed_at is not None
    assert screening.reviewed_by_doctor_id == doctor_user.id
    assert screening.doctor_final_grade == 3
    assert screening.ai_overridden is False


def test_doctor_grade_override_logic(db_session):
    """
    Tests doctor AI grade override vs agree behavior:
    - If doctor_final_grade != icdr_grade, ai_overridden must be True
    - If doctor_final_grade == icdr_grade, ai_overridden must be False
    """
    doctor_user = db_session.query(User).filter(User.role.ilike("doctor")).first()
    assert doctor_user is not None

    # Case A: Doctor overrides AI grade (AI said Grade 2, Doctor overrides to Grade 4)
    rec_id_a = f"test-override-{uuid.uuid4().hex[:8]}"
    patient_a = Patient(name="Ramesh Patel", age=62, gender="Male")
    db_session.add(patient_a)
    db_session.flush()

    screening_a = Screening(
        record_id=rec_id_a,
        patient_id=patient_a.id,
        eye_side="Left Eye (OS)",
        icdr_grade=2,
        stage_label="Moderate NPDR",
        model_confidence=0.88,
        entropy=0.22,
        review_requested=True,
        review_status="PENDING_REVIEW"
    )
    db_session.add(screening_a)
    db_session.commit()

    action_override = DoctorReviewActionPayload(
        doctor_suggestion="Proliferative neovascularization observed at optic disc margin. Overriding grade to 4.",
        review_status="URGENT_FOLLOWUP",
        doctor_final_grade=4,
        confirmed_grade=4
    )
    res_a = submit_doctor_portal_review(
        record_id=rec_id_a,
        payload=action_override,
        current_user=doctor_user,
        db=db_session
    )
    assert res_a["status"] == "success"
    assert res_a["doctor_final_grade"] == 4
    assert res_a["ai_overridden"] is True

    db_session.refresh(screening_a)
    assert screening_a.doctor_final_grade == 4
    assert screening_a.ai_overridden is True
    assert screening_a.reviewed_by_doctor_id == doctor_user.id

    # Case B: Doctor agrees with AI grade (AI said Grade 1, Doctor confirms Grade 1)
    rec_id_b = f"test-agree-{uuid.uuid4().hex[:8]}"
    patient_b = Patient(name="Kavita Rao", age=45, gender="Female")
    db_session.add(patient_b)
    db_session.flush()

    screening_b = Screening(
        record_id=rec_id_b,
        patient_id=patient_b.id,
        eye_side="Right Eye (OD)",
        icdr_grade=1,
        stage_label="Mild NPDR",
        model_confidence=0.94,
        entropy=0.12,
        review_requested=True,
        review_status="PENDING_REVIEW"
    )
    db_session.add(screening_b)
    db_session.commit()

    action_agree = DoctorReviewActionPayload(
        doctor_suggestion="Isolated microaneurysms only. Agree with Grade 1. Follow up in 6 months.",
        review_status="REVIEWED",
        doctor_final_grade=1,
        confirmed_grade=1
    )
    res_b = submit_doctor_portal_review(
        record_id=rec_id_b,
        payload=action_agree,
        current_user=doctor_user,
        db=db_session
    )
    assert res_b["status"] == "success"
    assert res_b["doctor_final_grade"] == 1
    assert res_b["ai_overridden"] is False

    db_session.refresh(screening_b)
    assert screening_b.doctor_final_grade == 1
    assert screening_b.ai_overridden is False


def test_doctor_devices_and_direct_capture_workflow(db_session):
    """
    Tests Clinic Imaging Devices & Direct Retinal Camera Capture:
    1. Register new machine with auto-generated secure API token
    2. List machines for authenticated doctor
    3. Direct machine/camera retinal capture upload (IQA + 5-stage inference + PENDING_REVIEW)
    4. Hardware push authentication via X-Device-Key
    5. Delete device and verify cleanup
    """
    import asyncio
    import io
    import numpy as np
    import cv2
    from fastapi import UploadFile

    doctor_user = db_session.query(User).filter(User.role.ilike("doctor")).first()
    assert doctor_user is not None

    # 1. Register new imaging device
    dev_payload = ClinicDeviceCreate(
        device_name="Room 2 Topcon Fundus Scanner",
        device_model="Topcon TRC-NW400 USB Retinal Camera",
        connection_type="USB_LIVE_CAMERA"
    )
    dev = register_doctor_device(payload=dev_payload, current_user=doctor_user, db=db_session)
    assert dev.id is not None
    assert dev.doctor_id == doctor_user.id
    assert dev.device_name == "Room 2 Topcon Fundus Scanner"
    assert dev.device_api_key.startswith("nx-dev-")
    assert dev.status == "ONLINE"

    # 2. List devices for doctor
    devices = list_doctor_devices(current_user=doctor_user, db=db_session)
    assert any(d.id == dev.id for d in devices)

    # 3. Direct Camera Capture by doctor
    # Create synthetic retinal eye frame that satisfies IQA checks
    frame = np.zeros((512, 512, 3), dtype=np.uint8)
    cv2.circle(frame, (256, 256), 220, (15, 60, 180), -1)  # Retinal background
    cv2.circle(frame, (180, 256), 35, (120, 210, 245), -1)  # Optic disc
    cv2.circle(frame, (330, 260), 20, (10, 40, 130), -1)   # Macula
    _, img_encoded = cv2.imencode(".jpg", frame)
    file_bytes = img_encoded.tobytes()

    class MockUploadFile:
        def __init__(self, filename: str, content: bytes):
            self.filename = filename
            self.content = content
        def read(self):
            return self.content

    upload_file_1 = MockUploadFile(filename="live_fundus_cam.jpg", content=file_bytes)
    capture_res = capture_device_screening(
        file=upload_file_1,
        patient_name="Rameshwar Prasad",
        patient_age=62,
        patient_gender="Male",
        eye_side="Right Eye (OD)",
        diabetes_history="Type 2 Diabetes",
        symptoms=None,
        device_id=dev.id,
        x_device_key=None,
        current_user=doctor_user,
        db=db_session
    )

    assert capture_res is not None
    rec_id = capture_res.get("record_id") or capture_res.get("id")
    assert rec_id is not None
    assert capture_res["review_status"] == "PENDING_REVIEW"
    assert capture_res.get("requires_manual_doctor_review") is True

    # Verify device linked in database
    db_screening = db_session.query(Screening).filter(Screening.record_id == rec_id).first()
    assert db_screening is not None
    assert db_screening.device_id == dev.id
    assert db_screening.review_status == "PENDING_REVIEW"

    # 4. Machine Hardware Push via X-Device-Key
    upload_file_2 = MockUploadFile(filename="machine_api_push.jpg", content=file_bytes)
    push_res = capture_device_screening(
        file=upload_file_2,
        patient_name="Hardware Push Patient",
        patient_age=54,
        patient_gender="Female",
        eye_side="Left Eye (OS)",
        diabetes_history="Type 2 Diabetes",
        symptoms=None,
        device_id=None,
        x_device_key=dev.device_api_key,
        current_user=None, # authenticating purely via X-Device-Key
        db=db_session
    )

    assert push_res is not None
    push_rec_id = push_res.get("record_id") or push_res.get("id")
    assert push_rec_id is not None
    push_screening = db_session.query(Screening).filter(Screening.record_id == push_rec_id).first()
    assert push_screening is not None
    assert push_screening.device_id == dev.id
    assert push_screening.review_status == "PENDING_REVIEW"

    # 5. Delete device
    del_res = delete_doctor_device(device_id=dev.id, current_user=doctor_user, db=db_session)
    assert del_res["status"] == "success"
    remaining = list_doctor_devices(current_user=doctor_user, db=db_session)
    assert not any(d.id == dev.id for d in remaining)


