"""
Doctor Review & Active Learning API Router
Legacy prefix: /screenings
Supports ophthalmologist verification sign-offs, Active Learning
dataset versioning (Indore_Hub_Active_v1.1), and PyTorch fine-tuning export.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    DoctorReviewCreate,
    DoctorReviewResponse,
    ActiveLearningLogResponse,
    ActiveLearningLog,
)
from app.services.active_learning import (
    ActiveLearningService,
    DEFAULT_DATASET_VERSION_TAG,
)

router = APIRouter(prefix="/screenings", tags=["Doctor Review & Active Learning"])


@router.post("/{screening_id}/doctor-review", response_model=DoctorReviewResponse)
def submit_doctor_review(
    screening_id: str,
    review_data: DoctorReviewCreate,
    db: Session = Depends(get_db)
):
    """
    Submits a clinician's expert evaluation, confirming or overriding
    the AI model's predicted grade, adding clinical notes and referral instructions.
    
    Automatically records into active_learning_logs with tag 'Indore_Hub_Active_v1.1'
    to bridge the domain gap between legacy APTOS 2019 and real-world clinical data.
    """
    try:
        review = ActiveLearningService.record_doctor_review(
            db=db,
            screening_id=screening_id,
            review_data=review_data,
            dataset_tag=review_data.dataset_tag or DEFAULT_DATASET_VERSION_TAG
        )
        return review
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Review submission failed: {str(e)}")


@router.get("/active-learning/logs", response_model=List[ActiveLearningLogResponse], summary="List Active Learning Samples")
def list_active_learning_logs(
    tag: Optional[str] = Query(None, description="Dataset tag filter (e.g. Indore_Hub_Active_v1.1)"),
    overridden_only: bool = Query(False, description="Filter only cases where clinician overridden the AI"),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """
    Returns verified clinician labels accumulated through active learning
    for continual training and domain adaptation.
    """
    query = db.query(ActiveLearningLog)
    if tag:
        query = query.filter(ActiveLearningLog.dataset_tag == tag)
    if overridden_only:
        query = query.filter(ActiveLearningLog.was_overridden == True)

    logs = query.order_by(ActiveLearningLog.updated_at.desc()).limit(limit).all()
    return logs


@router.get("/active-learning/stats", summary="Get Active Learning Dataset Statistics")
def get_active_learning_stats(
    tag: Optional[str] = Query(None, description="Optional dataset tag filter"),
    db: Session = Depends(get_db)
):
    """Returns dataset summary metrics and retraining readiness."""
    return ActiveLearningService.get_dataset_statistics(db=db, dataset_tag=tag)


@router.get("/active-learning/export", summary="Export PyTorch Fine-Tuning Manifest")
def export_active_learning_dataset(
    tag: Optional[str] = Query(None, description="Dataset version tag to export"),
    db: Session = Depends(get_db)
):
    """Exports clean, verified training manifest for PyTorch fine-tuning."""
    return ActiveLearningService.export_fine_tuning_manifest(db=db, dataset_tag=tag)
