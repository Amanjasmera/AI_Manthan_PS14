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
    UserRegisterRequest,
    UserLoginRequest,
    UserProfileUpdateRequest,
    DoctorReviewCreate
)
from app.core.auth import (
    hash_password,
    verify_password,
    create_access_token,
    verify_access_token,
    get_current_user_from_token,
    seed_default_users
)
from app.api.routes_auth import register, login, get_current_user_profile, get_roles, switch_demo_role, update_user_profile
from app.api.routes_doctor import submit_doctor_review


@pytest.fixture(scope="module")
def db_session():
    init_db()
    db = SessionLocal()
    seed_default_users(db)
    yield db
    db.close()


def test_password_hashing():
    raw_pass = "SecureRetina#2026"
    hashed = hash_password(raw_pass)
    assert hashed != raw_pass
    assert verify_password(raw_pass, hashed) is True
    assert verify_password("wrong_password", hashed) is False


def test_roles_listing():
    roles = get_roles()
    role_names = [r["role"] for r in roles]
    assert "User" in role_names
    assert "Doctor" in role_names
    user_item = next(r for r in roles if r["role"] == "User")
    doc_item = next(r for r in roles if r["role"] == "Doctor")
    assert user_item["can_review"] is False
    assert doc_item["can_review"] is True


def test_seed_default_users(db_session):
    doctor = db_session.query(User).filter(User.username == "doctor").first()
    assert doctor is not None
    assert doctor.role == "Doctor"
    assert verify_password("doctor123", doctor.hashed_password) is True

    user = db_session.query(User).filter(User.username == "user").first()
    assert user is not None
    assert user.role == "User"
    assert verify_password("user123", user.hashed_password) is True


def test_login_doctor(db_session):
    req = UserLoginRequest(username="doctor", password="doctor123")
    res = login(req, db=db_session)
    assert res.user.role == "Doctor"
    assert res.user.username == "doctor"
    assert res.token is not None

    # Verify token payload
    payload = verify_access_token(res.token)
    assert payload is not None
    assert payload["role"] == "Doctor"


def test_login_user(db_session):
    req = UserLoginRequest(username="user", password="user123")
    res = login(req, db=db_session)
    assert res.user.role == "User"
    assert res.user.username == "user"
    assert res.token is not None

    payload = verify_access_token(res.token)
    assert payload is not None
    assert payload["role"] == "User"


def test_login_invalid_password(db_session):
    req = UserLoginRequest(username="doctor", password="incorrectpassword")
    with pytest.raises(HTTPException) as exc_info:
        login(req, db=db_session)
    assert exc_info.value.status_code == 401


def test_register_new_user_and_doctor(db_session):
    uid = uuid.uuid4().hex[:6]
    user_req = UserRegisterRequest(
        username=f"patient_{uid}",
        email=f"patient_{uid}@retina.org",
        password="patientPass123",
        full_name="Priya Patel",
        role="User"
    )
    user_res = register(user_req, db=db_session)
    assert user_res.user.role == "User"
    assert user_res.user.username == f"patient_{uid}"

    doc_req = UserRegisterRequest(
        username=f"dr_{uid}",
        email=f"dr_{uid}@hospital.org",
        password="drPassword123",
        full_name="Dr. Vikram Rao",
        role="Doctor",
        license_number=f"MCI-{uid}"
    )
    doc_res = register(doc_req, db=db_session)
    assert doc_res.user.role == "Doctor"
    assert doc_res.user.license_number == f"MCI-{uid}"


def test_get_current_user_profile(db_session):
    login_res = login(UserLoginRequest(username="doctor", password="doctor123"), db=db_session)
    token = login_res.token

    profile = get_current_user_profile(authorization=f"Bearer {token}", db=db_session)
    assert profile.username == "doctor"
    assert profile.role == "Doctor"


def test_doctor_review_rbac_enforcement(db_session):
    # 1. User token should be rejected with 403 Forbidden
    user_login = login(UserLoginRequest(username="user", password="user123"), db=db_session)
    user_token = user_login.token

    rev_req = DoctorReviewCreate(
        doctor_name="Standard User",
        confirmed_grade=2,
        referral_recommendation="Refer to retina specialist"
    )

    with pytest.raises(HTTPException) as exc_info:
        submit_doctor_review(
            screening_id="nonexistent_id",
            review_data=rev_req,
            authorization=f"Bearer {user_token}",
            db=db_session
        )
    assert exc_info.value.status_code == 403
    assert "Doctor privileges required" in exc_info.value.detail


def test_login_category_selection(db_session):
    # Logging in as Doctor category with doctor credentials should succeed
    res = login(UserLoginRequest(username="doctor", password="doctor123", role="Doctor"), db=db_session)
    assert res.user.role == "Doctor"

    # Logging in as Doctor category with standard user credentials should be rejected
    with pytest.raises(HTTPException) as exc_info:
        login(UserLoginRequest(username="user", password="user123", role="Doctor"), db=db_session)
    assert exc_info.value.status_code == 400
    assert "Category mismatch" in exc_info.value.detail

    # Logging in as User category with user credentials should succeed
    res_user = login(UserLoginRequest(username="user", password="user123", role="User"), db=db_session)
    assert res_user.user.role == "User"


def test_update_user_profile_in_database(db_session):
    # 1. Register a test user
    uid = uuid.uuid4().hex[:6]
    user_req = UserRegisterRequest(
        username=f"upd_{uid}",
        email=f"upd_{uid}@hospital.org",
        password="oldPassword123",
        full_name="Initial Name",
        role="Doctor",
        license_number="MCI-OLD"
    )
    reg_res = register(user_req, db=db_session)
    token = reg_res.token

    # 2. Update profile (name, license, and change password)
    upd_req = UserProfileUpdateRequest(
        full_name="Dr. Updated Name, MD",
        license_number="MCI-NEW-9999",
        current_password="oldPassword123",
        new_password="newPassword456"
    )
    upd_res = update_user_profile(upd_req, authorization=f"Bearer {token}", db=db_session)
    assert upd_res.user.full_name == "Dr. Updated Name, MD"
    assert upd_res.user.license_number == "MCI-NEW-9999"

    # 3. Verify database persistence
    db_user = db_session.query(User).filter(User.username == f"upd_{uid}").first()
    assert db_user.full_name == "Dr. Updated Name, MD"
    assert db_user.license_number == "MCI-NEW-9999"
    assert verify_password("newPassword456", db_user.hashed_password) is True

    # 4. Password update fails if current password is wrong
    with pytest.raises(HTTPException) as exc_info:
        update_user_profile(
            UserProfileUpdateRequest(
                current_password="wrongOldPassword",
                new_password="anotherPassword"
            ),
            authorization=f"Bearer {upd_res.token}",
            db=db_session
        )
    assert exc_info.value.status_code == 400
    assert "Current password is incorrect" in exc_info.value.detail

