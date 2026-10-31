from typing import Dict, Any, List

TRIAGE_GUIDELINES = {
    0: {
        "grade_code": "Grade 0",
        "title_en": "No Apparent Diabetic Retinopathy",
        "title_hi": "कोई डायबिटिक रेटिनोपैथी नहीं पाई गई",
        "urgency": "ROUTINE",
        "urgency_label_en": "Routine Annual Screening",
        "urgency_label_hi": "नियमित वार्षिक जांच",
        "systemic_risk": "Low Systemic DR Progression Risk (Microvasculature Intact)",
        "next_interval": "12 Months (Annual Screening)",
        "commercial_tier": "Tier 2: Primary Valid Diagnostic Scan",
        "billing_status": "₹25 Valid Scan",
        "billing_amount": 25.0,
        "clinical_findings_en": "No microaneurysms, hemorrhages, or exudates observed. Retinal vasculature appears normal.",
        "clinical_findings_hi": "रेटिना में कोई माइक्रोएन्यूरिज्म, रक्तस्राव या रिसाव नहीं देखा गया। रक्त वाहिकाएं सामान्य हैं।",
        "action_en": "Schedule routine annual dilated retinal examination. Continue optimal glycemic, lipid, and blood pressure control.",
        "action_hi": "अगले 1 वर्ष में नियमित नेत्र जांच कराएं। ब्लड शुगर और रक्तचाप को नियंत्रित रखें।",
        "patient_explanation_en": "Your retinal scan is completely clear with no signs of diabetic retinopathy. Maintain healthy blood sugar and blood pressure, and return for your routine check-up in 12 months.",
        "patient_explanation_hi": "आपके रेटिना की जांच सामान्य है और डायबिटिक रेटिनोपैथी का कोई लक्षण नहीं मिला है। अपनी शुगर और बीपी नियंत्रित रखें और 12 महीने बाद दोबारा नियमित जांच कराएं।"
    },
    1: {
        "grade_code": "Grade 1",
        "title_en": "Mild Non-Proliferative Diabetic Retinopathy (NPDR)",
        "title_hi": "हल्का गैर-प्रोलिफेरेटिव डायबिटिक रेटिनोपैथी",
        "urgency": "ROUTINE",
        "urgency_label_en": "Routine Follow-up (6-9 Months)",
        "urgency_label_hi": "नियमित अनुवर्ती जांच (6-9 माह)",
        "systemic_risk": "Mild Systemic DR Risk (Early Microvascular Leakage Detected)",
        "next_interval": "6 - 9 Months (Close Glycemic Monitoring)",
        "commercial_tier": "Tier 2: Primary Valid Diagnostic Scan",
        "billing_status": "₹25 Valid Scan",
        "billing_amount": 25.0,
        "clinical_findings_en": "Isolated microaneurysms detected without significant retinal exudates or edema.",
        "clinical_findings_hi": "केवल प्रारंभिक माइक्रोएन्यूरिज्म (सूक्ष्म उभार) पाए गए हैं। गंभीर क्षति नहीं है।",
        "action_en": "Rescreen within 6 to 9 months. Strict monitoring of HbA1c, blood pressure, and cholesterol.",
        "action_hi": "6 से 9 महीने में दोबारा जांच कराएं। खान-पान और दवाओं से शुगर लेवल नियंत्रित रखें।",
        "patient_explanation_en": "Very early tiny changes (microaneurysms) were seen in your eye. Your vision is not immediately threatened, but tighter blood sugar control and a repeat scan in 6-9 months are strongly advised.",
        "patient_explanation_hi": "आपकी आंख के पर्दे में बहुत शुरुआती सूक्ष्म बदलाव दिखे हैं। घबराने की बात नहीं है, पर शुगर को तुरंत नियंत्रित करें और 6-9 महीने में दोबारा जांच कराएं।"
    },
    2: {
        "grade_code": "Grade 2",
        "title_en": "Moderate Non-Proliferative Diabetic Retinopathy (NPDR)",
        "title_hi": "मध्यम गैर-प्रोलिफेरेटिव डायबिटिक रेटिनोपैथी",
        "urgency": "NON_URGENT",
        "urgency_label_en": "Non-Urgent Specialist Referral (4-6 Weeks)",
        "urgency_label_hi": "नेत्र विशेषज्ञ परामर्श (4-6 सप्ताह)",
        "systemic_risk": "Moderate Systemic DR Risk (Elevated Risk of Macular Edema & Vascular Occlusion)",
        "next_interval": "4 - 6 Weeks (Specialist Tele-Ophthalmology Evaluation)",
        "commercial_tier": "Tier 2: Primary Valid Diagnostic Scan",
        "billing_status": "₹25 Valid Scan",
        "billing_amount": 25.0,
        "clinical_findings_en": "Multiple microaneurysms, dot/blot hemorrhages, and/or hard exudates detected in retinal quadrants.",
        "clinical_findings_hi": "रेटिना में छोटे रक्तस्राव और पीले धब्बे (एक्सयूडेट्स) मौजूद हैं। दृष्टि हानि का जोखिम बढ़ रहा है।",
        "action_en": "Refer to an ophthalmologist within 4 to 6 weeks for optical coherence tomography (OCT) and macula assessment.",
        "action_hi": "4 से 6 सप्ताह के भीतर किसी नेत्र विशेषज्ञ (ऑप्थल्मोलॉजिस्ट) को दिखाकर विस्तृत जांच कराएं।",
        "patient_explanation_en": "Noticeable blood leakage and deposits were identified in your retina. You should be examined by an eye specialist (ophthalmologist) within 4 to 6 weeks to protect your vision.",
        "patient_explanation_hi": "रेटिना में रक्त के धब्बे और रिसाव पाया गया है। दृष्टि की सुरक्षा के लिए 4 से 6 हफ्तों के भीतर नेत्र विशेषज्ञ (आई डॉक्टर) से जांच कराना आवश्यक है।"
    },
    3: {
        "grade_code": "Grade 3",
        "title_en": "Severe Non-Proliferative Diabetic Retinopathy (NPDR)",
        "title_hi": "गंभीर गैर-प्रोलिफेरेटिव डायबिटिक रेटिनोपैथी",
        "urgency": "URGENT",
        "urgency_label_en": "Urgent Specialist Referral (1-2 Weeks)",
        "urgency_label_hi": "त्वरित विशेषज्ञ परामर्श (1-2 सप्ताह)",
        "systemic_risk": "High Systemic DR Risk (Severe Pre-Proliferative Retinal Ischemia)",
        "next_interval": "1 - 2 Weeks (Urgent Specialist Referral)",
        "commercial_tier": "Tier 2: Primary Valid Diagnostic Scan",
        "billing_status": "₹25 Valid Scan",
        "billing_amount": 25.0,
        "clinical_findings_en": "Extensive intraretinal hemorrhages in multiple quadrants, venous beading, or IRMA (4-2-1 rule met). High risk of progression.",
        "clinical_findings_hi": "रेटिना के कई हिस्सों में गंभीर रक्तस्राव और शिरा संबंधी असामान्यताएं। दृष्टि को तत्काल खतरा।",
        "action_en": "Urgent retinal specialist referral within 1 to 2 weeks. Comprehensive evaluation for macular edema and panretinal treatment.",
        "action_hi": "1 से 2 सप्ताह में तुरंत रेटिना स्पेशलिस्ट को दिखाएं। समय पर उपचार से दृष्टि बचाई जा सकती है।",
        "patient_explanation_en": "Significant blood vessel damage is present across multiple areas of your retina. Urgent evaluation by a retina specialist within 1 to 2 weeks is needed to prevent permanent vision loss.",
        "patient_explanation_hi": "रेटिना की कई रक्त नलिकाओं में गंभीर खराबी पाई गई है। आंखों की रोशनी सुरक्षित रखने के लिए 1 से 2 सप्ताह में रेटिना विशेषज्ञ को तुरंत दिखाएं।"
    },
    4: {
        "grade_code": "Grade 4",
        "title_en": "Proliferative Diabetic Retinopathy (PDR)",
        "title_hi": "प्रोलिफेरेटिव डायबिटिक रेटिनोपैथी (उच्च जोखिम)",
        "urgency": "CRITICAL",
        "urgency_label_en": "Immediate Emergency Referral (< 72 Hours)",
        "urgency_label_hi": "तत्काल आपातकालीन परामर्श (72 घंटे के भीतर)",
        "systemic_risk": "Critical Systemic DR Risk (Proliferative Neovascularization; High Risk of Hemorrhage / Detachment)",
        "next_interval": "Immediate (< 48-72 Hours Vitreoretinal Emergency)",
        "commercial_tier": "Tier 2: Primary Valid Diagnostic Scan",
        "billing_status": "₹25 Valid Scan",
        "billing_amount": 25.0,
        "clinical_findings_en": "Neovascularization (new abnormal fragile blood vessels) on disc or elsewhere, preretinal/vitreous hemorrhage.",
        "clinical_findings_hi": "नई असामान्य रक्त वाहिकाओं का निर्माण और गंभीर रक्तस्राव। स्थायी दृष्टिहीनता का तीव्र जोखिम।",
        "action_en": "Immediate hospital/retina specialist referral within 48 to 72 hours. Urgent intervention (anti-VEGF injections or laser photocoagulation).",
        "action_hi": "बिना देरी किए तुरंत बड़े नेत्र अस्पताल या रेटिना विशेषज्ञ से संपर्क करें। आपातकालीन लेजर/इंजेक्शन की आवश्यकता हो सकती है।",
        "patient_explanation_en": "Critical Stage: Fragile abnormal new blood vessels have grown and may bleed into your eye. Seek immediate hospital or retina specialist care within 48 to 72 hours.",
        "patient_explanation_hi": "गंभीर स्थिति: आंख के पर्दे पर कमजोर नई नसें उग आई हैं जिनसे भारी रक्तस्राव का खतरा है। अगले 48-72 घंटों में तुरंत बड़े नेत्र अस्पताल जाएं।"
    }
}

