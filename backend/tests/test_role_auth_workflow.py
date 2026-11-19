import sys
from pathlib import Path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

import uuid
import pytest
from fastapi import HTTPException
from app.database import SessionLocal, init_db
from app.models import (
    User,
    Patient,
    Screening,
    UserRegisterRequest,
    UserLoginRequest,
    UserResponse,
    AuthResponse
)
from app.core.auth import (
    seed_default_users,
    hash_password,
    verify_password,
    create_access_token,
    verify_access_token,
    get_current_user_from_token,
    require_doctor
)
from app.api.routes_auth import (
    register,
    login,
    get_current_user_profile
)
from app.api.routes_screenings import (
    list_screenings,
    sign_off_screening
)
from app.schemas import ScreeningSignOffRequest


@pytest.fixture(scope="module")
def db_session():
    init_db()
    db = SessionLocal()
    seed_default_users(db)
    yield db
    db.close()


def test_auth_registration_and_login_flow(db_session):
    """
    Tests:
    1. POST /api/auth/register for both 'user' and 'doctor'
    2. POST /api/auth/login returns access_token, role, full_name
    3. GET /api/auth/me returns current user profile
    """
    uid = uuid.uuid4().hex[:6]
    user_email = f"asha_{uid}@healthcamp.org"
    doc_email = f"dr_{uid}@hospital.org"

    # 1. Register User (Patient / Health Worker)
    user_payload = UserRegisterRequest(
        full_name="Asha Worker Sangeeta",
        email=user_email,
        password="SecurePassword123!",
        role="user"
    )
    user_auth = register(user_payload, db=db_session)
    assert user_auth.access_token is not None
    assert user_auth.token is not None
    assert user_auth.role == "user"
    assert user_auth.full_name == "Asha Worker Sangeeta"
    assert user_auth.user.email == user_email

    # 2. Register Doctor (Clinician)
    doc_payload = UserRegisterRequest(
        full_name="Dr. Amit Roy, MS",
        email=doc_email,
        password="DocPassword123!",
        role="doctor",
        license_id=f"MCI-OPH-{uid.upper()}"
    )
    doc_auth = register(doc_payload, db=db_session)
    assert doc_auth.access_token is not None
    assert doc_auth.role == "doctor"
    assert doc_auth.full_name == "Dr. Amit Roy, MS"
    assert doc_auth.user.license_id == f"MCI-OPH-{uid.upper()}"

    # 3. Login as User
    login_user_req = UserLoginRequest(
        email=user_email,
        password="SecurePassword123!"
    )
    login_user_auth = login(login_user_req, db=db_session)
    assert login_user_auth.access_token is not None
    assert login_user_auth.role == "user"
    assert login_user_auth.full_name == "Asha Worker Sangeeta"

    # 4. Login as Doctor
    login_doc_req = UserLoginRequest(
        email=doc_email,
        password="DocPassword123!"
    )
    login_doc_auth = login(login_doc_req, db=db_session)
    assert login_doc_auth.access_token is not None
    assert login_doc_auth.role == "doctor"
    assert login_doc_auth.full_name == "Dr. Amit Roy, MS"

    # 5. Profile Check GET /api/auth/me
    user_profile = get_current_user_profile(
        authorization=f"Bearer {login_user_auth.access_token}",
        db=db_session
    )
    assert user_profile.email == user_email
    assert user_profile.role.lower() == "user"

    doc_profile = get_current_user_profile(
        authorization=f"Bearer {login_doc_auth.access_token}",
        db=db_session
    )
    assert doc_profile.email == doc_email
    assert doc_profile.role.lower() == "doctor"
    assert doc_profile.license_id == f"MCI-OPH-{uid.upper()}"


