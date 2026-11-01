from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from app.database import engine, Base, init_db
from app.config import UPLOAD_DIR, REPORT_DIR
from app.api.routes_screenings import router as screenings_router
from app.api.routes_doctor import router as doctor_router
from app.api.routes_health import router as health_router
from app.routers.reviews import router as reviews_router

# Initialize SQLite database tables
init_db()

app = FastAPI(
    title="RetinaVision-AI Diagnostic API",
    description="Automated AI-assisted Retinal Microvasculature Screening & Decision Support System (ICDR 5-Grade Standard)",
    version="1.0.0"
)

# CORS configuration for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers under /api/v1 prefix
app.include_router(screenings_router, prefix="/api/v1")
app.include_router(doctor_router, prefix="/api/v1")
app.include_router(health_router, prefix="/api/v1")
app.include_router(reviews_router, prefix="/api/v1")


@app.get("/api/v1/files/{filename}", summary="Serve uploaded images and generated overlays")
def serve_file(filename: str):
    """
    Serves retinal images, preprocessed outputs, Grad-CAM overlays,
    and lesion segmentation masks from the uploads directory.
    Sanitizes filename to prevent path traversal attacks.
    """
    safe_name = Path(filename).name
    if safe_name != filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid filename.")

    file_path = UPLOAD_DIR / safe_name
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {safe_name}")

    suffix = file_path.suffix.lower()
    mime_map = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".tiff": "image/tiff",
        ".tif": "image/tiff",
        ".bmp": "image/bmp",
    }
    media_type = mime_map.get(suffix, "application/octet-stream")
    return FileResponse(str(file_path), media_type=media_type)


@app.get("/")
def root():
    return {
        "app": "RetinaVision-AI",
        "docs_url": "/docs",
        "api_v1": "/api/v1/health",
        "prototype_3d": "/prototype"
    }


@app.get("/prototype", response_class=FileResponse, summary="Serve NETRA X 3D Screening Prototype")
def serve_prototype():
    """Serves the NETRA X 3D Retinal Screening Prototype HTML."""
    prototype_path = Path(__file__).resolve().parent.parent.parent / "final_ui.html"
    if not prototype_path.exists():
        prototype_path = Path(__file__).resolve().parent.parent.parent / "final UI"
    if prototype_path.exists():
        return FileResponse(str(prototype_path), media_type="text/html")
    raise HTTPException(status_code=404, detail="Prototype file not found.")