def get_triage_info(grade: int) -> Dict[str, Any]:
    grade = max(0, min(4, int(grade)))
    return TRIAGE_GUIDELINES.get(grade, TRIAGE_GUIDELINES[0])

def get_iqa_rejection_triage(
    error_codes: List[str] = None,
    feedback: str = "",
    recapture_instructions: str = ""
) -> Dict[str, Any]:
    return {
        "grade_code": "IQA Retake Required",
        "title_en": "Sub-Standard Image Quality (Retake Mandatory)",
        "title_hi": "छवि की गुणवत्ता अपर्याप्त (पुनः स्कैन आवश्यक)",
        "urgency": "RETAKE",
        "urgency_label_en": "Immediate Recapture Required",
        "urgency_label_hi": "तत्काल पुनः फोटो लें",
        "systemic_risk": "Unassessed Quality Risk (Optical/motion blur or occlusion prevents safe risk determination)",
        "next_interval": "Immediate Recapture (Same-day retake required)",
        "commercial_tier": "Tier 1: Free Automated Quality Pre-Screening (Zero-Charge Protection)",
        "billing_status": "₹0 Charged — Waived by IQA Gatekeeper",
        "billing_amount": 0.0,
        "clinical_findings_en": feedback or "Image failed automated quality assessment (motion blur, underexposure, or out of focus).",
        "clinical_findings_hi": "छवि गुणवत्ता जांच में विफल रही (धुंधलापन या अपर्याप्त रोशनी)। सुरक्षित जांच हेतु पुनः फोटो लें।",
        "action_en": recapture_instructions or "Retake photograph immediately with proper patient fixation and optical focus.",
        "action_hi": "मरीज को सही बिंदु पर देखने को कहें और लेंस फोकस समायोजित करके तुरंत नई तस्वीर लें।",
        "patient_explanation_en": "The captured eye image was blurry or too dark to be safely evaluated by the AI. No fee has been charged (₹0 Charged — Waived by IQA Gatekeeper). Please allow the technician to capture a clearer scan.",
        "patient_explanation_hi": "फोटो धुंधली या कम रोशनी वाली होने के कारण डॉक्टर/एआई द्वारा सुरक्षित जांच संभव नहीं है। आईक्यूए गेटकीपर द्वारा शुल्क पूरी तरह माफ किया गया है (₹0)। कृपया साफ फोटो दोबारा खिंचवाएं।"
    }