def test_doctor_review_sign_off_authorization(db_session):
    """
    Tests:
    - Standard 'user' role is blocked from doctor sign-off (HTTP 403 Forbidden)
    - Verified 'doctor' role can successfully sign-off (HTTP 200 OK)
    - require_doctor dependency enforces role check
    """
    # Create test patient and screening
    patient = Patient(name="Ramesh Patel", age=62, gender="Male")
    db_session.add(patient)
    db_session.commit()
    db_session.refresh(patient)

    test_record_id = f"test-rbac-{uuid.uuid4().hex[:8]}"
    screening = Screening(
        record_id=test_record_id,
        patient_id=patient.id,
        eye_side="Right Eye (OD)",
        icdr_grade=2,
        stage_label="Moderate NPDR",
        model_confidence=0.89,
        approval_status="MANUAL_REVIEW_REQUIRED",
        status="Pending Review"
    )
    db_session.add(screening)
    db_session.commit()
    db_session.refresh(screening)

    # Fetch seed user and seed doctor
    user_account = db_session.query(User).filter(User.username == "user").first()
    doctor_account = db_session.query(User).filter(User.username == "doctor").first()
    assert user_account is not None
    assert doctor_account is not None

    # 1. require_doctor dependency rejects user
    with pytest.raises(HTTPException) as exc_info:
        require_doctor(current_user=user_account)
    assert exc_info.value.status_code == 403
    assert "Access restricted to verified ophthalmologists/doctors" in exc_info.value.detail

    # 2. require_doctor accepts doctor
    validated_doc = require_doctor(current_user=doctor_account)
    assert validated_doc.role.lower() == "doctor"

    # 3. Doctor signs off screening
    sign_off_req = ScreeningSignOffRequest(
        clinician_notes="Verified Moderate NPDR. Laser photocoagulation advised."
    )
    res = sign_off_screening(
        record_id=test_record_id,
        sign_off=sign_off_req,
        current_user=doctor_account,
        db=db_session
    )
    assert res["status"] == "success"
    assert res["approval_status"] == "CLINICIAN_SIGNED_OFF"
    assert res["clinician_notes"] == "Verified Moderate NPDR. Laser photocoagulation advised."

    # Verify database persistence
    db_session.refresh(screening)
    assert screening.approval_status == "CLINICIAN_SIGNED_OFF"
    assert screening.reviewed_by_doctor_id == doctor_account.id


def test_screening_list_role_based_data_isolation(db_session):
    """
    Tests:
    - User only sees screenings uploaded by their account
    - Doctor sees all screenings
    """
    uid1 = uuid.uuid4().hex[:6]
    uid2 = uuid.uuid4().hex[:6]

    u1 = User(
        username=f"worker_{uid1}",
        email=f"worker_{uid1}@health.gov",
        hashed_password=hash_password("Pass123"),
        full_name="Camp Worker 1",
        role="User"
    )
    u2 = User(
        username=f"worker_{uid2}",
        email=f"worker_{uid2}@health.gov",
        hashed_password=hash_password("Pass123"),
        full_name="Camp Worker 2",
        role="User"
    )
    db_session.add_all([u1, u2])
    db_session.commit()
    db_session.refresh(u1)
    db_session.refresh(u2)

    p1 = Patient(name="Patient Worker 1", age=50, gender="Male")
    p2 = Patient(name="Patient Worker 2", age=52, gender="Female")
    db_session.add_all([p1, p2])
    db_session.commit()
    db_session.refresh(p1)
    db_session.refresh(p2)

    s1_uuid = f"rec-u1-{uuid.uuid4().hex[:8]}"
    s2_uuid = f"rec-u2-{uuid.uuid4().hex[:8]}"

    s1 = Screening(
        record_id=s1_uuid,
        patient_id=p1.id,
        uploaded_by_id=u1.id,
        eye_side="Right Eye (OD)",
        icdr_grade=1
    )
    s2 = Screening(
        record_id=s2_uuid,
        patient_id=p2.id,
        uploaded_by_id=u2.id,
        eye_side="Left Eye (OS)",
        icdr_grade=3
    )
    db_session.add_all([s1, s2])
    db_session.commit()

    # User 1 lists screenings
    res1 = list_screenings(current_user=u1, db=db_session)
    items1 = res1["items"]
    item_ids1 = [item["id"] for item in items1]
    assert s1_uuid in item_ids1
    assert s2_uuid not in item_ids1  # Worker 1 cannot see Worker 2's uploads

    # User 2 lists screenings
    res2 = list_screenings(current_user=u2, db=db_session)
    items2 = res2["items"]
    item_ids2 = [item["id"] for item in items2]
    assert s2_uuid in item_ids2
    assert s1_uuid not in item_ids2  # Worker 2 cannot see Worker 1's uploads

    # Doctor lists screenings
    doctor_account = db_session.query(User).filter(User.username == "doctor").first()
    res_doc = list_screenings(current_user=doctor_account, db=db_session)
    doc_items = res_doc["items"]
    doc_item_ids = [item["id"] for item in doc_items]
    assert s1_uuid in doc_item_ids
    assert s2_uuid in doc_item_ids
