import os
import sys
from pathlib import Path

# Add backend directory to path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

import numpy as np
import cv2
from sqlalchemy import inspect
from app.main import app
from app.database import engine, get_db, SessionLocal, init_db
from app.models import Patient, Screening, Lesion, DoctorReview, ActiveLearningLog
from app.core.iqa import ImageQualityAssessor, IqaErrorCode
from app.core.classifier import DiabeticRetinopathyClassifier, ModelStatus
from app.core.lesion_detector import MicrovasculatureLesionDetector
from app.core.report_generator import PDFReportGenerator
from app.core.uncertainty import BayesianUncertaintyEstimator
from app.core.gradcam import generate_gradcam_visuals, generate_gradcam_heatmap_only, RealGradCAM
from app.services.inference import RetinalInferencePipeline
from app.services.screening_service import ScreeningService
from app.services.active_learning import ActiveLearningService
from app.api.routes_health import health_check
from app.models import DoctorReviewCreate

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
        "predicted_grade", "grade_name", "confidence", "referral_urgency", "status", "created_at",
        "uncertainty_score", "requires_manual_doctor_review"
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
    data = health_check()
    assert data["pytorch"]["weights_found"] is True
    assert data["pytorch"]["model_status"] == "VERIFIED_TRAINED_CHECKPOINT"
    assert data["pytorch"]["calibrated_temperature"] >= 1.4
    assert data["bayesian_deep_learning"]["mc_dropout_enabled"] is True
    assert data["bayesian_deep_learning"]["safe_entropy_threshold"] == 0.50

def test_screening_analyze_api_flow():
    db = SessionLocal()
    try:
        service = ScreeningService()
        img = make_test_retina_image()
        _, enc = cv2.imencode(".jpg", img)
        body = service.process_screening(
            db=db,
            image_bytes=enc.tobytes(),
            patient_name="Test Patient",
            age=60,
            gender="Male",
            eye_side="RIGHT",
            diabetes_history="Type 2 Diabetes (5 yrs)"
        )
        assert body["iqa"]["passed"] is True
        assert body["prediction"]["is_verified_checkpoint"] is True
        assert "entropy" in body["prediction"]
        assert "uncertainty_score" in body["prediction"]
        assert "requires_manual_doctor_review" in body["prediction"]
        assert "uncertainty_score" in body
        assert "requires_manual_doctor_review" in body
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
    finally:
        db.close()

def test_screening_iqa_rejection_api_flow():
    db = SessionLocal()
    try:
        service = ScreeningService()
        blurry_img = make_test_retina_image(blur=True)
        _, enc = cv2.imencode(".jpg", blurry_img)
        body = service.process_screening(
            db=db,
            image_bytes=enc.tobytes(),
            patient_name="Blurry Test",
            age=50,
            gender="Female",
            eye_side="LEFT"
        )
        assert body["iqa"]["passed"] is False
        assert "IMAGE_TOO_BLURRY" in body["iqa"]["error_codes"]
        assert body["referral_urgency"] == "RETAKE"
        assert body["status"] == "IQA_RETAKE"

        # Verify Zero-Charge Billing Protection
        assert body["billing_status"] == "₹0 Charged — Waived by IQA Gatekeeper"
        assert body["billing_amount"] == 0.0
        assert "Immediate Recapture" in body["next_screening_interval"]
    finally:
        db.close()

def test_doctor_review_and_active_learning_flow():
    db = SessionLocal()
    try:
        service = ScreeningService()
        img = make_test_retina_image()
        _, enc = cv2.imencode(".jpg", img)
        body = service.process_screening(
            db=db,
            image_bytes=enc.tobytes(),
            patient_name="Active Learning Patient",
            age=58,
            gender="Female",
            eye_side="LEFT",
            diabetes_history="Type 2 Diabetes"
        )
        screening_id = body["id"]

        review_submission = DoctorReviewCreate(
            doctor_name="Dr. Ananya Roy",
            doctor_license="MCI-IND-99882",
            confirmed_grade=2,
            referral_recommendation="Fundus Fluorescein Angiography & OCT",
            clinical_notes="Early macular edema suspected. Confirmed Grade 2 NPDR.",
            dataset_tag="Indore_Hub_Active_v1.1"
        )
        rev_body = ActiveLearningService.record_doctor_review(
            db=db,
            screening_id=screening_id,
            review_data=review_submission
        )
        assert rev_body.doctor_name == "Dr. Ananya Roy"
        assert rev_body.confirmed_grade == 2
        assert rev_body.was_overridden in (True, False)

        # Query active learning records
        al_log = db.query(ActiveLearningLog).filter(ActiveLearningLog.screening_id == screening_id).first()
        assert al_log is not None
        assert al_log.verified_label == 2
        assert al_log.dataset_tag == "Indore_Hub_Active_v1.1"
    finally:
        db.close()

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

