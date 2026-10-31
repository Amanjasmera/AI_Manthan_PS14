# RetinaVision-AI: AI-Assisted Diabetic Retinopathy Screening & Microvasculature Decision Support

**Hackathon Problem Statement**: Problem Statement 14 — *AI-Assisted Retinal Microvasculature Diagnostics and Diabetic Retinopathy Screening* (AI Manthan 2.0, Acropolis Institute of Technology and Research)  
**Primary Research Reference**: *DR Screen: Challenges, Real-World Impact and Why a Web/App Solution*  
**Clinical Protocol**: International Clinical Diabetic Retinopathy (ICDR) 5-Grade Scale (Grade 0 to Grade 4)  
**Safety Classification**: Research Prototype / Clinical Decision Support (CDS) — Not certified as an autonomous diagnostic device.  
**Repository**: [https://github.com/Amanjasmera/AI_Manthan_PS14.git](https://github.com/Amanjasmera/AI_Manthan_PS14.git)

---

## 1. Executive Summary

Diabetic Retinopathy (DR) affects approximately 12–17% of India's 74+ million diabetic adult population. Early microvascular detection prevents permanent vision loss, but the primary bottleneck is access to specialist screening in rural Primary Health Centers (PHCs) and community screening camps.

**RetinaVision-AI** is a clinical-grade, full-stack decision-support platform that transforms raw retinal fundus photographs into explainable, triaged diagnostic outputs:
1. **Automated Image Quality Assessment (IQA Gatekeeper)** via OpenCV before executing compute-intensive models.
2. **Zero-Charge IQA Billing Protection (3-Tier Commercial Model)**: Automatically waives screening fee (**₹0 Charged — Waived by IQA Gatekeeper**) on blurry, underexposed, or non-retinal images, while billing **₹25 Valid Scan** only upon successful clinical acquisition.
3. **Ben Graham Color Equalization & CLAHE** to handle varied non-mydriatic camera lighting and ethnic pigmentation differences.
4. **5-Class ICDR Severity Grading** (No DR, Mild NPDR, Moderate NPDR, Severe NPDR, Proliferative DR) powered by PyTorch EfficientNet-B0 with temperature calibration.
5. **Microvasculature Lesion Segmentation** quantifying Microaneurysms (MAs), Intraretinal Hemorrhages (HE), and Hard/Soft Exudates (EX).
6. **Grad-CAM Saliency Heatmaps** providing visual explainability directly overlaid with adjustable opacity.
7. **Bilingual Clinical PDF Reports** generated in **Hindi and English** with systemic risk stratification, next screening interval, and triage priority.
8. **Doctor Review & Active Learning Pipeline**: Clinicians can confirm or override grades with license tracking, which automatically logs into the `active_learning_logs` table (tagged `Indore_Hub_v2`) to bridge the domain gap between legacy APTOS 2019 data and real-world clinical data.

---

## 2. Technology Stack & Architecture

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts.
- **Backend**: Python 3.11+, FastAPI, Uvicorn, SQLite, SQLAlchemy ORM.
- **Computer Vision**: OpenCV (Laplacian variance, morphology top/bottom-hat transforms, CLAHE).
- **Deep Learning**: PyTorch (CPU-optimized edge deployment, EfficientNet-B0 backbone with calibrated temperature scaling).
- **Reporting Engine**: ReportLab (medical-grade bilingual PDF generation with Devanagari Hindi font support).

---

## 3. Production Database Architecture (`database.py` / `models.py`)

The SQLite database implements five structured tables:
1. `patients`: `id`, `full_name`, `age`, `gender`, `diabetes_history`, `created_at`.
2. `screenings`: `id`, `patient_id`, `eye_side`, `raw_image_path`, `preprocessed_image_path`, `iqa_passed`, `blur_score`, `illumination_score`, `contrast_score`, `predicted_grade`, `grade_name`, `confidence`, `referral_urgency`, `status`, `created_at`.
3. `lesions`: `screening_id`, `microaneurysm_count`, `hemorrhage_count`, `hard_exudate_count`, `soft_exudate_count`, `mask_url`.
4. `doctor_reviews`: `screening_id`, `doctor_name`, `doctor_license`, `confirmed_grade`, `was_overridden`, `referral_recommendation`, `clinical_notes`, `reviewed_at`.
5. `active_learning_logs`: `screening_id`, `verified_label`, `dataset_tag` ("Indore_Hub_v2"), `updated_at`.

---

## 4. 3-Tier Commercial Model & IQA Billing Protection

| Tier | Name | Cost (INR) | Gatekeeper Condition |
| :--- | :--- | :--- | :--- |
| **Tier 1** | **Free Automated Quality Triage** | **₹0** | Triggered on blurry, dark, or non-retinal images (`iqa_passed = False`). Fee waived by IQA Gatekeeper. |
| **Tier 2** | **Valid Diagnostic Tele-Screening** | **₹25** | Charged upon passing IQA with full 5-class grading, lesion analysis, and bilingual report. |
| **Tier 3** | **Specialist Tele-Consultation** | **₹150** | Optional tele-ophthalmology second opinion review and prescription referral. |

---

## 5. Quickstart: Running the Application Locally

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm

### 5.1 One-Click Launcher (Windows)
Double-click `start.bat` in the root folder, which starts both backend and frontend services simultaneously.

### 5.2 Manual Backend Execution
```bash
# Navigate to backend directory
cd backend

# Install dependencies
python -m pip install -r requirements.txt

# Run FastAPI backend on port 8000
python run_backend.py
```
- API Docs (Swagger): `http://localhost:8000/docs`
- Health Endpoint: `http://localhost:8000/api/v1/health`

### 5.3 Manual Frontend Execution
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite development server (port 5173 with proxy to backend port 8000)
npm run dev
```
- Web Application: `http://localhost:5173`

### 5.4 Running Integration Tests
```bash
python backend/tests/test_api_integration.py
```

---

## 6. Strict Model Honesty Protocol

RetinaVision-AI explicitly rejects fake diagnostics:
- Every prediction exposes its **Provenance & Checkpoint Verification Status**.
- When deep learning weights are present, full convolution inference is executed.
- When unverified baseline weights are active, predictions are explicitly derived from quantified microvascular morphology under ICDR rules and clearly flagged in the UI.
- All reports feature an explicit medical disclaimer confirming this is a clinical decision-support research prototype under AI Manthan 2.0 (Problem Statement 14).
