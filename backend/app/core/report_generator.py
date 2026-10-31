import os
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any, Union

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, KeepTogether, HRFlowable
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

from app.config import REPORT_DIR
from app.core.triage import get_triage_info, get_iqa_rejection_triage

# Register Unicode fonts for Devanagari Hindi if available on system
HINDI_FONT = "Helvetica"
HINDI_FONT_BOLD = "Helvetica-Bold"

try:
    nirmala_path = Path("C:/Windows/Fonts/Nirmala.ttc")
    if nirmala_path.exists():
        pdfmetrics.registerFont(TTFont("Nirmala", str(nirmala_path), subfontIndex=0))
        HINDI_FONT = "Nirmala"
        HINDI_FONT_BOLD = "Nirmala"
    elif Path("C:/Windows/Fonts/arial.ttf").exists():
        pdfmetrics.registerFont(TTFont("Arial", "C:/Windows/Fonts/arial.ttf"))
        pdfmetrics.registerFont(TTFont("Arial-Bold", "C:/Windows/Fonts/arialbd.ttf"))
        HINDI_FONT = "Arial"
        HINDI_FONT_BOLD = "Arial-Bold"
except Exception as font_err:
    print(f"Notice: Unicode font registration fallback to Helvetica ({font_err})")


class PDFReportGenerator:
    """
    Medical-grade Bilingual (English & Hindi) PDF Screening Report Generator.
    Supports pulling structured data directly from SQLite DB or from dictionary.
    Includes:
      - Systemic Risk Stratification & Next Screening Interval
      - 3-Tier Commercial Model & IQA Billing Protection Status
      - Bilingual (English + Hindi) patient explanations
      - Suspected microvascular lesions & multi-modal explainability maps
    """

    @classmethod
    def generate_report(
        cls,
        screening_data_or_id: Union[dict, str],
        output_filename: Optional[str] = None,
        db=None
    ) -> str:
        """
        Generates clinical PDF report.
        If screening_data_or_id is a string ID and db is provided (or if db is passed),
        it pulls structured data directly from the SQLite database.
        """
        # 1. Resolve structured data
        if isinstance(screening_data_or_id, str):
            screening_id = screening_data_or_id
            if db is not None:
                from app.services.screening_service import ScreeningService
                screening_data = ScreeningService.get_screening_dict(db, screening_id)
                if not screening_data:
                    raise ValueError(f"Screening record {screening_id} not found in database.")
            else:
                from app.database import SessionLocal
                from app.services.screening_service import ScreeningService
                local_db = SessionLocal()
                try:
                    screening_data = ScreeningService.get_screening_dict(local_db, screening_id)
                    if not screening_data:
                        raise ValueError(f"Screening record {screening_id} not found in database.")
                finally:
                    local_db.close()
        else:
            screening_data = screening_data_or_id
            screening_id = screening_data.get("id", "SCREENING-001")

        if output_filename is None:
            output_filename = f"RetinaVision_Report_{screening_id}.pdf"

        pdf_path = REPORT_DIR / output_filename

        doc = SimpleDocTemplate(
            str(pdf_path),
            pagesize=letter,
            rightMargin=32,
            leftMargin=32,
            topMargin=32,
            bottomMargin=32
        )

        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            "DocTitle",
            parent=styles["Heading1"],
            fontSize=17,
            leading=21,
            textColor=colors.HexColor("#0D9488"),
            fontName="Helvetica-Bold",
            alignment=0
        )

        subtitle_style = ParagraphStyle(
            "DocSubTitle",
            parent=styles["Normal"],
            fontSize=8.5,
            leading=12,
            textColor=colors.HexColor("#475569"),
            fontName="Helvetica"
        )

        section_heading = ParagraphStyle(
            "SectionHeading",
            parent=styles["Heading2"],
            fontSize=10.5,
            leading=14,
            textColor=colors.HexColor("#0F172A"),
            fontName="Helvetica-Bold",
            spaceAfter=4
        )

        body_style = ParagraphStyle(
            "Body",
            parent=styles["Normal"],
            fontSize=8,
            leading=11,
            textColor=colors.HexColor("#1E293B"),
            fontName="Helvetica"
        )

        hindi_style = ParagraphStyle(
            "BodyHindi",
            parent=styles["Normal"],
            fontSize=8,
            leading=11,
            textColor=colors.HexColor("#1E293B"),
            fontName=HINDI_FONT
        )

        bold_style = ParagraphStyle(
            "BodyBold",
            parent=body_style,
            fontName="Helvetica-Bold"
        )

        disclaimer_style = ParagraphStyle(
            "Disclaimer",
            parent=styles["Normal"],
            fontSize=7,
            leading=9.5,
            textColor=colors.HexColor("#64748B"),
            fontName="Helvetica-Oblique",
            alignment=1
        )

        elements = []

        # =====================================================================
        # 1. HEADER BANNER & IDENTIFIERS
        # =====================================================================
        header_table = Table([
            [
                Paragraph("<b>RetinaVision-AI Tele-Ophthalmology System</b>", title_style),
                Paragraph(f"<b>Screening ID:</b> {screening_id[:16]}<br/><b>Report Date:</b> {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}", subtitle_style)
            ],
            [
                Paragraph("AI-Assisted Retinal Microvasculature Diagnostics & Decision Support", subtitle_style),
                Paragraph("<b>Benchmark:</b> AI Manthan 2.0 (Problem Statement 14) • <b>Active Hub:</b> Indore_Hub_v2", subtitle_style)
            ]
        ], colWidths=[355, 195])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ]))
        elements.append(header_table)
        elements.append(Spacer(1, 6))
        elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0D9488"), spaceAfter=8))

        # =====================================================================
        # 2. PATIENT DEMOGRAPHICS & CLINICAL CONTEXT
        # =====================================================================
        patient = screening_data.get("patient") or {}
        iqa = screening_data.get("iqa") or {}
        iqa_passed = bool(iqa.get("passed", False))

        patient_data = [
            [
                Paragraph(f"<b>Patient Name:</b> {patient.get('full_name', 'Anonymous')}", body_style),
                Paragraph(f"<b>Age / Sex:</b> {patient.get('age', 'N/A')} yrs / {patient.get('gender', 'N/A')}", body_style),
                Paragraph(f"<b>Eye Evaluated:</b> {screening_data.get('eye_side', 'RIGHT')} Eye", body_style)
            ],
            [
                Paragraph(f"<b>Diabetes History:</b> {patient.get('diabetes_history', 'Type 2 Diabetes')}", body_style),
                Paragraph(f"<b>IQA Quality Gate:</b> {'PASSED' if iqa_passed else 'REJECTED — RETAKE'}", body_style),
                Paragraph(f"<b>Sharpness / Luminance:</b> {iqa.get('blur_score', 0):.1f} / {iqa.get('illumination_score', 0):.1f}", body_style)
            ]
        ]
        patient_table = Table(patient_data, colWidths=[200, 175, 175])
        patient_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(patient_table)
        elements.append(Spacer(1, 8))

        # =====================================================================
        # 3. 3-TIER COMMERCIAL MODEL & IQA BILLING PROTECTION STATUS
        # =====================================================================
        if not iqa_passed:
            billing_text = "₹0 Charged — Waived by IQA Gatekeeper"
            tier_text = "Tier 1: Free Automated Quality Pre-Screening Gatekeeper (Zero-Charge Protection)"
            billing_bg = colors.HexColor("#ECFDF5")  # Emerald light
            billing_border = colors.HexColor("#10B981")
            billing_badge_color = colors.HexColor("#047857")
            triage = get_iqa_rejection_triage(
                error_codes=iqa.get("error_codes", []),
                feedback=iqa.get("feedback", ""),
                recapture_instructions=iqa.get("recapture_instructions", "")
            )
        else:
            billing_text = "₹25 Valid Scan"
            tier_text = "Tier 2: Primary Valid Diagnostic Tele-Ophthalmology Scan (3-Tier Scalable Rural Model)"
            billing_bg = colors.HexColor("#EFF6FF")  # Blue light
            billing_border = colors.HexColor("#3B82F6")
            billing_badge_color = colors.HexColor("#1D4ED8")
            pred = screening_data.get("prediction") or {}
            grade = pred.get("predicted_grade", 0)
            triage = get_triage_info(grade)

        commercial_box = [
            [
                Paragraph(f"<b>3-TIER COMMERCIAL MODEL STATUS:</b> {tier_text}", body_style),
                Paragraph(f"<font color='white'><b>{billing_text}</b></font>", ParagraphStyle("BillBadge", parent=bold_style, textColor=colors.white, alignment=1, fontSize=9))
            ]
        ]
        comm_table = Table(commercial_box, colWidths=[400, 150])
        comm_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, 0), billing_bg),
            ('BACKGROUND', (1, 0), (1, 0), billing_badge_color),
            ('BOX', (0, 0), (-1, -1), 0.75, billing_border),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        elements.append(comm_table)
        elements.append(Spacer(1, 8))

        # =====================================================================
        # 4. SYSTEMIC RISK STRATIFICATION & NEXT SCREENING INTERVAL
        # =====================================================================
        urgency_colors = {
            "ROUTINE": colors.HexColor("#10B981"),
            "NON_URGENT": colors.HexColor("#F59E0B"),
            "URGENT": colors.HexColor("#EA580C"),
            "CRITICAL": colors.HexColor("#DC2626"),
            "RETAKE": colors.HexColor("#64748B")
        }
        urgency_key = screening_data.get("referral_urgency", triage["urgency"])
        urgency_color = urgency_colors.get(urgency_key, colors.HexColor("#0D9488"))

        triage_box = [
            [
                Paragraph(f"<font color='white'><b>CLINICAL TRIAGE: {triage['grade_code']} — {triage['title_en'].upper()}</b></font>", ParagraphStyle("BadgeT", parent=bold_style, textColor=colors.white, fontSize=9.5)),
                Paragraph(f"<font color='white'><b>REFERRAL PROTOCOL: {triage['urgency_label_en'].upper()}</b></font>", ParagraphStyle("BadgeU", parent=bold_style, textColor=colors.white, alignment=2, fontSize=9))
            ]
        ]
        t_table = Table(triage_box, colWidths=[350, 200])
        t_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), urgency_color),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(t_table)

        # Risk Stratification & Screening Interval Table
        risk_interval_data = [
            [
                Paragraph("<b>Systemic Risk Stratification:</b>", bold_style),
                Paragraph(f"<b>{triage['systemic_risk']}</b>", body_style)
            ],
            [
                Paragraph("<b>Next Screening Interval:</b>", bold_style),
                Paragraph(f"<b>{triage['next_interval']}</b>", body_style)
            ]
        ]
        risk_table = Table(risk_interval_data, colWidths=[170, 380])
        risk_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(risk_table)
        elements.append(Spacer(1, 8))

        # =====================================================================
        # 5. BILINGUAL (ENGLISH + HINDI) PATIENT EXPLANATIONS & ACTION PLAN
        # =====================================================================
        findings_table = Table([
            [
                Paragraph("<b>Clinical Observations (English):</b><br/>" + triage["clinical_findings_en"], body_style),
                Paragraph("<b>नैदानिक विवरण (Hindi):</b><br/>" + triage["clinical_findings_hi"], hindi_style)
            ],
            [
                Paragraph("<b>Recommended Clinical Protocol:</b><br/>" + triage["action_en"], body_style),
                Paragraph("<b>अनुशंसित परामर्श (Hindi):</b><br/>" + triage["action_hi"], hindi_style)
            ],
            [
                Paragraph("<b>Patient Explanation (English):</b><br/>" + triage["patient_explanation_en"], body_style),
                Paragraph("<b>मरीज के लिए परामर्श (Hindi):</b><br/>" + triage["patient_explanation_hi"], hindi_style)
            ]
        ], colWidths=[275, 275])
        findings_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F1F5F9")),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(findings_table)
        elements.append(Spacer(1, 8))

        # =====================================================================
        # 6. MULTI-MODAL DIAGNOSTIC IMAGING & LESION MAPS
        # =====================================================================
        elements.append(Paragraph("Multi-Modal Diagnostic Imaging & Explainability Maps", section_heading))

        raw_path = screening_data.get("raw_image_path")
        prep_path = screening_data.get("preprocessed_image_path")
        pred = screening_data.get("prediction") or {}
        gradcam_path = pred.get("gradcam_path")
        mask_path = (screening_data.get("lesions") or {}).get("mask_path")

        def safe_image(path_str):
            if path_str and Path(path_str).exists():
                try:
                    return Image(str(path_str), width=125, height=125)
                except Exception:
                    pass
            return Paragraph("Image<br/>Unavailable", body_style)

        row_images = [
            safe_image(raw_path),
            safe_image(prep_path),
            safe_image(gradcam_path),
            safe_image(mask_path)
        ]
        row_labels = [
            Paragraph("<div align='center'><b>1. Raw Fundus Photo</b></div>", body_style),
            Paragraph("<div align='center'><b>2. Ben Graham CLAHE</b></div>", body_style),
            Paragraph("<div align='center'><b>3. Grad-CAM Saliency</b></div>", body_style),
            Paragraph("<div align='center'><b>4. Lesion Mask</b></div>", body_style)
        ]

        img_table = Table([row_images, row_labels], colWidths=[137, 137, 137, 137])
        img_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 2),
            ('TOPPADDING', (0, 1), (-1, 1), 2),
        ]))
        elements.append(img_table)
        elements.append(Spacer(1, 6))

        # =====================================================================
        # 7. LESION CANDIDATES & UNCERTAINTY METRICS
        # =====================================================================
        lesions = screening_data.get("lesions") or {}
        probs = pred.get("class_probabilities", {})
        prob_str = " | ".join([f"{k}: {v*100:.1f}%" for k, v in probs.items()]) if probs else "N/A (IQA Retake Required)"

        ma_c = lesions.get("microaneurysm_count", lesions.get("microaneurysms", 0))
        he_c = lesions.get("hemorrhage_count", lesions.get("hemorrhages", 0))
        hard_ex_c = lesions.get("hard_exudate_count", lesions.get("hard_exudates", 0))
        soft_ex_c = lesions.get("soft_exudate_count", lesions.get("soft_exudates", 0))

        metrics_table = Table([
            [
                Paragraph("<b>Suspected Microvascular Biomarkers:</b>", bold_style),
                Paragraph(f"• Microaneurysms: <b>{ma_c}</b>  • Hemorrhages: <b>{he_c}</b>  • Hard Exudates: <b>{hard_ex_c}</b>  • Soft Exudates: <b>{soft_ex_c}</b>", body_style)
            ],
            [
                Paragraph("<b>5-Class ICDR Softmax Distribution:</b>", bold_style),
                Paragraph(prob_str, body_style)
            ],
            [
                Paragraph("<b>Model Provenance & Active Learning:</b>", bold_style),
                Paragraph(f"{pred.get('model_provenance', 'EfficientNet-B0')} | Active Learning Dataset Tag: <b>Indore_Hub_v2</b> | Temp: {pred.get('temperature', 1.0):.2f}", body_style)
            ],
            [
                Paragraph("<b>Bayesian Uncertainty & Safety Gate:</b>", bold_style),
                Paragraph(
                    f"Predictive Entropy: <b>{pred.get('uncertainty_score', pred.get('entropy', 0.0)):.3f}</b> (Safe Threshold: 0.500) | "
                    f"Epistemic: <b>{pred.get('epistemic_uncertainty', 0.0):.3f}</b> | "
                    f"Aleatoric: <b>{pred.get('aleatoric_uncertainty', 0.0):.3f}</b> | "
                    f"Status: <b><font color='{'#D97706' if (screening_data.get('requires_manual_doctor_review') or pred.get('requires_manual_doctor_review')) else '#059669'}'>{'⚠️ MANUAL DOCTOR REVIEW REQUIRED' if (screening_data.get('requires_manual_doctor_review') or pred.get('requires_manual_doctor_review')) else 'Auto-Approved (Low Uncertainty)'}</font></b>",
                    body_style
                )
            ]
        ], colWidths=[185, 365])
        metrics_table.setStyle(TableStyle([
            ('LINEBELOW', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ('TOPPADDING', (0, 0), (-1, -1), 2.5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
        ]))
        elements.append(metrics_table)
        elements.append(Spacer(1, 8))

        # =====================================================================
        # 8. CLINICIAN TELE-OPHTHALMOLOGY REVIEW SECTION
        # =====================================================================
        doctor = screening_data.get("doctor_review")
        doc_name = doctor.get("doctor_name", "Awaiting Clinician Review") if doctor else "Awaiting Clinician Review"
        doc_notes = doctor.get("clinical_notes", "No notes recorded yet.") if doctor else "Pending ophthalmologist review."
        doc_grade = f"Grade {doctor.get('confirmed_grade')}" if doctor else "Unconfirmed"

        doc_table = Table([
            [
                Paragraph(f"<b>Reviewing Clinician:</b> {doc_name}", body_style),
                Paragraph(f"<b>Confirmed Grade:</b> {doc_grade}", body_style),
                Paragraph("<b>Clinician Signature:</b> ________________", body_style)
            ],
            [
                Paragraph(f"<b>Clinical Notes / Plan:</b> {doc_notes}", body_style),
                Paragraph(f"<b>License #:</b> {doctor.get('doctor_license', 'MCI-REG-AI') if doctor else 'MCI-REG-AI'}", body_style),
                Paragraph(f"<b>Review Status:</b> {screening_data.get('status', 'ANALYZED')}", body_style)
            ]
        ], colWidths=[220, 150, 180])
        doc_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(doc_table)
        elements.append(Spacer(1, 6))

        # =====================================================================
        # 9. REGULATORY DISCLAIMER
        # =====================================================================
        elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#CBD5E1"), spaceAfter=4))
        elements.append(Paragraph(
            "<b>REGULATORY NOTICE & DISCLAIMER:</b> RetinaVision-AI is an investigational clinical decision-support research prototype "
            "engineered for early triage under AI Manthan 2.0 (Problem Statement 14). It is NOT certified as an autonomous medical diagnostic device. "
            "All findings, Grad-CAM heatmaps, and suspected lesion candidates must be clinically correlated and validated by a licensed ophthalmologist.",
            disclaimer_style
        ))

        doc.build(elements)
        return str(pdf_path)

