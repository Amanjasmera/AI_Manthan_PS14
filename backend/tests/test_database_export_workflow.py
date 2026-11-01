"""
RetinaVision-AI / NETRA X - Database, Doctor Verification & Excel Export Tests
Verifies:
1. SQLite database setup (users, screenings, screening_records view).
2. User & Doctor registration/login and role-based attributes (is_verified).
3. Retinal scan submission with 'Pending / Review Required' status.
4. Doctor review & verification workflow updating status to 'Doctor Verified' with clinical notes.
5. Excel (.xlsx) and CSV export endpoints and file generation.
"""

import os
import io
import sys
import zipfile
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

import pytest
from sqlalchemy import text

from app.database import SessionLocal, init_db
from app.models import User, Patient, Screening, DoctorReview
from app.core.excel_exporter import (
    generate_excel_xlsx,
    generate_csv,
    extract_registry_rows,
    export_screenings_to_system_excel,
    SCREENING_REGISTRY_HEADERS
)
from app.api.routes_screenings import (
    list_unverified_screenings,
    export_screenings_excel,
    export_screenings_csv,
    list_screenings
)
from app.services.active_learning import ActiveLearningService
from app.models import DoctorReviewCreate


@pytest.fixture(scope="module")
def db_session():
    init_db()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def test_sqlite_schema_and_views(db_session):
    """Verify that SQLite tables, columns, and compatibility views exist."""
    # Check users table columns
    user_cols = {row[1] for row in db_session.execute(text("PRAGMA table_info(users)")).fetchall()}
    assert "is_verified" in user_cols
    assert "role" in user_cols
    assert "hashed_password" in user_cols

    # Check screenings table columns
    screening_cols = {row[1] for row in db_session.execute(text("PRAGMA table_info(screenings)")).fetchall()}
    assert "status" in screening_cols
    assert "doctor_notes" in screening_cols

    # Check screening_records view
    records = db_session.execute(text("SELECT id, patient_name, age, gender, dr_grade, confidence, status, doctor_notes FROM screening_records LIMIT 5")).fetchall()
    assert isinstance(records, list)

    # Check users_view
    users_view = db_session.execute(text("SELECT id, name, email, password_hash, role, is_verified FROM users_view LIMIT 5")).fetchall()
    assert isinstance(users_view, list)


def test_user_and_doctor_model_properties(db_session):
    """Verify User and Screening model properties and aliases."""
    from app.models import ScreeningRecord, ScreeningRecords

    assert ScreeningRecord == Screening
    assert ScreeningRecords == Screening

    user = db_session.query(User).filter(User.username == "doctor").first()
    if user:
        assert user.name == user.full_name
        assert user.password_hash == user.hashed_password
        assert user.role == "Doctor"
        assert user.is_verified is True


def test_unverified_screenings_endpoint(db_session):
    """Verify unverified screenings endpoint returns records requiring review."""
    result = list_unverified_screenings(page=1, limit=50, db=db_session)
    assert "items" in result
    assert "total" in result
    for item in result["items"]:
        assert item["status"] != "Doctor Verified"


def test_doctor_review_verification_workflow(db_session):
    """
    Verify complete flow:
    1. Create a patient & screening with 'Pending / Review Required'.
    2. Ensure it shows in unverified list.
    3. Doctor submits review.
    4. Status transitions to 'Doctor Verified' and doctor notes are persisted.
    """
    import uuid
    test_id = str(uuid.uuid4())
    patient = Patient(
        id=test_id,
        full_name="Workflow Test Patient",
        age=58,
        gender="Female",
        diabetes_history="Type 2 Diabetes"
    )
    screening = Screening(
        id=test_id,
        patient_id=test_id,
        eye_side="RIGHT",
        raw_image_path="test_path.jpg",
        iqa_passed=True,
        predicted_grade=2,
        grade_name="Moderate NPDR",
        confidence=0.88,
        status="Pending / Review Required"
    )
    db_session.add(patient)
    db_session.add(screening)
    db_session.commit()

    # Verify it is in unverified list
    unverified = list_unverified_screenings(page=1, limit=100, db=db_session)
    matching = [item for item in unverified["items"] if item["id"] == test_id]
    assert len(matching) == 1
    assert matching[0]["status"] == "Pending / Review Required"

    # Doctor verifies the screening
    review_data = DoctorReviewCreate(
        doctor_name="Dr. Verified Specialist, MD",
        doctor_license="MCI-TEST-9999",
        confirmed_grade=2,
        clinical_notes="Verified moderate NPDR with microaneurysms and hard exudates. Routine follow-up.",
        referral_recommendation="Ophthalmology review in 6 months"
    )
    ActiveLearningService.record_doctor_review(
        db=db_session,
        screening_id=test_id,
        review_data=review_data
    )
    db_session.commit()

    # Re-query screening from DB
    updated = db_session.query(Screening).filter(Screening.id == test_id).first()
    assert updated.status == "Doctor Verified"
    assert updated.doctor_notes == "Verified moderate NPDR with microaneurysms and hard exudates. Routine follow-up."
    assert updated.doctor_review is not None
    assert updated.doctor_review.confirmed_grade == 2


def test_excel_export_endpoint(db_session):
    """Verify export_screenings_excel returns a valid OpenXML .xlsx file."""
    response = export_screenings_excel(db=db_session)
    assert response.status_code == 200
    assert response.media_type == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    assert "attachment" in response.headers.get("Content-Disposition", "")
    assert "netra_x_screening_registry.xlsx" in response.headers.get("Content-Disposition", "")

    # Verify bytes form a valid zip with OpenXML parts
    content = response.body
    assert content.startswith(b"PK")  # ZIP magic bytes
    z = zipfile.ZipFile(io.BytesIO(content))
    namelist = z.namelist()
    assert "[Content_Types].xml" in namelist
    assert "xl/workbook.xml" in namelist
    assert "xl/worksheets/sheet1.xml" in namelist


def test_csv_export_endpoint(db_session):
    """Verify export_screenings_csv returns valid CSV file."""
    response = export_screenings_csv(db=db_session)
    assert response.status_code == 200
    assert "text/csv" in response.media_type
    text_content = response.body.decode("utf-8")
    assert "Screening ID" in text_content
    assert "Patient Name" in text_content
    assert "Doctor Verified" in text_content


def test_export_screenings_to_system_excel_helper():
    """Verify the helper function exports directly to file system."""
    exported_path = export_screenings_to_system_excel()
    assert os.path.exists(exported_path)
    assert exported_path.endswith(".xlsx")

    # Verify file is readable as a zip
    z = zipfile.ZipFile(exported_path)
    assert "xl/worksheets/sheet1.xml" in z.namelist()
