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

class ScreeningCreate(ScreeningBase):
    record_id: Optional[str] = None
    patient_id: int

class ScreeningSignOffRequest(BaseModel):
    clinician_notes: str = Field(..., min_length=2, description="Clinical sign-off notes & recommendations by doctor")

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
