"""
Schema and ORM re-export for backwards compatibility.
All models and schemas are centralized in app.models.
"""
from app.models import (
    Base,
    Patient,
    Screening,
    Lesion,
    LesionSummary,
    DoctorReview,
    ActiveLearningLog,
    Prediction,
    AuditLog,
    PatientCreate,
    PatientResponse,
    IqaResult,
    PredictionResponse,
    LesionResponse,
    DoctorReviewCreate,
    DoctorReviewResponse,
    ActiveLearningLogResponse,
    BilingualExplanation,
    ScreeningDetailResponse,
)

__all__ = [
    "Base",
    "Patient",
    "Screening",
    "Lesion",
    "LesionSummary",
    "DoctorReview",
    "ActiveLearningLog",
    "Prediction",
    "AuditLog",
    "PatientCreate",
    "PatientResponse",
    "IqaResult",
    "PredictionResponse",
    "LesionResponse",
    "DoctorReviewCreate",
    "DoctorReviewResponse",
    "ActiveLearningLogResponse",
    "BilingualExplanation",
    "ScreeningDetailResponse",
]
