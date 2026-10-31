import os
import sys
from pathlib import Path

# Add backend directory to path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

import numpy as np
import cv2
from fastapi.testclient import TestClient
from sqlalchemy import inspect
from app.main import app
from app.database import engine, get_db, SessionLocal, init_db
from app.models import Patient, Screening, Lesion, DoctorReview, ActiveLearningLog
from app.core.iqa import ImageQualityAssessor, IqaErrorCode
from app.core.classifier import DiabeticRetinopathyClassifier, ModelStatus
from app.core.lesion_detector import MicrovasculatureLesionDetector
from app.core.report_generator import PDFReportGenerator

client = TestClient(app)

def make_test_retina_image(blur=False, dark=False, non_retinal=False):
    """Creates synthetic image for testing."""
    h, w = 512, 512
    if non_retinal:
        # Blue non-retinal image (e.g. skin or photo of sky)
        img = np.zeros((h, w, 3), dtype=np.uint8)
        img[:, :] = (230, 120, 30) # Blue-dominant
        return img

    img = np.zeros((h, w, 3), dtype=np.uint8)
    # Retinal circle
    cv2.circle(img, (256, 256), 220, (15, 60, 180), -1)
    # Optic disc
    cv2.circle(img, (180, 256), 35, (120, 210, 245), -1)
    # Macula
    cv2.circle(img, (330, 260), 20, (10, 40, 130), -1)

    if blur:
        img = cv2.GaussianBlur(img, (35, 35), 0)
    if dark:
        img = (img * 0.3).astype(np.uint8)

    return img

def test_database_schema_and_tables():
    """Validates that all 5 required tables exist with expected schema."""
    init_db()
    inspector = inspect(engine)
    table_names = inspector.get_table_names()

    required_tables = [
        "patients",
        "screenings",
        "lesions",
        "doctor_reviews",
        "active_learning_logs"
    ]
    for table in required_tables:
        assert table in table_names, f"Table '{table}' missing from SQLite database!"

    # Verify key columns on screenings table
    screening_columns = {col["name"] for col in inspector.get_columns("screenings")}
    for col in [
        "id", "patient_id", "eye_side", "raw_image_path", "preprocessed_image_path",
        "iqa_passed", "blur_score", "illumination_score", "contrast_score",
        "predicted_grade", "grade_name", "confidence", "referral_urgency", "status", "created_at"
    ]:
        assert col in screening_columns, f"Column '{col}' missing from 'screenings' table!"

    # Verify key columns on lesions table
    lesion_columns = {col["name"] for col in inspector.get_columns("lesions")}
    for col in [
        "screening_id", "microaneurysm_count", "hemorrhage_count",
        "hard_exudate_count", "soft_exudate_count", "mask_url"
    ]:
        assert col in lesion_columns, f"Column '{col}' missing from 'lesions' table!"

    # Verify key columns on active_learning_logs
    al_columns = {col["name"] for col in inspector.get_columns("active_learning_logs")}
    for col in ["screening_id", "verified_label", "dataset_tag", "updated_at"]:
        assert col in al_columns, f"Column '{col}' missing from 'active_learning_logs' table!"

def test_iqa_blur_detection():
    blurry_img = make_test_retina_image(blur=True)
    res = ImageQualityAssessor.assess_image(blurry_img)
    assert res["passed"] is False
    assert IqaErrorCode.IMAGE_TOO_BLURRY.value in res["error_codes"]
    assert "recapture_instructions" in res

def test_iqa_underexposure_detection():
    dark_img = make_test_retina_image(dark=True)
    res = ImageQualityAssessor.assess_image(dark_img)
    assert res["passed"] is False
    assert IqaErrorCode.IMAGE_UNDEREXPOSED.value in res["error_codes"]

def test_iqa_non_retinal_rejection():
    blue_img = make_test_retina_image(non_retinal=True)
    res = ImageQualityAssessor.assess_image(blue_img)
    assert res["passed"] is False
    assert IqaErrorCode.NON_RETINAL_IMAGE.value in res["error_codes"]

def test_classifier_trained_checkpoint_loading():
    classifier = DiabeticRetinopathyClassifier()
    assert classifier.model_status == ModelStatus.VERIFIED_TRAINED_CHECKPOINT
    assert classifier.temperature > 1.4  # T was fitted at 1.5000

    dummy_rgb_160 = np.random.randint(50, 200, (160, 160, 3), dtype=np.uint8)
    pred = classifier.predict(dummy_rgb_160)
    assert "predicted_grade" in pred
    assert 0 <= pred["predicted_grade"] <= 4
    assert pred["entropy"] > 0
    assert pred["confidence_interval"] is None
    assert pred["is_verified_checkpoint"] is True

def test_lesion_detection_candidate_labeling():
    img = make_test_retina_image()
    # Add tiny artificial red dots (suspected microaneurysms)
    cv2.circle(img, (280, 250), 3, (10, 15, 90), -1)
    cv2.circle(img, (300, 270), 3, (10, 15, 90), -1)

    lesions, overlay, mask = MicrovasculatureLesionDetector.detect_lesions(img)
    assert "microaneurysms" in lesions
    assert "hemorrhages" in lesions
    assert "hard_exudates" in lesions
    assert "soft_exudates" in lesions
    assert "suspected" in lesions["classification_note"].lower()
    assert lesions["is_verified_model"] is False

def test_health_endpoint():
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["pytorch"]["weights_found"] is True
    assert data["pytorch"]["model_status"] == "VERIFIED_TRAINED_CHECKPOINT"
    assert data["pytorch"]["calibrated_temperature"] >= 1.4

