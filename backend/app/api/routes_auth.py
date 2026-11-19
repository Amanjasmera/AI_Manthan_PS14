import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models import (
    User,
    UserRegisterRequest,
    UserLoginRequest,
    UserProfileUpdateRequest,
    UserResponse,
    AuthResponse
)
from app.core.auth import (
    hash_password,
    verify_password,
    create_access_token,
    verify_access_token,
    get_current_user_from_token,
    get_current_user,
    seed_default_users
)

router = APIRouter(prefix="/auth", tags=["Authentication & RBAC"])


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register New User or Doctor Account"
)
def register(req: UserRegisterRequest, db: Session = Depends(get_db)):
    """
    Registers a new user in PostgreSQL / SQLite and assigns their RBAC role:
    - 'user': Patient / Rural Health Camp Worker (Standard screening intake, history, and simple view)
    - 'doctor': Clinician / Ophthalmologist (Full clinical report, audit queue, override, and sign-off)
    """
    raw_role = (req.role or "user").strip()
    if raw_role.lower() not in ["user", "doctor"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role selected. Allowed roles are strictly 'user' or 'doctor'."
        )

    role_db = "Doctor" if raw_role.lower() == "doctor" else "User"
    effective_username = req.username.strip() if req.username else req.email.strip().lower().split("@")[0]
    effective_email = req.email.strip().lower()

    # Check for existing username or email
    existing_user = db.query(User).filter(
        or_(
            User.username == effective_username,
            User.email == effective_email
        )
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email address is already registered."
        )

    license_val = req.license_id or req.license_number
    new_user = User(
        username=effective_username,
        email=effective_email,
        hashed_password=hash_password(req.password),
        full_name=req.full_name.strip(),
        role=role_db,
        license_id=license_val.strip() if license_val else None,
        license_number=license_val.strip() if license_val else None,
        is_verified=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(user_id=new_user.id, role=new_user.role)
    user_resp = UserResponse.from_orm(new_user)

    return AuthResponse(
        access_token=token,
        token=token,
        token_type="bearer",
        role=new_user.role.lower(),
        full_name=new_user.full_name,
        user=user_resp
    )


@router.post(
    "/login",
    response_model=AuthResponse,
    status_code=status.HTTP_200_OK,
    summary="User / Doctor Authentication & JWT Token Issue"
)
def login(req: UserLoginRequest, db: Session = Depends(get_db)):
    """
    Authenticates a user by email or username.
    Returns JWT access_token, role, and full_name for role-based access control.
    """
    # Ensure default accounts exist if database is fresh
    seed_default_users(db)

    identifier = (req.email or req.username or "").strip()
    if not identifier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email or username is required."
        )

    user = db.query(User).filter(
        or_(
            User.username == identifier,
            User.email == identifier.lower()
        )
    ).first()

    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password. Please check your credentials."
        )

    # Validate category/role match if a specific portal role was requested
    if req.role:
        expected_role = req.role.strip().lower()
        if user.role.lower() != expected_role:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category mismatch: This account is registered as '{user.role}', but you selected '{req.role}'. Please select '{user.role}' category to log in."
            )

    token = create_access_token(user_id=user.id, role=user.role)
    user_resp = UserResponse.from_orm(user)

    return AuthResponse(
        access_token=token,
        token=token,
        token_type="bearer",
        role=user.role.lower(),
        full_name=user.full_name,
        user=user_resp
    )


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Authenticated User Profile & Role"
)
def get_current_user_profile(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Retrieves the authenticated user's profile and verified role from their Bearer token.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header."
        )

    token = authorization.split("Bearer ", 1)[1].strip()
    user = get_current_user_from_token(token, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid token. Please log in again."
        )

    return UserResponse.from_orm(user)


@router.put(
    "/profile",
    response_model=AuthResponse,
    status_code=status.HTTP_200_OK,
    summary="Update User / Doctor Profile in Database"
)
def update_user_profile(
    req: UserProfileUpdateRequest,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Updates the authenticated user's personal details, role, or password.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required: Missing or invalid Authorization header."
        )

    token = authorization.split("Bearer ", 1)[1].strip()
    user = get_current_user_from_token(token, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid token. Please log in again."
        )

    # 1. Update Full Name
    if req.full_name is not None and req.full_name.strip():
        user.full_name = req.full_name.strip()

    # 2. Update Email (ensure not taken by another user)
    if req.email is not None and req.email.strip():
        new_email = req.email.strip().lower()
        if new_email != user.email:
            existing = db.query(User).filter(User.email == new_email, User.id != user.id).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This email address is already registered to another account."
                )
            user.email = new_email

    # 3. Update Category / Role
    if req.role is not None and req.role.strip():
        new_role = req.role.strip()
        if new_role.lower() not in ["user", "doctor"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid role selected. Allowed roles are strictly 'user' or 'doctor'."
            )
        user.role = "Doctor" if new_role.lower() == "doctor" else "User"

    # 4. Update Medical License
    license_val = req.license_id or req.license_number
    if license_val is not None:
        user.license_id = license_val.strip() if license_val.strip() else None
        user.license_number = license_val.strip() if license_val.strip() else None

    # 5. Update Password
    if req.new_password is not None and req.new_password.strip():
        if not req.current_password or not verify_password(req.current_password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect. Please verify your current password to set a new one."
            )
        user.hashed_password = hash_password(req.new_password.strip())

    db.commit()
    db.refresh(user)

    # Generate updated token with the latest role
    new_token = create_access_token(user_id=user.id, role=user.role)
    user_resp = UserResponse.from_orm(user)
    return AuthResponse(
        access_token=new_token,
        token=new_token,
        token_type="bearer",
        role=user.role.lower(),
        full_name=user.full_name,
        user=user_resp
    )


@router.get(
    "/roles",
    summary="List Supported RBAC Roles"
)
def get_roles():
    """Returns supported clinical platform roles and privileges."""
    return [
        {
            "role": "User",
            "name": "Standard User / Patient",
            "description": "Access Diagnostic Studio, Screening Registry, and AI explanations. Doctor Review queue is locked.",
            "can_review": False
        },
        {
            "role": "Doctor",
            "name": "Ophthalmologist / Clinician",
            "description": "Full access to Diagnostic Studio, Registry, Doctor Review queue, grade overrides & active learning sign-offs.",
            "can_review": True
        }
    ]


@router.post(
    "/demo-switch",
    response_model=AuthResponse,
    summary="1-Click Demo Role Switcher"
)
def switch_demo_role(
    role: str = "Doctor",
    db: Session = Depends(get_db)
):
    """
    Fast convenience endpoint to switch between demo 'Doctor' and 'User' accounts
    for immediate interactive platform evaluation.
    """
    seed_default_users(db)
    target_username = "doctor" if role.lower() == "doctor" else "user"
    user = db.query(User).filter(User.username == target_username).first()
    if not user:
        raise HTTPException(status_code=404, detail="Demo account not found.")

    token = create_access_token(user_id=user.id, role=user.role)
    user_resp = UserResponse.from_orm(user)
    return AuthResponse(
        access_token=token,
        token=token,
        token_type="bearer",
        role=user.role.lower(),
        full_name=user.full_name,
        user=user_resp
    )
