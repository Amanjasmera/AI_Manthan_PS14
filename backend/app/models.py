import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List, Union
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from pydantic import BaseModel, Field

from app.database import Base

# =====================================================================
# SQLALCHEMY ORM PRODUCTION-READY SCHEMAS (AI Manthan 2.0 - PS14)
# =====================================================================

class Patient(Base):
    """
    1. patients table (Production PostgreSQL Schema):
       id (Integer PK), name (Index), age, gender, diabetes_history, symptoms, created_at.
    """
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(120), nullable=False, index=True)
    age = Column(Integer, nullable=False)
    gender = Column(String(20), nullable=False)
    diabetes_history = Column(String(255), default="Type 2 Diabetes")
    symptoms = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, index=True)

    # Legacy compatibility column
    full_name = Column(String(120), nullable=True, index=True)

    # Relationships
    screenings = relationship("Screening", back_populates="patient", cascade="all, delete-orphan")

    def __init__(self, **kwargs):
        if "full_name" in kwargs and "name" not in kwargs:
            kwargs["name"] = kwargs["full_name"]
        elif "name" in kwargs and "full_name" not in kwargs:
            kwargs["full_name"] = kwargs["name"]
        super().__init__(**kwargs)


class Screening(Base):
    """
    2. screenings table (Production PostgreSQL Schema):
       id (Integer PK), record_id (UUID Unique Index), patient_id (Integer FK -> patients.id),
       eye_side, icdr_grade (0-4), stage_label, model_confidence,
       entropy, epistemic_uncertainty, aleatoric_uncertainty,
       hard_exudates, soft_exudates, approval_status, clinician_notes,
       raw_image_url, heatmap_image_url, created_at.
    """
    __tablename__ = "screenings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    record_id = Column(String(64), unique=True, index=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    eye_side = Column(String(50), nullable=False, default="Right Eye (OD)")
    icdr_grade = Column(Integer, nullable=False, default=0, index=True)
    stage_label = Column(String(80), nullable=False, default="No DR")
    model_confidence = Column(Float, nullable=False, default=0.0)
    entropy = Column(Float, default=0.0)
    epistemic_uncertainty = Column(Float, default=0.0)
    aleatoric_uncertainty = Column(Float, default=0.0)
    hard_exudates = Column(Integer, default=0)
    soft_exudates = Column(Integer, default=0)
    approval_status = Column(String(50), default="AUTO_APPROVED", index=True)
    clinician_notes = Column(Text, nullable=True)
    raw_image_url = Column(String(500), nullable=True)
    heatmap_image_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, index=True)

    # RBAC Audit Links
    uploaded_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    reviewed_by_doctor_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    # Legacy pipeline & audit columns
    raw_image_path = Column(String(500), nullable=True)
    preprocessed_image_path = Column(String(500), nullable=True)
    iqa_passed = Column(Boolean, default=False, index=True)
    blur_score = Column(Float, default=0.0)
    illumination_score = Column(Float, default=0.0)
    contrast_score = Column(Float, default=0.0)
    fov_score = Column(Float, default=0.0)
    iqa_error_codes = Column(JSON, default=list)
    iqa_feedback = Column(String(500), default="")
    recapture_instructions = Column(String(500), default="")
    predicted_grade = Column(Integer, nullable=True, index=True)
    grade_name = Column(String(80), nullable=True)
    confidence = Column(Float, nullable=True)
    uncertainty_score = Column(Float, default=0.0)
    requires_manual_doctor_review = Column(Boolean, default=False, index=True)
    referral_urgency = Column(String(50), default="ROUTINE", index=True)
    status = Column(String(50), default="ANALYZED", index=True)
    doctor_notes = Column(Text, nullable=True)
    billing_status = Column(String(100), default="₹25 Valid Scan")
    billing_amount = Column(Float, default=25.0)
    systemic_risk = Column(String(120), default="Low Systemic Risk")
    next_screening_interval = Column(String(120), default="12 Months")

    # Relationships
    patient = relationship("Patient", back_populates="screenings")
    prediction = relationship(
        "Prediction",
        uselist=False,
        back_populates="screening",
        cascade="all, delete-orphan",
        primaryjoin="Screening.record_id == Prediction.screening_id",
        foreign_keys="[Prediction.screening_id]"
    )
    lesion = relationship(
        "Lesion",
        uselist=False,
        back_populates="screening",
        cascade="all, delete-orphan",
        primaryjoin="Screening.record_id == Lesion.screening_id",
        foreign_keys="[Lesion.screening_id]"
    )
    doctor_review = relationship(
        "DoctorReview",
        uselist=False,
        back_populates="screening",
        cascade="all, delete-orphan",
        primaryjoin="Screening.record_id == DoctorReview.screening_id",
        foreign_keys="[DoctorReview.screening_id]"
    )
    active_learning_logs = relationship(
        "ActiveLearningLog",
        back_populates="screening",
        cascade="all, delete-orphan",
        primaryjoin="Screening.record_id == ActiveLearningLog.screening_id",
        foreign_keys="[ActiveLearningLog.screening_id]"
    )
    audit_logs = relationship(
        "AuditLog",
        back_populates="screening",
        cascade="all, delete-orphan",
        primaryjoin="Screening.record_id == AuditLog.screening_id",
        foreign_keys="[AuditLog.screening_id]"
    )
    uploaded_by = relationship("User", foreign_keys=[uploaded_by_id], back_populates="uploaded_screenings")
    reviewed_by_doctor = relationship("User", foreign_keys=[reviewed_by_doctor_id], back_populates="reviewed_screenings")

    def __init__(self, **kwargs):
        # Allow legacy code passing string id to set record_id
        if "record_id" not in kwargs:
            if "id" in kwargs and isinstance(kwargs["id"], str):
                kwargs["record_id"] = kwargs.pop("id")
            else:
                kwargs["record_id"] = str(uuid.uuid4())
        elif "id" in kwargs and isinstance(kwargs["id"], str):
            kwargs["record_id"] = kwargs.pop("id")

        if "icdr_grade" in kwargs and "predicted_grade" not in kwargs:
            kwargs["predicted_grade"] = kwargs["icdr_grade"]
        elif "predicted_grade" in kwargs and "icdr_grade" not in kwargs:
            kwargs["icdr_grade"] = kwargs["predicted_grade"]

        if "stage_label" in kwargs and "grade_name" not in kwargs:
            kwargs["grade_name"] = kwargs["stage_label"]
        elif "grade_name" in kwargs and "stage_label" not in kwargs:
            kwargs["stage_label"] = kwargs["grade_name"]

        if "model_confidence" in kwargs and "confidence" not in kwargs:
            kwargs["confidence"] = kwargs["model_confidence"]
        elif "confidence" in kwargs and "model_confidence" not in kwargs:
            kwargs["model_confidence"] = kwargs["confidence"]

        if "entropy" in kwargs and "uncertainty_score" not in kwargs:
            kwargs["uncertainty_score"] = kwargs["entropy"]
        elif "uncertainty_score" in kwargs and "entropy" not in kwargs:
            kwargs["entropy"] = kwargs["uncertainty_score"]

        if "clinician_notes" in kwargs and "doctor_notes" not in kwargs:
            kwargs["doctor_notes"] = kwargs["clinician_notes"]
        elif "doctor_notes" in kwargs and "clinician_notes" not in kwargs:
            kwargs["clinician_notes"] = kwargs["doctor_notes"]

        if "approval_status" not in kwargs:
            if kwargs.get("requires_manual_doctor_review"):
                kwargs["approval_status"] = "MANUAL_REVIEW_REQUIRED"
            elif kwargs.get("status") == "Doctor Verified":
                kwargs["approval_status"] = "CLINICIAN_SIGNED_OFF"
            else:
                kwargs["approval_status"] = "AUTO_APPROVED"

        super().__init__(**kwargs)

    @property
    def lesion_summary(self):
        """Backward compatibility alias for lesion relationship."""
        return self.lesion


