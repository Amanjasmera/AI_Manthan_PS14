import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session

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
    Registers a new user in the SQLite database and assigns their clinical RBAC role:
    - 'User': Standard screening intake, history, and AI diagnostic results.
    - 'Doctor': Full access including Doctor Review queue, override, and clinical sign-off.
    """
    # Normalize role
    normalized_role = req.role.strip().capitalize()
    if normalized_role not in ["User", "Doctor"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role selected. Allowed roles are strictly 'User' or 'Doctor'."
        )

    # Check for existing username or email
    existing_user = db.query(User).filter(
        (User.username == req.username.strip()) | (User.email == req.email.strip().lower())
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email address is already registered."
        )

    # Create user
    new_user = User(
        username=req.username.strip(),
        email=req.email.strip().lower(),
        hashed_password=hash_password(req.password),
        full_name=req.full_name.strip(),
        role=normalized_role,
        license_number=req.license_number.strip() if req.license_number else None
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(user_id=new_user.id, role=new_user.role)
    return AuthResponse(token=token, user=UserResponse.from_orm(new_user))


@router.post(
    "/login",
    response_model=AuthResponse,
    status_code=status.HTTP_200_OK,
    summary="Database User Authentication & Token Issue"
)
def login(req: UserLoginRequest, db: Session = Depends(get_db)):
    """
    Authenticates a user against the SQLite database by username or email.
    Returns access token and user role ('User' or 'Doctor') for RBAC authorization.
    """
    # Ensure default accounts exist if empty
    seed_default_users(db)

    identifier = req.username.strip()
    user = db.query(User).filter(
        (User.username == identifier) | (User.email == identifier.lower())
    ).first()

    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password. Please check your credentials."
        )

    # Validate category/role match if a specific portal role was requested
    if req.role:
        expected_role = req.role.strip().capitalize()
        if user.role != expected_role:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category mismatch: This account is registered as '{user.role}', but you selected '{expected_role}'. Please select '{user.role}' category to log in."
            )

    token = create_access_token(user_id=user.id, role=user.role)
    return AuthResponse(token=token, user=UserResponse.from_orm(user))


@router.put(
    "/profile",
    response_model=AuthResponse,
    status_code=status.HTTP_200_OK,
    summary="Update User / Doctor Profile Directly in SQLite Database"
)
def update_user_profile(
    req: UserProfileUpdateRequest,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Updates the authenticated user's or doctor's personal and login information
    directly in the SQLite database:
    - Full Name
    - Email Address (with uniqueness check)
    - Role / Category ('User' or 'Doctor')
    - Medical License Number (for Doctor role)
    - Password (requires current password verification)
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
        new_role = req.role.strip().capitalize()
        if new_role not in ["User", "Doctor"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid role selected. Allowed roles are strictly 'User' or 'Doctor'."
            )
        user.role = new_role

    # 4. Update Medical License
    if req.license_number is not None:
        user.license_number = req.license_number.strip() if req.license_number.strip() else None

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
    return AuthResponse(token=new_token, user=UserResponse.from_orm(user))


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Authenticated User Profile & RBAC Role"
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
    return AuthResponse(token=token, user=UserResponse.from_orm(user))
