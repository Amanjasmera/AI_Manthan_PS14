import os
import time
import base64
import json
import hmac
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional, Union, Dict, Any

import bcrypt
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, Header, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import or_, cast, String as SqlString

from app.database import get_db
from app.models import User

# Configuration & Secrets
SECRET_KEY = os.environ.get("SECRET_KEY", "netra_x_clinical_production_secret_key_2026_super_secure")
ALGORITHM = os.environ.get("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 Days

# HTTP Bearer security scheme for OpenAPI documentation
security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """Hashes plain password using standard bcrypt."""
    pw_bytes = password.encode("utf-8")[:72]
    return bcrypt.hashpw(pw_bytes, bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    """
    Verifies a plain password against the stored hash.
    Supports standard bcrypt hashes as well as legacy PBKDF2 fallback hashes.
    """
    if not password or not hashed:
        return False
    try:
        # Standard bcrypt check
        if hashed.startswith("$2b$") or hashed.startswith("$2a$") or hashed.startswith("$2y$"):
            pw_bytes = password.encode("utf-8")[:72]
            return bcrypt.checkpw(pw_bytes, hashed.encode("utf-8"))
        
        # Legacy PBKDF2 salt:hash format
        if ":" in hashed:
            salt, key_hex = hashed.split(":", 1)
            expected = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), 100000)
            return secrets.compare_digest(key_hex, expected.hex())
            
        return False
    except Exception:
        return False


def create_access_token(
    user_id: Optional[Union[str, int]] = None,
    role: Optional[str] = None,
    data: Optional[Dict[str, Any]] = None,
    expires_delta: Optional[timedelta] = None,
    exp_seconds: Optional[int] = None,
    **kwargs
) -> str:
    """
    Generates a signed JWT access token containing subject (user_id) and role.
    Accepts kwargs for compatibility with both positional and dict calls.
    """
    to_encode: Dict[str, Any] = {}
    if data:
        to_encode.update(data)
        
    sub_val = user_id or kwargs.get("sub") or to_encode.get("sub")
    if sub_val is not None:
        to_encode["sub"] = str(sub_val)

    role_val = role or kwargs.get("role") or to_encode.get("role")
    if role_val:
        to_encode["role"] = str(role_val)

    # Expiration calculation
    now = datetime.utcnow()
    if expires_delta:
        expire = now + expires_delta
    elif exp_seconds:
        expire = now + timedelta(seconds=exp_seconds)
    else:
        expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({
        "exp": expire,
        "iat": now
    })

    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_access_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verifies and decodes a JWT access token.
    Falls back to legacy HMAC verification if token was signed with prior key.
    """
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        # Fallback check for legacy HMAC tokens
        try:
            if "." in token:
                payload_b64, sig = token.split(".", 1)
                legacy_secret = b"netra-x-secret-auth-key-ps14-secure-token"
                expected_sig = hmac.new(legacy_secret, payload_b64.encode("utf-8"), hashlib.sha256).hexdigest()
                if hmac.compare_digest(sig, expected_sig):
                    payload = json.loads(base64.urlsafe_b64decode(payload_b64.encode("utf-8")).decode("utf-8"))
                    if payload.get("exp", 0) >= time.time():
                        return payload
        except Exception:
            pass
        return None


def get_current_user_from_token(token: str, db: Session) -> Optional[User]:
    """Retrieves the User model instance corresponding to the verified token."""
    payload = verify_access_token(token)
    if not payload:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None

    # Query by Integer id, string id, username, or email
    user = db.query(User).filter(
        or_(
            User.id == int(user_id) if str(user_id).isdigit() else False,
            cast(User.id, SqlString) == str(user_id),
            User.username == str(user_id),
            User.email == str(user_id)
        )
    ).first()
    return user


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> User:
    """
    FastAPI dependency that enforces authentication and returns the current User.
    Raises HTTP 401 if token is missing or invalid.
    """
    token = None
    if credentials:
        token = credentials.credentials
    elif authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ", 1)[1].strip()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required: Missing or invalid Authorization header.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = get_current_user_from_token(token, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid token. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    FastAPI dependency that extracts the current User if a token is present,
    or returns None without raising an error (for public/guest and test access).
    """
    token = None
    if credentials:
        token = credentials.credentials
    elif authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ", 1)[1].strip()

    if not token:
        return None

    try:
        return get_current_user_from_token(token, db)
    except Exception:
        return None


def require_doctor(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    FastAPI dependency requiring 'doctor' role for clinical sign-off and review.
    Raises HTTP 403 Forbidden if user is not a verified clinician.
    """
    if not current_user or current_user.role.lower() != "doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to verified ophthalmologists/doctors."
        )
    return current_user


def seed_default_users(db: Session):
    """
    Ensures default benchmark demonstration accounts exist in the database:
    1. 'doctor@netrax.ai' (Doctor role) - Dr. Rajesh Verma, MD (MCI-48921)
    2. 'user@netrax.ai'   (User role)   - Aarav Sharma (Standard Screening User)
    """
    try:
        doctor_exists = db.query(User).filter(
            (User.username == "doctor") | (User.email == "doctor@netrax.ai")
        ).first()
        if not doctor_exists:
            default_doctor = User(
                username="doctor",
                email="doctor@netrax.ai",
                hashed_password=hash_password("doctor123"),
                full_name="Dr. Rajesh Verma, MD",
                role="Doctor",
                license_id="MCI-48921",
                license_number="MCI-48921",
                is_verified=True
            )
            db.add(default_doctor)

        user_exists = db.query(User).filter(
            (User.username == "user") | (User.email == "user@netrax.ai")
        ).first()
        if not user_exists:
            default_user = User(
                username="user",
                email="user@netrax.ai",
                hashed_password=hash_password("user123"),
                full_name="Aarav Sharma",
                role="User",
                license_id=None,
                license_number=None,
                is_verified=True
            )
            db.add(default_user)

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Notice: Default user seeding info: {e}")
