import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field

# =====================================================================
# PATIENT SCHEMAS
# =====================================================================

class PatientBase(BaseModel):
    name: str = Field(..., description="Full patient name")
    age: int = Field(..., ge=0, le=125, description="Patient age in years")
    gender: str = Field(..., description="Gender (Male, Female, Other)")
    diabetes_history: Optional[str] = Field("Type 2 Diabetes", description="Diabetes duration & history")
    symptoms: Optional[str] = Field(None, description="Reported eye and vision symptoms")

class PatientCreate(PatientBase):
    pass

class PatientResponse(PatientBase):
    id: int
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


# =====================================================================
# SCREENING SCHEMAS
# =====================================================================

class ScreeningBase(BaseModel):
    eye_side: str = Field("Right Eye (OD)", description="Eye evaluated (e.g. Right Eye (OD) or Left Eye (OS))")
    icdr_grade: int = Field(0, ge=0, le=4, description="ICDR DR severity grade (0 to 4)")
    stage_label: str = Field("No DR", description="Descriptive clinical severity label")
    model_confidence: float = Field(0.0, ge=0.0, le=1.0, description="Model confidence score")
    entropy: float = Field(0.0, ge=0.0, description="Shannon / Monte Carlo predictive entropy")
    epistemic_uncertainty: float = Field(0.0, description="Model epistemic uncertainty (BALD)")
    aleatoric_uncertainty: float = Field(0.0, description="Data aleatoric uncertainty")
    hard_exudates: int = Field(0, ge=0, description="Hard exudate count detected")
    soft_exudates: int = Field(0, ge=0, description="Soft exudate / cotton wool spots count")
    approval_status: str = Field("AUTO_APPROVED", description="Approval status: AUTO_APPROVED, MANUAL_REVIEW_REQUIRED, or CLINICIAN_SIGNED_OFF")
    clinician_notes: Optional[str] = Field(None, description="Doctor observations and clinical notes")
    raw_image_url: Optional[str] = Field(None, description="URL path to raw retinal fundus image")
    heatmap_image_url: Optional[str] = Field(None, description="URL path to Grad-CAM saliency overlay")
    patient_phone: Optional[str] = Field(None, description="Patient contact telephone number")
    patient_email: Optional[str] = Field(None, description="Patient contact email address")
    review_requested: Optional[bool] = Field(False, description="Flag indicating patient requested doctor review")
    review_status: Optional[str] = Field("NOT_REQUESTED", description="Status: NOT_REQUESTED, PENDING_REVIEW, REVIEWED, URGENT_FOLLOWUP")
    doctor_suggestion: Optional[str] = Field(None, description="Clinical recommendations, prescriptions, and advice")
    doctor_contact_info: Optional[str] = Field(None, description="Doctor/Clinic contact details for patient followup")
    reviewed_at: Optional[datetime] = Field(None, description="Timestamp when review was finalized")
    doctor_final_grade: Optional[int] = Field(None, ge=0, le=4, description="Clinician confirmed/overridden ICDR grade")
    ai_overridden: bool = Field(False, description="Flag indicating doctor confirmed grade differs from AI grade")

class ScreeningCreate(ScreeningBase):
    record_id: Optional[str] = None
    patient_id: int

class ScreeningSignOffRequest(BaseModel):
    clinician_notes: str = Field(..., min_length=2, description="Clinical sign-off notes & recommendations by doctor")

# Doctor Portal Schemas
class ReviewRequestPayload(BaseModel):
    patient_phone: Optional[str] = Field(None, description="Patient or guardian contact phone number")
    patient_email: Optional[str] = Field(None, description="Patient email address for receiving prescription/advice")
    notes: Optional[str] = Field(None, description="Short note or question for the ophthalmologist")

class DoctorReviewActionPayload(BaseModel):
    doctor_suggestion: str = Field(..., min_length=2, description="Clinical advice, instructions, and next steps")
    review_status: str = Field(..., description="Target status: REVIEWED or URGENT_FOLLOWUP")
    doctor_contact_info: Optional[str] = Field(None, description="Direct clinic contact number or email for patient")
    confirmed_grade: Optional[int] = Field(None, ge=0, le=4, description="Optional confirmed or overridden ICDR grade")
    doctor_final_grade: Optional[int] = Field(None, ge=0, le=4, description="Clinician confirmed or overridden grade")

class DoctorStatsResponse(BaseModel):
    pending_reviews: int = Field(0, description="Count of cases awaiting doctor review")
    high_risk_cases: int = Field(0, description="Count of Grade 3 & Grade 4 cases")
    completed_reviews: int = Field(0, description="Count of clinician-reviewed cases")
    total_screenings: int = Field(0, description="Total patient screenings conducted")

class DoctorQueuePatient(BaseModel):
    id: Optional[int] = None
    name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    diabetes_history: Optional[str] = None
    symptoms: Optional[str] = None

class DoctorQueueItem(BaseModel):
    id: str
    record_id: str
    patient: DoctorQueuePatient
    patient_name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    eye_side: str
    icdr_grade: int
    stage_label: str
    model_confidence: float
    entropy: float
    epistemic_uncertainty: float
    aleatoric_uncertainty: float
    hard_exudates: int
    soft_exudates: int
    raw_image_url: Optional[str] = None
    heatmap_image_url: Optional[str] = None
    review_requested: bool = False
    review_status: str = "NOT_REQUESTED"
    doctor_suggestion: Optional[str] = None
    doctor_contact_info: Optional[str] = None
    reviewed_at: Optional[str] = None
    reviewed_by_doctor_name: Optional[str] = None
    doctor_final_grade: Optional[int] = None
    ai_overridden: bool = False
    created_at: Optional[str] = None
    referral_urgency: Optional[str] = "ROUTINE"
    status: Optional[str] = "ANALYZED"

class ScreeningResponse(ScreeningBase):
    id: int
    record_id: str
    patient_id: int
    created_at: Optional[datetime] = None
    patient: Optional[PatientResponse] = None
    model_config = ConfigDict(from_attributes=True)

class PaginatedScreeningsResponse(BaseModel):
    total: int
    page: int
    limit: int
    items: List[ScreeningResponse]

class ScreeningSignOffResponse(BaseModel):
    status: str
    record_id: str
    approval_status: str
    clinician_notes: str
    updated_at: datetime
    screening: ScreeningResponse

class ScreeningDeleteResponse(BaseModel):
    status: str
    record_id: str
    message: str


# =====================================================================
# CLINIC DEVICE SCHEMAS
# =====================================================================

class ClinicDeviceCreate(BaseModel):
    device_name: str = Field(..., min_length=2, max_length=120, description="e.g. Clinic Room 1 Fundus Cam")
    device_model: str = Field(..., min_length=2, max_length=120, description="e.g. Topcon TRC-NW400 / USB Retinal Adapter")
    connection_type: str = Field("USB_LIVE_CAMERA", description="USB_LIVE_CAMERA or NETWORK_API_PUSH")

class ClinicDeviceResponse(BaseModel):
    id: int
    doctor_id: int
    device_name: str
    device_model: str
    connection_type: str
    device_api_key: str
    status: str
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


