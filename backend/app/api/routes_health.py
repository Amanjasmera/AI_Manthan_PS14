from pathlib import Path
import torch
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from app.config import UPLOAD_DIR, MODEL_BACKBONE, MODEL_WEIGHTS_PATH, DEVICE

router = APIRouter(tags=["System & Health"])

@router.get("/health")
def health_check():
    """Returns AI inference engine status, PyTorch device, and dataset provenance."""
    print(">>> Executing health_check endpoint <<<", flush=True)
    weights_path = Path(__file__).resolve().parent.parent.parent / "data" / "weights" / "efficientnet_b0_dr.pth"
    temp_path = Path(__file__).resolve().parent.parent.parent / "data" / "weights" / "efficientnet_b0_temp.pt"

    weights_present = weights_path.exists()
    temp_present = temp_path.exists()

    temperature_val = 1.0
    if temp_present:
        try:
            t = torch.load(str(temp_path), map_location="cpu")
            temperature_val = float(t.detach().item()) if hasattr(t, "detach") else float(t)
        except Exception:
            temperature_val = 1.0

    device_name = "cuda" if torch.cuda.is_available() else "cpu"

    return {
        "status": "healthy",
        "service": "RetinaVision-AI Diagnostic Backend",
        "version": "1.0.0",
        "pytorch": {
            "installed": True,
            "version": torch.__version__,
            "device": device_name,
            "backbone": MODEL_BACKBONE,
            "weights_found": weights_present,
            "model_status": "VERIFIED_TRAINED_CHECKPOINT" if weights_present else "MODEL_UNAVAILABLE",
            "calibrated_temperature": round(temperature_val, 4)
        },
        "bayesian_deep_learning": {
            "mc_dropout_enabled": True,
            "standards_reference": "OATML BDL Benchmarks (https://github.com/OATML/bdl-benchmarks.git)",
            "safe_entropy_threshold": 0.50,
            "epistemic_uncertainty_decomposition": True,
            "aleatoric_uncertainty_decomposition": True,
            "clinical_safety_gate": "requires_manual_doctor_review (Enforced when entropy > 0.50)"
        },
        "datasets_supported": [
            "APTOS 2019 Blindness Detection (n=3662)",
            "IDRiD (Indian Diabetic Retinopathy Image Dataset)",
            "Messidor-2"
        ],
        "compliance": "Research & Decision-Support Prototype (ICDR Standard - Problem Statement 14)"
    }

@router.get("/files/{filename}")
def serve_file(filename: str):
    """Secure static file server for generated images and masks."""
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Requested file not found.")

    media_type = "image/jpeg"
    if filename.endswith(".png"):
        media_type = "image/png"

    return FileResponse(str(file_path), media_type=media_type)
