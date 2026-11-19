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
    DoctorStatsResponse
)
from app.api.routes_doctor_portal import (
    get_doctor_portal_stats,
    get_doctor_review_queue,
    submit_doctor_portal_review
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
