import hmac
import hashlib
import secrets
import base64
import json
import time
from typing import Optional
from sqlalchemy.orm import Session
from app.models import User

# Secret key for HMAC token signing
AUTH_SECRET_KEY = b"netra-x-secret-auth-key-ps14-secure-token"

def hash_password(password: str) -> str:
    """Hashes password using PBKDF2-HMAC-SHA256 with a unique random salt."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), 100000)
    return f"{salt}:{key.hex()}"

def verify_password(password: str, hashed: str) -> bool:
    """Verifies a plain password against the stored salt:hash string."""
    try:
        if ":" not in hashed:
            return False
        salt, key_hex = hashed.split(":", 1)
        expected = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), 100000)
        return secrets.compare_digest(key_hex, expected.hex())
    except Exception:
        return False

def create_access_token(user_id: str, role: str, exp_seconds: int = 86400 * 7) -> str:
    """Generates an HMAC-SHA256 signed access token valid for 7 days."""
    payload = {
        "sub": user_id,
        "role": role,
        "iat": int(time.time()),
        "exp": int(time.time()) + exp_seconds
    }
    payload_json = json.dumps(payload, separators=(',', ':'))
    payload_b64 = base64.urlsafe_b64encode(payload_json.encode("utf-8")).decode("utf-8")
    sig = hmac.new(AUTH_SECRET_KEY, payload_b64.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{payload_b64}.{sig}"

def verify_access_token(token: str) -> Optional[dict]:
    """Verifies the HMAC signature and expiration timestamp of the token."""
    try:
        if not token or "." not in token:
            return None
        payload_b64, sig = token.split(".", 1)
        expected_sig = hmac.new(AUTH_SECRET_KEY, payload_b64.encode("utf-8"), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected_sig):
            return None
        payload = json.loads(base64.urlsafe_b64decode(payload_b64.encode("utf-8")).decode("utf-8"))
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except Exception:
        return None

def get_current_user_from_token(token: str, db: Session) -> Optional[User]:
    """Retrieves the User model instance corresponding to the verified token."""
    payload = verify_access_token(token)
    if not payload:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    return db.query(User).filter(User.id == user_id).first()

def seed_default_users(db: Session):
    """
    Ensures default benchmark demonstration accounts exist in the database:
    1. 'doctor' (Doctor role) - Dr. Rajesh Verma, MD (MCI-48921)
    2. 'user'   (User role)   - Aarav Sharma (Standard Screening User)
    """
    try:
        doctor_exists = db.query(User).filter((User.username == "doctor") | (User.email == "doctor@netrax.ai")).first()
        if not doctor_exists:
            default_doctor = User(
                username="doctor",
                email="doctor@netrax.ai",
                hashed_password=hash_password("doctor123"),
                full_name="Dr. Rajesh Verma, MD",
                role="Doctor",
                license_number="MCI-48921"
            )
            db.add(default_doctor)

        user_exists = db.query(User).filter((User.username == "user") | (User.email == "user@netrax.ai")).first()
        if not user_exists:
            default_user = User(
                username="user",
                email="user@netrax.ai",
                hashed_password=hash_password("user123"),
                full_name="Aarav Sharma",
                role="User",
                license_number=None
            )
            db.add(default_user)

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Notice: Default user seeding info: {e}")