def test_bayesian_uncertainty_estimator_mc_dropout():
    """Validates Monte Carlo Dropout uncertainty estimation based on OATML standards."""
    estimator = BayesianUncertaintyEstimator(entropy_threshold=0.50, num_samples=10)
    probs = np.array([
        [0.65, 0.15, 0.10, 0.05, 0.05],
        [0.60, 0.20, 0.10, 0.05, 0.05],
        [0.70, 0.10, 0.10, 0.05, 0.05],
        [0.62, 0.18, 0.10, 0.05, 0.05],
        [0.68, 0.12, 0.10, 0.05, 0.05],
    ])
    res = estimator._compute_uncertainty_metrics(probs, len(probs))
    assert res.predicted_grade == 0
    assert res.grade_name == "No DR"
    assert res.entropy > 0.0
    assert res.uncertainty_score == res.entropy
    assert res.epistemic_uncertainty >= 0.0
    assert res.aleatoric_uncertainty >= 0.0
    assert "lower_95" in res.confidence_interval
    assert "upper_95" in res.confidence_interval
    assert "std_dev" in res.confidence_interval

def test_uncertainty_safety_gate_threshold_trigger():
    """Validates that entropy > 0.50 triggers requires_manual_doctor_review = True."""
    estimator = BayesianUncertaintyEstimator(entropy_threshold=0.50)
    # Ambiguous / uncertain case (high entropy across 5 classes)
    uncertain_probs = np.array([[0.30, 0.25, 0.20, 0.15, 0.10]])
    res_uncertain = estimator._compute_uncertainty_metrics(uncertain_probs, 1)
    assert res_uncertain.entropy > 0.50
    assert res_uncertain.requires_manual_doctor_review is True
    assert any("exceeds safe clinical threshold" in r for r in res_uncertain.safety_rationale)

    # Highly confident / unambiguous case (low entropy)
    confident_probs = np.array([[0.95, 0.02, 0.01, 0.01, 0.01]])
    res_confident = estimator._compute_uncertainty_metrics(confident_probs, 1)
    assert res_confident.entropy < 0.50
    assert res_confident.requires_manual_doctor_review is False

def test_inference_pipeline_execution():
    """Validates full RetinalInferencePipeline end-to-end execution."""
    pipeline = RetinalInferencePipeline()
    dummy_rgb_160 = np.random.randint(50, 200, (160, 160, 3), dtype=np.uint8)
    res = pipeline.predict(dummy_rgb_160, num_mc_samples=5)
    assert "predicted_grade" in res
    assert "uncertainty_score" in res
    assert "requires_manual_doctor_review" in res
    assert "epistemic_uncertainty" in res
    assert "aleatoric_uncertainty" in res
    assert "confidence_interval" in res
    assert "safety_rationale" in res
    assert isinstance(res["requires_manual_doctor_review"], bool)


def test_gradcam_explainability_5class():
    """
    Validates that Grad-CAM generates a non-trivial (non-zero) heatmap
    for all 5 ICDR severity classes using the three-tier fallback strategy.
    """
    from app.core.gradcam import generate_gradcam_visuals, generate_gradcam_heatmap_only
    from app.core.preprocessor import RetinalPreprocessor

    clf = DiabeticRetinopathyClassifier()
    assert clf.model is not None, "Trained checkpoint must be loaded for Grad-CAM test"

    # Build a realistic synthetic retinal image
    img = make_test_retina_image()
    model_input = RetinalPreprocessor.process_for_model(img, target_size=(160, 160))

    for grade in range(5):
        heatmap_rgb, overlay_rgb = generate_gradcam_visuals(
            clf.model, model_input, target_dim=(256, 256), class_idx=grade
        )
        # Shape checks
        assert heatmap_rgb.shape == (256, 256, 3), f"Grade {grade}: Unexpected heatmap shape {heatmap_rgb.shape}"
        assert overlay_rgb.shape == (256, 256, 3), f"Grade {grade}: Unexpected overlay shape {overlay_rgb.shape}"
        # Ensure non-trivial heatmap (not all-black/empty)
        assert np.count_nonzero(heatmap_rgb) > 0, f"Grade {grade}: Grad-CAM heatmap is all zeros"
        # Verify dtype is uint8 RGB
        assert heatmap_rgb.dtype == np.uint8, f"Grade {grade}: Heatmap dtype must be uint8"

    # Test heatmap-only variant
    heatmap_only = generate_gradcam_heatmap_only(clf.model, model_input, target_dim=(256, 256), class_idx=0)
    assert heatmap_only.shape == (256, 256, 3)
    assert np.count_nonzero(heatmap_only) > 0