class Lesion(Base):
    """
    3. lesions table:
       screening_id, microaneurysm_count, hemorrhage_count,
       hard_exudate_count, soft_exudate_count, mask_url.
    """
    __tablename__ = "lesions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    screening_id = Column(String(64), ForeignKey("screenings.record_id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    microaneurysm_count = Column(Integer, default=0)
    hemorrhage_count = Column(Integer, default=0)
    hard_exudate_count = Column(Integer, default=0)
    soft_exudate_count = Column(Integer, default=0)
    mask_url = Column(String(500), nullable=True)

    # Internal pipeline metadata
    mask_path = Column(String(500), nullable=True)
    classification_note = Column(String(255), default="Suspected lesion candidates")
    method = Column(String(80), default="OPENCV_MORPHOLOGICAL_FALLBACK")
    is_verified_model = Column(Boolean, default=False)

    screening = relationship(
        "Screening",
        back_populates="lesion",
        primaryjoin="Screening.record_id == Lesion.screening_id",
        foreign_keys="[Lesion.screening_id]"
    )


# Alias for backwards compatibility
LesionSummary = Lesion


class DoctorReview(Base):
    """
    4. doctor_reviews table:
       screening_id, doctor_name, doctor_license, confirmed_grade,
       was_overridden, referral_recommendation, clinical_notes, reviewed_at.
    """
    __tablename__ = "doctor_reviews"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    screening_id = Column(String(64), ForeignKey("screenings.record_id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    doctor_name = Column(String(120), nullable=False)
    doctor_license = Column(String(60), default="MCI-REG-AI")
    confirmed_grade = Column(Integer, nullable=False)
    was_overridden = Column(Boolean, default=False)
    referral_recommendation = Column(String(255), default="Specialist ophthalmologist consultation")
    clinical_notes = Column(Text, default="")
    reviewed_at = Column(DateTime, default=datetime.utcnow)

    screening = relationship(
        "Screening",
        back_populates="doctor_review",
        primaryjoin="Screening.record_id == DoctorReview.screening_id",
        foreign_keys="[DoctorReview.screening_id]"
    )


class ActiveLearningLog(Base):
    """
    5. active_learning_logs table:
       screening_id, verified_label, dataset_tag ("Indore_Hub_Active_v1.1"), updated_at
       Stores clinician-verified samples for continual PyTorch fine-tuning and domain adaptation.
    """
    __tablename__ = "active_learning_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    screening_id = Column(String(64), ForeignKey("screenings.record_id", ondelete="CASCADE"), nullable=False, index=True)
    verified_label = Column(Integer, nullable=False)
    dataset_tag = Column(String(100), default="Indore_Hub_Active_v1.1", nullable=False)
    ai_predicted_grade = Column(Integer, nullable=True)
    was_overridden = Column(Boolean, default=False)
    doctor_name = Column(String(120), nullable=True)
    clinical_notes = Column(Text, default="")
    uncertainty_score = Column(Float, default=0.0)
    image_path = Column(String(500), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, index=True)

    screening = relationship(
        "Screening",
        back_populates="active_learning_logs",
        primaryjoin="Screening.record_id == ActiveLearningLog.screening_id",
        foreign_keys="[ActiveLearningLog.screening_id]"
    )


class Prediction(Base):
    """
    Deep Learning Model Prediction details & probability distribution.
    """
    __tablename__ = "predictions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    screening_id = Column(String(64), ForeignKey("screenings.record_id", ondelete="CASCADE"), nullable=False, unique=True)
    predicted_grade = Column(Integer, nullable=False, index=True)  # 0 to 4
    grade_name = Column(String(80), nullable=False)
    confidence = Column(Float, nullable=False)
    class_probabilities = Column(JSON, nullable=False)  # Dict[str, float]
    entropy = Column(Float, default=0.0)
    uncertainty_score = Column(Float, default=0.0)
    requires_manual_doctor_review = Column(Boolean, default=False)
    epistemic_uncertainty = Column(Float, default=0.0)
    aleatoric_uncertainty = Column(Float, default=0.0)
    confidence_interval = Column(JSON, nullable=True)
    inference_time_ms = Column(Float, default=0.0)
    temperature = Column(Float, default=1.0)
    gradcam_path = Column(String(500), nullable=True)
    model_status = Column(String(80), default="VERIFIED_TRAINED_CHECKPOINT")
    model_provenance = Column(String(200), default="EfficientNet-B0 (APTOS 2019 Checkpoint)")
    is_verified_checkpoint = Column(Boolean, default=True)

    screening = relationship(
        "Screening",
        back_populates="prediction",
        primaryjoin="Screening.record_id == Prediction.screening_id",
        foreign_keys="[Prediction.screening_id]"
    )


class AuditLog(Base):
    """
    Audit log for traceability and clinical regulatory governance.
    """
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    screening_id = Column(String(64), ForeignKey("screenings.record_id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(50), nullable=False)
    details = Column(String(500), default="")
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    screening = relationship(
        "Screening",
        back_populates="audit_logs",
        primaryjoin="Screening.record_id == AuditLog.screening_id",
        foreign_keys="[AuditLog.screening_id]"
    )


# =====================================================================
# PYDANTIC DATA TRANSFER OBJECTS (SCHEMAS)
# =====================================================================

class PatientCreate(BaseModel):
    full_name: str
    age: int
    gender: str
    diabetes_history: Optional[str] = "Type 2 Diabetes"

class PatientResponse(PatientCreate):
    id: str
    created_at: datetime
    class Config:
        from_attributes = True

class IqaResult(BaseModel):
    passed: bool
    error_codes: List[str] = []
    blur_score: float
    illumination_score: float
    contrast_score: float
    fov_score: float = 0.0
    feedback: str
    recapture_instructions: str

class PredictionResponse(BaseModel):
    predicted_grade: int
    grade_name: str
    confidence: float
    class_probabilities: Dict[str, float]
    entropy: float
    uncertainty_score: float = 0.0
    requires_manual_doctor_review: bool = False
    epistemic_uncertainty: float = 0.0
    aleatoric_uncertainty: float = 0.0
    confidence_interval: Optional[Dict[str, Any]] = None
    inference_time_ms: float
    temperature: float
    gradcam_url: Optional[str] = None
    model_status: str
    model_provenance: str
    is_verified_checkpoint: bool

class LesionResponse(BaseModel):
    microaneurysm_count: int
    hemorrhage_count: int
    hard_exudate_count: int
    soft_exudate_count: int
    mask_url: Optional[str] = None
    classification_note: str = "Suspected lesion candidates"
    method: str = "OPENCV_MORPHOLOGICAL_FALLBACK"
    is_verified_model: bool = False

class DoctorReviewCreate(BaseModel):
    doctor_name: str
    doctor_license: Optional[str] = "MCI-REG-AI"
    confirmed_grade: int
    referral_recommendation: Optional[str] = "Specialist ophthalmologist consultation"
    clinical_notes: Optional[str] = ""
    dataset_tag: Optional[str] = "Indore_Hub_Active_v1.1"

class DoctorReviewResponse(DoctorReviewCreate):
    id: str
    was_overridden: bool
    reviewed_at: datetime
    dataset_tag: Optional[str] = "Indore_Hub_Active_v1.1"
    class Config:
        from_attributes = True

class ActiveLearningLogResponse(BaseModel):
    id: str
    screening_id: str
    verified_label: int
    dataset_tag: str
    ai_predicted_grade: Optional[int] = None
    was_overridden: bool = False
    doctor_name: Optional[str] = None
    clinical_notes: Optional[str] = ""
    uncertainty_score: Optional[float] = 0.0
    image_path: Optional[str] = None
    updated_at: datetime
    class Config:
        from_attributes = True

class BilingualExplanation(BaseModel):
    en: str
    hi: str

class ScreeningDetailResponse(BaseModel):
    id: str
    patient: PatientResponse
    eye_side: str
    raw_image_url: str
    preprocessed_image_url: Optional[str] = None
    iqa: IqaResult
    prediction: Optional[PredictionResponse] = None
    lesions: Optional[LesionResponse] = None
    doctor_review: Optional[DoctorReviewResponse] = None
    referral_urgency: str
    status: str
    created_at: datetime
    report_pdf_url: Optional[str] = None

    # New fields for PS-14 Commercial & Clinical Stratification
    uncertainty_score: float = 0.0
    requires_manual_doctor_review: bool = False
    billing_status: str = "₹25 Valid Scan"
    billing_amount: float = 25.0
    commercial_tier: str = "Tier 2: Valid Diagnostic Tele-Ophthalmology Scan"
    systemic_risk: str = "Low Systemic Risk"
    next_screening_interval: str = "12 Months (Annual Screening)"
    bilingual_explanation: Optional[BilingualExplanation] = None

    class Config:
        from_attributes = True



# =====================================================================
# AUTHENTICATION & RBAC MODELS (User, Doctor)
# =====================================================================

class User(Base):
    """
    User account model for Authentication & RBAC in PostgreSQL / SQLite.
    Roles: 'user' (Patient / Camp Worker) or 'doctor' (Ophthalmologist / Clinician)
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    full_name = Column(String(120), nullable=False)
    email = Column(String(120), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="user")  # "user" or "doctor"
    license_id = Column(String(60), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, index=True)

    # Legacy & backwards compatibility columns
    username = Column(String(60), unique=True, nullable=True, index=True)
    license_number = Column(String(60), nullable=True)
    is_verified = Column(Boolean, default=True)

    # Relationships
    uploaded_screenings = relationship(
        "Screening",
        foreign_keys="[Screening.uploaded_by_id]",
        back_populates="uploaded_by"
    )
    reviewed_screenings = relationship(
        "Screening",
        foreign_keys="[Screening.reviewed_by_doctor_id]",
        back_populates="reviewed_by_doctor"
    )

    def __init__(self, **kwargs):
        # Sync license_id and license_number
        if "license_id" in kwargs and "license_number" not in kwargs:
            kwargs["license_number"] = kwargs["license_id"]
        elif "license_number" in kwargs and "license_id" not in kwargs:
            kwargs["license_id"] = kwargs["license_number"]

        if "name" in kwargs and "full_name" not in kwargs:
            kwargs["full_name"] = kwargs["name"]

        if "username" not in kwargs:
            if "email" in kwargs and kwargs["email"]:
                kwargs["username"] = kwargs["email"].split("@")[0]
            elif "full_name" in kwargs:
                kwargs["username"] = kwargs["full_name"].lower().replace(" ", "_")

        # Allow id passed as int or auto-generated
        if "id" in kwargs and isinstance(kwargs["id"], str) and not kwargs["id"].isdigit():
            kwargs.pop("id")

        super().__init__(**kwargs)

    @property
    def name(self):
        return self.full_name

    @property
    def password_hash(self):
        return self.hashed_password


class UserRegisterRequest(BaseModel):
    full_name: str
    email: str
    password: str
    role: str = "user"
    license_id: Optional[str] = None
    # Compatibility
    username: Optional[str] = None
    license_number: Optional[str] = None


class UserLoginRequest(BaseModel):
    password: str
    email: Optional[str] = None
    username: Optional[str] = None
    role: Optional[str] = None


class UserProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    license_id: Optional[str] = None
    license_number: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None


class UserResponse(BaseModel):
    id: Union[int, str]
    full_name: str
    email: str
    role: str
    license_id: Optional[str] = None
    license_number: Optional[str] = None
    username: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    access_token: str
    token: str
    token_type: str = "bearer"
    role: str
    full_name: str
    user: UserResponse


# Backwards compatibility aliases
ScreeningRecord = Screening
ScreeningRecords = Screening
