import cv2
import numpy as np
from pathlib import Path
from app.config import UPLOAD_DIR
from app.database import SessionLocal, init_db
from app.models import Screening, Patient
from app.services.screening_service import ScreeningService

def create_synthetic_retina_image(
    filename: str,
    grade: int = 0,
    is_blurry: bool = False,
    is_underexposed: bool = False
) -> Path:
    """
    Generates an anatomically structured synthetic retinal fundus photograph
    featuring optic disc, fovea, retinal vascular tree, and grade-specific lesions.
    """
    size = (512, 512)
    h, w = size
    
    # 1. Background Canvas
    img = np.zeros((h, w, 3), dtype=np.uint8)
    
    # 2. Retinal Orange-Red Disc
    center = (w // 2, h // 2)
    radius = int(w * 0.44)
    
    # Gradient fundus background (dark red/orange)
    for r in range(radius, 0, -2):
        factor = r / radius
        # BGR
        color = (
            int(15 * factor + 10), 
            int(65 * factor + 40), 
            int(175 * factor + 80)
        )
        cv2.circle(img, center, r, color, -1)

    # 3. Optic Disc (Bright yellowish circle at nasal position)
    optic_center = (int(w * 0.32), int(h * 0.50))
    optic_radius = int(w * 0.08)
    cv2.circle(img, optic_center, optic_radius, (120, 210, 245), -1)
    # Inner cup
    cv2.circle(img, optic_center, int(optic_radius * 0.45), (160, 230, 255), -1)

    # 4. Macula & Fovea (Darker avascular zone at temporal position)
    fovea_center = (int(w * 0.65), int(h * 0.52))
    cv2.circle(img, fovea_center, int(w * 0.05), (10, 45, 140), -1)

    # 5. Major Retinal Vascular Arcades (Blood vessels radiating from optic disc)
    vessel_color = (15, 25, 110) # Dark red / burgundy
    # Superior arcade
    cv2.ellipse(img, (int(w * 0.45), int(h * 0.40)), (int(w * 0.25), int(h * 0.20)), 15, 180, 360, vessel_color, 4)
    # Inferior arcade
    cv2.ellipse(img, (int(w * 0.45), int(h * 0.60)), (int(w * 0.25), int(h * 0.20)), -15, 0, 180, vessel_color, 4)
    # Smaller branches
    cv2.ellipse(img, (int(w * 0.55), int(h * 0.35)), (int(w * 0.15), int(h * 0.10)), 25, 180, 340, vessel_color, 2)
    cv2.ellipse(img, (int(w * 0.55), int(h * 0.65)), (int(w * 0.15), int(h * 0.10)), -25, 20, 180, vessel_color, 2)

    # 6. Inject Clinical Lesions based on DR Grade
    np.random.seed(42 + grade)
    
    if grade >= 1:
        # Microaneurysms: Tiny deep-red dots (2-4 px)
        num_ma = 4 if grade == 1 else (12 if grade == 2 else 25)
        for _ in range(num_ma):
            offset_x = int(np.random.normal(fovea_center[0], 60))
            offset_y = int(np.random.normal(fovea_center[1], 60))
            if np.hypot(offset_x - center[0], offset_y - center[1]) < radius - 20:
                cv2.circle(img, (offset_x, offset_y), 2, (10, 15, 90), -1)

    if grade >= 2:
        # Hemorrhages: Blot / flame dark red lesions (5-12 px)
        num_he = 3 if grade == 2 else (8 if grade == 3 else 18)
        for _ in range(num_he):
            hx = int(np.random.normal(center[0], 80))
            hy = int(np.random.normal(center[1], 80))
            if np.hypot(hx - center[0], hy - center[1]) < radius - 30:
                cv2.ellipse(img, (hx, hy), (np.random.randint(4, 9), np.random.randint(2, 6)), np.random.randint(0, 180), 0, 360, (5, 10, 85), -1)

        # Hard Exudates: Yellowish shiny lipid deposits
        num_ex = 4 if grade == 2 else (14 if grade == 3 else 22)
        for _ in range(num_ex):
            ex_x = int(np.random.normal(fovea_center[0] - 30, 40))
            ex_y = int(np.random.normal(fovea_center[1], 40))
            if np.hypot(ex_x - center[0], ex_y - center[1]) < radius - 30:
                cv2.circle(img, (ex_x, ex_y), np.random.randint(2, 5), (40, 210, 240), -1)

    if grade >= 4:
        # Neovascularization (tangle of fine, friable, abnormal vessels)
        for _ in range(6):
            pt1 = (int(optic_center[0] + np.random.randint(-20, 20)), int(optic_center[1] + np.random.randint(-20, 20)))
            pt2 = (int(pt1[0] + np.random.randint(-35, 35)), int(pt1[1] + np.random.randint(-35, 35)))
            cv2.line(img, pt1, pt2, (10, 10, 130), 2)

    # 7. Quality Degenerations (Blur or Underexposure)
    if is_blurry:
        img = cv2.GaussianBlur(img, (27, 27), 0)

    if is_underexposed:
        img = (img * 0.15).astype(np.uint8)

    output_path = UPLOAD_DIR / filename
    cv2.imwrite(str(output_path), img)
    return output_path


def generate_sample_cases_if_empty():
    """Initializes sample database cases with both normal and pathological examples."""
    init_db()
    db = SessionLocal()
    try:
        count = db.query(Screening).count()
        if count > 0:
            return  # Already populated

        service = ScreeningService()

        sample_cases = [
            {
                "file": "sample_normal_grade0.jpg",
                "grade": 0,
                "name": "Rajesh Sharma",
                "age": 48,
                "gender": "Male",
                "eye": "RIGHT",
                "history": "Type 2 Diabetes (3 years, controlled)"
            },
            {
                "file": "sample_mild_grade1.jpg",
                "grade": 1,
                "name": "Sunita Verma",
                "age": 56,
                "gender": "Female",
                "eye": "LEFT",
                "history": "Type 2 Diabetes (7 years, HbA1c 7.6%)"
            },
            {
                "file": "sample_moderate_grade2.jpg",
                "grade": 2,
                "name": "Mohammad Ali",
                "age": 62,
                "gender": "Male",
                "eye": "RIGHT",
                "history": "Type 2 Diabetes (12 years, Hypertension)"
            },
            {
                "file": "sample_severe_grade3.jpg",
                "grade": 3,
                "name": "Anita Devi",
                "age": 68,
                "gender": "Female",
                "eye": "LEFT",
                "history": "Type 2 Diabetes (15 years, erratic glycemic control)"
            },
            {
                "file": "sample_proliferative_grade4.jpg",
                "grade": 4,
                "name": "Kailash Chand",
                "age": 71,
                "gender": "Male",
                "eye": "RIGHT",
                "history": "Type 2 Diabetes (20 years, nephropathy, low vision)"
            },
            {
                "file": "sample_blurry_fail.jpg",
                "grade": 1,
                "is_blurry": True,
                "name": "Vikram Patel",
                "age": 52,
                "gender": "Male",
                "eye": "RIGHT",
                "history": "Type 2 Diabetes (5 years)"
            }
        ]

        for case in sample_cases:
            img_path = create_synthetic_retina_image(
                filename=case["file"],
                grade=case["grade"],
                is_blurry=case.get("is_blurry", False),
                is_underexposed=case.get("is_underexposed", False)
            )
            with open(img_path, "rb") as f:
                img_bytes = f.read()

            service.process_screening(
                db=db,
                image_bytes=img_bytes,
                patient_name=case["name"],
                age=case["age"],
                gender=case["gender"],
                eye_side=case["eye"],
                diabetes_history=case["history"]
            )
        print("Successfully pre-seeded 6 representative benchmark screening cases.")
    except Exception as e:
        print(f"Sample data generation notice: {e}")
    finally:
        db.close()
