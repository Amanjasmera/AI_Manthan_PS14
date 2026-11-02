from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from app.database import engine, Base, init_db
from app.config import UPLOAD_DIR, REPORT_DIR
from app.api.routes_screenings import router as screenings_router
from app.api.routes_doctor import router as doctor_router
from app.api.routes_health import router as health_router
from app.api.routes_auth import router as auth_router
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
app.include_router(auth_router, prefix="/api/v1")
app.include_router(reviews_router, prefix="/api/v1")

# Static frontend assets directory
STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
if not STATIC_DIR.exists():
    STATIC_DIR = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"

# Mount static asset folders if present
if (STATIC_DIR / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(STATIC_DIR / "assets")), name="assets")

if (STATIC_DIR / "samples").exists():
    app.mount("/samples", StaticFiles(directory=str(STATIC_DIR / "samples")), name="samples")


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


@app.get("/prototype", response_class=FileResponse, summary="Serve NETRA X 3D Screening Prototype")
@app.get("/prototype.html", response_class=FileResponse, include_in_schema=False)
def serve_prototype():
    """Serves the NETRA X 3D Retinal Screening Prototype HTML."""
    candidates = [
        STATIC_DIR / "final_ui.html",
        STATIC_DIR / "prototype.html",
        Path(__file__).resolve().parent.parent.parent / "final_ui.html",
        Path(__file__).resolve().parent.parent.parent / "final UI",
    ]
    for p in candidates:
        if p.exists():
            return FileResponse(str(p), media_type="text/html")
    raise HTTPException(status_code=404, detail="Prototype file not found.")


@app.get("/app", response_class=FileResponse, summary="Serve NETRA X Diagnostic Studio App")
@app.get("/studio", response_class=FileResponse, summary="Serve NETRA X Diagnostic Studio App")
def serve_app():
    """Serves the NETRA X React application (Diagnostic Studio)."""
    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file), media_type="text/html")
    raise HTTPException(status_code=404, detail="App bundle not found.")


@app.get("/", response_class=FileResponse, summary="Serve NETRA X Main Landing Page")
def serve_root():
    """Serves the NETRA X 3D Landing Page with direct link to /app."""
    prototype_file = STATIC_DIR / "final_ui.html"
    if prototype_file.exists():
        return FileResponse(str(prototype_file), media_type="text/html")
    return serve_prototype()


@app.get("/{full_path:path}", include_in_schema=False)
def serve_spa(full_path: str):
    """Fallback handler for React SPA routing and other static assets."""
    if full_path in ("prototype", "prototype.html", "final_ui.html"):
        return serve_prototype()

    if full_path in ("app", "studio"):
        return serve_app()

    file_candidate = STATIC_DIR / full_path
    if file_candidate.is_file():
        return FileResponse(str(file_candidate))

    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file), media_type="text/html")
    raise HTTPException(status_code=404, detail="Not Found")