def test_screening_analyze_api_flow():
    img = make_test_retina_image()
    _, enc = cv2.imencode(".jpg", img)
    files = {"file": ("test_retina.jpg", enc.tobytes(), "image/jpeg")}
    data = {
        "patient_name": "Test Patient",
        "age": 60,
        "gender": "Male",
        "eye_side": "RIGHT",
        "diabetes_history": "Type 2 Diabetes (5 yrs)"
    }

    resp = client.post("/api/v1/screenings/analyze", files=files, data=data)
    assert resp.status_code == 201
    body = resp.json()
    assert body["iqa"]["passed"] is True
    assert body["prediction"]["is_verified_checkpoint"] is True
    assert "entropy" in body["prediction"]
    assert body["prediction"]["confidence_interval"] is None
    assert body["report_pdf_url"] is not None

    # Verify 3-Tier Commercial Model & Risk Stratification
    assert body["billing_status"] == "₹25 Valid Scan"
    assert body["billing_amount"] == 25.0
    assert "systemic_risk" in body
    assert "next_screening_interval" in body
    assert "bilingual_explanation" in body
    assert len(body["bilingual_explanation"]["en"]) > 0
    assert len(body["bilingual_explanation"]["hi"]) > 0

    return body["id"]

def test_screening_iqa_rejection_api_flow():
    blurry_img = make_test_retina_image(blur=True)
    _, enc = cv2.imencode(".jpg", blurry_img)
    files = {"file": ("blurry.jpg", enc.tobytes(), "image/jpeg")}
    data = {
        "patient_name": "Blurry Test",
        "age": 50,
        "gender": "Female",
        "eye_side": "LEFT"
    }

    resp = client.post("/api/v1/screenings/analyze", files=files, data=data)
    assert resp.status_code == 201
    body = resp.json()
    assert body["iqa"]["passed"] is False
    assert "IMAGE_TOO_BLURRY" in body["iqa"]["error_codes"]
    assert body["referral_urgency"] == "RETAKE"
    assert body["status"] == "IQA_RETAKE"

    # Verify Zero-Charge Billing Protection
    assert body["billing_status"] == "₹0 Charged — Waived by IQA Gatekeeper"
    assert body["billing_amount"] == 0.0
    assert "Immediate Recapture" in body["next_screening_interval"]

def test_doctor_review_and_active_learning_flow():
    # Analyze a scan to get an active ID
    img = make_test_retina_image()
    _, enc = cv2.imencode(".jpg", img)
    files = {"file": ("test_retina_dr.jpg", enc.tobytes(), "image/jpeg")}
    data = {
        "patient_name": "Active Learning Patient",
        "age": 58,
        "gender": "Female",
        "eye_side": "LEFT",
        "diabetes_history": "Type 2 Diabetes"
    }
    resp = client.post("/api/v1/screenings/analyze", files=files, data=data)
    assert resp.status_code == 201
    screening_id = resp.json()["id"]

    # Submit Doctor Review with confirmed grade 2
    review_payload = {
        "doctor_name": "Dr. Ananya Roy",
        "doctor_license": "MCI-IND-99882",
        "confirmed_grade": 2,
        "referral_recommendation": "Fundus Fluorescein Angiography & OCT",
        "clinical_notes": "Early macular edema suspected. Confirmed Grade 2 NPDR."
    }
    rev_resp = client.post(f"/api/v1/screenings/{screening_id}/doctor-review", json=review_payload)
    assert rev_resp.status_code == 200
    rev_body = rev_resp.json()
    assert rev_body["doctor_name"] == "Dr. Ananya Roy"
    assert rev_body["confirmed_grade"] == 2

    # Query active learning endpoint
    al_resp = client.get("/api/v1/screenings/active-learning/logs?tag=Indore_Hub_v2")
    assert al_resp.status_code == 200
    al_logs = al_resp.json()
    assert len(al_logs) > 0
    matched = [log for log in al_logs if log["screening_id"] == screening_id]
    assert len(matched) == 1
    assert matched[0]["verified_label"] == 2
    assert matched[0]["dataset_tag"] == "Indore_Hub_v2"

def test_pdf_report_generator_from_db():
    db = SessionLocal()
    try:
        first_s = db.query(Screening).first()
        assert first_s is not None, "At least one screening should exist in DB"
        pdf_path = PDFReportGenerator.generate_report(first_s.id, db=db)
        assert os.path.exists(pdf_path)
        assert os.path.getsize(pdf_path) > 1000  # Report generated with content
    finally:
        db.close()

if __name__ == "__main__":
    print("Running integration tests directly...")
    test_database_schema_and_tables()
    print("Passed: test_database_schema_and_tables")
    test_iqa_blur_detection()
    print("Passed: test_iqa_blur_detection")
    test_iqa_underexposure_detection()
    print("Passed: test_iqa_underexposure_detection")
    test_iqa_non_retinal_rejection()
    print("Passed: test_iqa_non_retinal_rejection")
    test_classifier_trained_checkpoint_loading()
    print("Passed: test_classifier_trained_checkpoint_loading")
    test_lesion_detection_candidate_labeling()
    print("Passed: test_lesion_detection_candidate_labeling")
    test_health_endpoint()
    print("Passed: test_health_endpoint")
    test_screening_analyze_api_flow()
    print("Passed: test_screening_analyze_api_flow")
    test_screening_iqa_rejection_api_flow()
    print("Passed: test_screening_iqa_rejection_api_flow")
    test_doctor_review_and_active_learning_flow()
    print("Passed: test_doctor_review_and_active_learning_flow")
    test_pdf_report_generator_from_db()
    print("Passed: test_pdf_report_generator_from_db")
    print("\n>>> ALL 11 INTEGRATION TESTS PASSED 100% CLEANLY! <<<")