def test_lesion_segmentation_opencv_pipeline():
    """
    Validates OpenCV morphological lesion detection returns structured output
    with all required fields for every input image type.
    """
    from app.core.lesion_detector import MicrovasculatureLesionDetector

    # Normal-looking synthetic retina (no lesions expected)
    img = make_test_retina_image()
    summary, overlay, mask = MicrovasculatureLesionDetector.detect_lesions(img)

    # Structure validation
    assert "microaneurysms" in summary
    assert "hemorrhages" in summary
    assert "hard_exudates" in summary
    assert "soft_exudates" in summary
    assert "classification_note" in summary
    assert "method" in summary
    assert summary["method"] == "OPENCV_MORPHOLOGICAL_FALLBACK"
    assert summary["is_verified_model"] is False
    assert overlay.shape[2] == 4, "Overlay must be 4-channel RGBA"
    assert len(mask.shape) == 2, "Mask must be 2D grayscale"

    # All counts must be non-negative integers
    for key in ["microaneurysms", "hemorrhages", "hard_exudates", "soft_exudates"]:
        assert isinstance(summary[key], int), f"'{key}' must be int, got {type(summary[key])}"
        assert summary[key] >= 0, f"'{key}' count must be >= 0"

    # Empty input guard
    summary_empty, _, _ = MicrovasculatureLesionDetector.detect_lesions(None)
    assert summary_empty["microaneurysms"] == 0
    assert summary_empty["hemorrhages"] == 0


def test_gradcam_url_in_screening_response():
    """
    End-to-end: validates that the screening pipeline stores the Grad-CAM
    overlay JPEG and returns a non-null gradcam_url in the prediction response.
    """
    db = SessionLocal()
    try:
        service = ScreeningService()
        img = make_test_retina_image()
        _, enc = cv2.imencode(".jpg", img)
        body = service.process_screening(
            db=db,
            image_bytes=enc.tobytes(),
            patient_name="GradCAM Test Patient",
            age=62,
            gender="Male",
            eye_side="RIGHT",
            diabetes_history="Type 2 Diabetes (10 yrs)"
        )
        # If IQA passed, prediction and gradcam_url must be present
        if body["iqa"]["passed"]:
            assert body["prediction"] is not None, "prediction must not be None after IQA pass"
            gradcam_url = body["prediction"].get("gradcam_url")
            assert gradcam_url is not None, "gradcam_url must not be None when model is VERIFIED_TRAINED_CHECKPOINT"
            assert "/api/v1/files/" in gradcam_url, f"Unexpected gradcam_url format: {gradcam_url}"
            # Verify 5-class output
            predicted_grade = body["prediction"]["predicted_grade"]
            assert 0 <= predicted_grade <= 4, f"Predicted grade {predicted_grade} out of ICDR range"
            grade_name = body["prediction"]["grade_name"]
            assert grade_name in ["No DR", "Mild NPDR", "Moderate NPDR", "Severe NPDR", "Proliferative DR"], \
                f"Unexpected grade name: {grade_name}"
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
    test_bayesian_uncertainty_estimator_mc_dropout()
    print("Passed: test_bayesian_uncertainty_estimator_mc_dropout")
    test_uncertainty_safety_gate_threshold_trigger()
    print("Passed: test_uncertainty_safety_gate_threshold_trigger")
    test_inference_pipeline_execution()
    print("Passed: test_inference_pipeline_execution")
    test_gradcam_explainability_5class()
    print("Passed: test_gradcam_explainability_5class")
    test_lesion_segmentation_opencv_pipeline()
    print("Passed: test_lesion_segmentation_opencv_pipeline")
    test_gradcam_url_in_screening_response()
    print("Passed: test_gradcam_url_in_screening_response")
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
    print("\n>>> ALL 17 INTEGRATION, GRAD-CAM & BAYESIAN TESTS PASSED 100% CLEANLY! <<<")
