import uuid
import cv2
import numpy as np
from pathlib import Path
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.config import UPLOAD_DIR
from app.models import Patient, Screening, Prediction, Lesion, AuditLog, DoctorReview, ActiveLearningLog
from app.core.iqa import ImageQualityAssessor
from app.core.preprocessor import RetinalPreprocessor
from app.core.classifier import DiabeticRetinopathyClassifier, ModelStatus
from app.core.gradcam import generate_gradcam_visuals
from app.core.lesion_detector import MicrovasculatureLesionDetector
from app.core.triage import get_triage_info, get_iqa_rejection_triage
from app.core.report_generator import PDFReportGenerator

class ScreeningService:
    def __init__(self):
        self.classifier = DiabeticRetinopathyClassifier()

    def process_screening(
        self,
        db: Session,
        image_bytes: bytes,
        patient_name: str,
        age: int,
        gender: str,
        eye_side: str = "RIGHT",
        diabetes_history: str = "Type 2 Diabetes"
    ) -> Dict[str, Any]:
        screening_id = str(uuid.uuid4())

        # 1. Decode image bytes to OpenCV BGR
        np_arr = np.frombuffer(image_bytes, np.uint8)
        img_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if img_bgr is None:
            raise ValueError("Invalid image file format. Supported: JPG, PNG, TIFF.")

        # 2. Save raw image
        raw_filename = f"{screening_id}_raw.jpg"
        raw_path = UPLOAD_DIR / raw_filename
        cv2.imwrite(str(raw_path), img_bgr)

        # 3. Image Quality Assessment (IQA Gate)
        iqa = ImageQualityAssessor.assess_image(img_bgr)

        # 4. Create patient record
        patient = Patient(
            full_name=patient_name,
            age=age,
            gender=gender,
            diabetes_history=diabetes_history
        )
        db.add(patient)
        db.flush()

        prep_filename = f"{screening_id}_prep.jpg"
        prep_path = UPLOAD_DIR / prep_filename
        gradcam_filename = f"{screening_id}_gradcam.jpg"
        gradcam_path = UPLOAD_DIR / gradcam_filename
        mask_filename = f"{screening_id}_mask.png"
        mask_path = UPLOAD_DIR / mask_filename

        # If IQA fails: REJECT early without executing expensive model inference
        # Apply Zero-Charge Billing Protection (₹0 Charged)
        if not iqa["passed"]:
            cv2.imwrite(str(prep_path), cv2.resize(img_bgr, (512, 512)))
            empty_overlay = np.zeros((512, 512, 4), dtype=np.uint8)
            cv2.imwrite(str(mask_path), empty_overlay)

            rejection_triage = get_iqa_rejection_triage(
                error_codes=iqa.get("error_codes", []),
                feedback=iqa.get("feedback", ""),
                recapture_instructions=iqa.get("recapture_instructions", "")
            )

            screening = Screening(
                id=screening_id,
                patient_id=patient.id,
                eye_side=eye_side,
                raw_image_path=str(raw_path),
                preprocessed_image_path=str(prep_path),
                iqa_passed=False,
                iqa_error_codes=iqa["error_codes"],
                blur_score=iqa["blur_score"],
                illumination_score=iqa["illumination_score"],
                contrast_score=iqa["contrast_score"],
                fov_score=iqa.get("fov_score", 0.0),
                iqa_feedback=iqa["feedback"],
                recapture_instructions=iqa["recapture_instructions"],
                predicted_grade=None,
                grade_name="Retake Required",
                confidence=0.0,
                referral_urgency="RETAKE",
                status="IQA_RETAKE",
                billing_status="₹0 Charged — Waived by IQA Gatekeeper",
                billing_amount=0.0,
                systemic_risk=rejection_triage["systemic_risk"],
                next_screening_interval=rejection_triage["next_interval"]
            )
            db.add(screening)

            audit = AuditLog(
                screening_id=screening_id,
                event_type="IQA_REJECTION",
                details=f"Quality gate rejected image: {iqa['error_codes']}. Waived billing (₹0 charged)."
            )
            db.add(audit)
            db.commit()

            # Generate rejection PDF report with billing waiver status
            report_data = {
                "id": screening_id,
                "patient": {
                    "full_name": patient.full_name,
                    "age": patient.age,
                    "gender": patient.gender,
                    "diabetes_history": patient.diabetes_history
                },
                "eye_side": eye_side,
                "iqa": iqa,
                "raw_image_path": str(raw_path),
                "preprocessed_image_path": str(prep_path),
                "prediction": None,
                "lesions": {},
                "status": screening.status,
                "referral_urgency": "RETAKE",
                "billing_status": "₹0 Charged — Waived by IQA Gatekeeper",
                "systemic_risk": rejection_triage["systemic_risk"],
                "next_screening_interval": rejection_triage["next_interval"]
            }
            PDFReportGenerator.generate_report(report_data)

            return self.get_screening_dict(db, screening_id)

        # 5. IQA Passed: Proceed with Full AI Diagnostic Pipeline
        # High-res display preprocessing (512x512)
        display_bgr = RetinalPreprocessor.process_for_display(img_bgr, target_size=(512, 512))
        cv2.imwrite(str(prep_path), display_bgr)

        # 160x160 RGB preprocessing for trained EfficientNet-B0 model
        model_rgb_160 = RetinalPreprocessor.process_for_model(img_bgr, target_size=(160, 160))

        # Lesion Segmentation: Detect Suspected Lesion Candidates
        lesion_data, overlay_bgra, combined_mask = MicrovasculatureLesionDetector.detect_lesions(display_bgr)
        cv2.imwrite(str(mask_path), overlay_bgra)

        # Deep Learning Classification (PyTorch EfficientNet-B0)
        prediction_result = self.classifier.predict(model_rgb_160, suspected_lesions=lesion_data)
        grade = prediction_result["predicted_grade"]

        # Grad-CAM Explainability on target layer
        if self.classifier.model is not None and prediction_result["is_verified_checkpoint"]:
            heatmap_rgb, overlay_rgb = generate_gradcam_visuals(
                self.classifier.model,
                model_rgb_160,
                target_dim=(512, 512),
                class_idx=grade
            )
            overlay_bgr = cv2.cvtColor(overlay_rgb, cv2.COLOR_RGB2BGR)
            cv2.imwrite(str(gradcam_path), overlay_bgr)
        else:
            # Fallback overlay
            cv2.imwrite(str(gradcam_path), display_bgr)

        # Clinical Triage Matrix
        triage = get_triage_info(grade)

        # Persist Screening Record
        screening = Screening(
            id=screening_id,
            patient_id=patient.id,
            eye_side=eye_side,
            raw_image_path=str(raw_path),
            preprocessed_image_path=str(prep_path),
            iqa_passed=True,
            iqa_error_codes=[],
            blur_score=iqa["blur_score"],
            illumination_score=iqa["illumination_score"],
            contrast_score=iqa["contrast_score"],
            fov_score=iqa.get("fov_score", 0.0),
            iqa_feedback=iqa["feedback"],
            recapture_instructions=iqa["recapture_instructions"],
            predicted_grade=grade,
            grade_name=prediction_result["grade_name"],
            confidence=prediction_result["confidence"],
            referral_urgency=triage["urgency"],
            status="ANALYZED",
            billing_status="₹25 Valid Scan",
            billing_amount=25.0,
            systemic_risk=triage["systemic_risk"],
            next_screening_interval=triage["next_interval"]
        )
        db.add(screening)
        db.flush()

        prediction = Prediction(
            screening_id=screening_id,
            predicted_grade=grade,
            grade_name=prediction_result["grade_name"],
            confidence=prediction_result["confidence"],
            class_probabilities=prediction_result["class_probabilities"],
            entropy=prediction_result["entropy"],
            confidence_interval=prediction_result["confidence_interval"],
            inference_time_ms=prediction_result["inference_time_ms"],
            temperature=prediction_result["temperature"],
            gradcam_path=str(gradcam_path),
            model_status=prediction_result["model_status"],
            model_provenance=prediction_result["model_provenance"],
            is_verified_checkpoint=prediction_result["is_verified_checkpoint"]
        )
        db.add(prediction)

        lesion_record = Lesion(
            screening_id=screening_id,
            microaneurysm_count=lesion_data["microaneurysms"],
            hemorrhage_count=lesion_data["hemorrhages"],
            hard_exudate_count=lesion_data["hard_exudates"],
            soft_exudate_count=lesion_data["soft_exudates"],
            mask_url=f"/api/v1/files/{mask_filename}",
            mask_path=str(mask_path),
            classification_note=lesion_data["classification_note"],
            method=lesion_data["method"],
            is_verified_model=lesion_data["is_verified_model"]
        )
        db.add(lesion_record)

        audit = AuditLog(
            screening_id=screening_id,
            event_type="SCREENING_COMPLETE",
            details=f"Analyzed in {prediction_result['inference_time_ms']}ms: Grade {grade} ({prediction_result['grade_name']}). Billed ₹25."
        )
        db.add(audit)

        db.commit()
        db.refresh(screening)

        # Generate Bilingual PDF Report
        report_data = {
            "id": screening_id,
            "patient": {
                "full_name": patient.full_name,
                "age": patient.age,
                "gender": patient.gender,
                "diabetes_history": patient.diabetes_history
            },
            "eye_side": eye_side,
            "iqa": iqa,
            "raw_image_path": str(raw_path),
            "preprocessed_image_path": str(prep_path),
            "prediction": prediction_result,
            "lesions": lesion_data,
            "status": screening.status,
            "referral_urgency": screening.referral_urgency,
            "billing_status": "₹25 Valid Scan",
            "systemic_risk": triage["systemic_risk"],
            "next_screening_interval": triage["next_interval"]
        }
        PDFReportGenerator.generate_report(report_data)

        return self.get_screening_dict(db, screening_id)

    @staticmethod
    def get_screening_dict(db: Session, screening_id: str) -> Optional[Dict[str, Any]]:
        screening = db.query(Screening).filter(Screening.id == screening_id).first()
        if not screening:
            return None

        p = screening.patient
        pred = screening.prediction
        lesions = screening.lesion
        doctor = screening.doctor_review

        # Resolve clinical triage & risk
        if not screening.iqa_passed:
            triage = get_iqa_rejection_triage(
                error_codes=screening.iqa_error_codes or [],
                feedback=screening.iqa_feedback or "",
                recapture_instructions=screening.recapture_instructions or ""
            )
        else:
            current_grade = doctor.confirmed_grade if doctor else (screening.predicted_grade if screening.predicted_grade is not None else 0)
            triage = get_triage_info(current_grade)

        billing_status = screening.billing_status or ("₹0 Charged — Waived by IQA Gatekeeper" if not screening.iqa_passed else "₹25 Valid Scan")
        billing_amount = screening.billing_amount if screening.billing_amount is not None else (0.0 if not screening.iqa_passed else 25.0)
        commercial_tier = "Tier 1: Free Automated Quality Pre-Screening (Zero-Charge Protection)" if not screening.iqa_passed else "Tier 2: Primary Valid Diagnostic Tele-Ophthalmology Scan"
        systemic_risk = screening.systemic_risk or triage["systemic_risk"]
        next_screening_interval = screening.next_screening_interval or triage["next_interval"]

        return {
            "id": screening.id,
            "patient": {
                "id": p.id,
                "full_name": p.full_name,
                "age": p.age,
                "gender": p.gender,
                "diabetes_history": p.diabetes_history,
                "created_at": p.created_at.isoformat()
            },
            "eye_side": screening.eye_side,
            "raw_image_url": f"/api/v1/files/{Path(screening.raw_image_path).name}",
            "preprocessed_image_url": f"/api/v1/files/{Path(screening.preprocessed_image_path).name}" if screening.preprocessed_image_path else None,
            "iqa": {
                "passed": screening.iqa_passed,
                "error_codes": screening.iqa_error_codes or [],
                "blur_score": screening.blur_score,
                "illumination_score": screening.illumination_score,
                "contrast_score": screening.contrast_score,
                "fov_score": screening.fov_score,
                "feedback": screening.iqa_feedback,
                "recapture_instructions": screening.recapture_instructions
            },
            "prediction": {
                "predicted_grade": pred.predicted_grade if pred else (screening.predicted_grade if screening.predicted_grade is not None else 0),
                "grade_name": pred.grade_name if pred else (screening.grade_name or "N/A"),
                "confidence": pred.confidence if pred else (screening.confidence or 0.0),
                "class_probabilities": pred.class_probabilities if pred else {},
                "entropy": pred.entropy if pred else 0.0,
                "confidence_interval": pred.confidence_interval if pred else None,
                "inference_time_ms": pred.inference_time_ms if pred else 0.0,
                "temperature": pred.temperature if pred else 1.0,
                "gradcam_url": f"/api/v1/files/{Path(pred.gradcam_path).name}" if pred and pred.gradcam_path else None,
                "model_status": pred.model_status if pred else "MODEL_UNAVAILABLE",
                "model_provenance": pred.model_provenance if pred else "EfficientNet-B0 (APTOS 2019 / Indore Hub v2)",
                "is_verified_checkpoint": pred.is_verified_checkpoint if pred else False
            } if pred else None,
            "lesions": {
                "microaneurysm_count": lesions.microaneurysm_count if lesions else 0,
                "hemorrhage_count": lesions.hemorrhage_count if lesions else 0,
                "hard_exudate_count": lesions.hard_exudate_count if lesions else 0,
                "soft_exudate_count": lesions.soft_exudate_count if lesions else 0,
                "mask_url": lesions.mask_url or (f"/api/v1/files/{Path(lesions.mask_path).name}" if lesions and lesions.mask_path else None),
                "classification_note": lesions.classification_note if lesions else "Suspected lesion candidates",
                "method": lesions.method if lesions else "OPENCV_MORPHOLOGICAL_FALLBACK",
                "is_verified_model": lesions.is_verified_model if lesions else False
            } if lesions else None,
            "doctor_review": {
                "id": doctor.id,
                "doctor_name": doctor.doctor_name,
                "doctor_license": doctor.doctor_license,
                "confirmed_grade": doctor.confirmed_grade,
                "was_overridden": doctor.was_overridden,
                "referral_recommendation": doctor.referral_recommendation,
                "clinical_notes": doctor.clinical_notes,
                "reviewed_at": doctor.reviewed_at.isoformat()
            } if doctor else None,
            "referral_urgency": screening.referral_urgency,
            "status": screening.status,
            "created_at": screening.created_at.isoformat(),
            "report_pdf_url": f"/api/v1/screenings/{screening.id}/report.pdf",
            "billing_status": billing_status,
            "billing_amount": billing_amount,
            "commercial_tier": commercial_tier,
            "systemic_risk": systemic_risk,
            "next_screening_interval": next_screening_interval,
            "bilingual_explanation": {
                "en": triage.get("patient_explanation_en", ""),
                "hi": triage.get("patient_explanation_hi", "")
            }
        }
