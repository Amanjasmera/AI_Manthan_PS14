import os
from pathlib import Path

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
REPORT_DIR = BASE_DIR / "reports"
DATA_DIR = BASE_DIR / "data"
EXPORT_DIR = BASE_DIR / "exports"

# Ensure runtime directories exist
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
REPORT_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)
EXPORT_DIR.mkdir(parents=True, exist_ok=True)

# Database
DATABASE_URL = f"sqlite:///{DATA_DIR / 'retinavision.db'}"

# Preprocessing & Image Quality Thresholds
IMAGE_SIZE = (512, 512)
IQA_BLUR_THRESHOLD = 80.0         # Laplacian variance below this flags motion/optical blur
IQA_MIN_LUMINANCE = 22.0          # Below this is severely underexposed
IQA_MAX_LUMINANCE = 230.0         # Above this is washed out / overexposed
IQA_MIN_CONTRAST = 18.0           # Minimum standard deviation of intensity

# Model & Provenance configuration
MODEL_BACKBONE = "EfficientNet-B0"
MODEL_WEIGHTS_PATH = DATA_DIR / "weights" / "efficientnet_b0_aptos.pth"
DEVICE = "cpu"  # Portable across low-cost clinic workstations

# Triage & ICDR severity levels
ICDR_CLASSES = {
    0: {"name": "No DR", "hindi": "कोई डायबिटिक रेटिनोपैथी नहीं", "urgency": "ROUTINE", "risk": "Low"},
    1: {"name": "Mild NPDR", "hindi": "हल्का गैर-प्रोलिफेरेटिव डीआर", "urgency": "ROUTINE", "risk": "Mild"},
    2: {"name": "Moderate NPDR", "hindi": "मध्यम गैर-प्रोलिफेरेटिव डीआर", "urgency": "NON_URGENT", "risk": "Moderate"},
    3: {"name": "Severe NPDR", "hindi": "गंभीर गैर-प्रोलिफेरेटिव डीआर", "urgency": "URGENT", "risk": "High"},
    4: {"name": "Proliferative DR", "hindi": "प्रोलिफेरेटिव डायबिटिक रेटिनोपैथी (उच्च जोखिम)", "urgency": "URGENT", "risk": "Critical"}
}
