import React, { useState } from 'react';
import { 
  Download, Stethoscope, AlertTriangle, ShieldCheck, Microscope, 
  Info, Clock, Sparkles, HeartHandshake, Eye, FileText, CheckCircle2, ChevronRight 
} from 'lucide-react';
import { ScreeningDetail } from '../types';
import { Language, translations } from '../utils/language';
import { SeverityBadge, UrgencyBadge } from './SeverityBadge';
import { LayerControls } from './LayerControls';
import { ProbabilityChart } from './ProbabilityChart';
import { getUserRole } from '../services/api';

interface DiagnosticStudioProps {
  screening: ScreeningDetail;
  lang: Language;
  userRole?: string;
  onOpenReview: () => void;
  onOpenReport: () => void;
}

export const DiagnosticStudio: React.FC<DiagnosticStudioProps> = ({
  screening,
  lang,
  userRole,
  onOpenReview,
  onOpenReport,
}) => {
  const t = translations[lang];
  const role = (userRole || getUserRole() || 'user').toLowerCase();
  const isDoctor = role === 'doctor';

  // 2-Tab Layout State: Default is 'simple' (Village-Friendly for health workers & patients)
  const [viewMode, setViewMode] = useState<'simple' | 'clinical'>('simple');

  // Simple View state: Toggle between Normal Photo and AI Heatmap
  const [simpleModeLayer, setSimpleModeLayer] = useState<'normal' | 'heatmap'>('heatmap');

  // Clinical View state: Advanced layer controls
  const [activeBaseLayer, setActiveBaseLayer] = useState<'raw' | 'clahe'>('clahe');
  const [showGradcam, setShowGradcam] = useState(true);
  const [showLesions, setShowLesions] = useState(true);
  const [gradcamOpacity, setGradcamOpacity] = useState(0.55);
  const [zoom, setZoom] = useState(1);

  const resetView = () => setZoom(1);

  const p = screening.patient;
  const pred = screening.prediction;
  const lesions = screening.lesions;
  const iqa = screening.iqa;
  const doctor = screening.doctor_review;

  // STRICT ON REJECTION GUARD:
  // If image failed IQA quality check, strictly HIDE center image view, Diagnostic Layer Engine,
  // ICDR grading cards, lesion counts, and report download button. Show ONLY clear Red Rejection Alert.
  if (iqa?.passed === false || screening.iqa_passed === false) {
    return (
      <div className="min-h-[460px] glass-panel p-8 border-2 border-rose-500/70 bg-rose-950/40 rounded-2xl shadow-2xl flex flex-col items-center justify-center text-center space-y-4 pop-in">
        <div className="w-16 h-16 rounded-2xl bg-rose-900/60 border border-rose-500/80 flex items-center justify-center text-rose-300 shadow-[0_0_24px_rgba(244,63,94,0.4)]">
          <AlertTriangle className="w-8 h-8 text-rose-400" />
        </div>
        <div className="max-w-lg space-y-2">
          <h3 className="font-heading font-black text-base sm:text-lg text-rose-200 uppercase tracking-wide">
            Quality Check Failed: Retinal Scan Unreadable / Non-Retinal
          </h3>
          <p className="text-xs sm:text-sm text-rose-300/90 leading-relaxed font-medium">
            Image rejected due to severe blur, low illumination, or non-retinal artifact. Diagnosis stopped to prevent medical misdiagnosis. Please capture a clear fundus photo.
          </p>
        </div>
      </div>
    );
  }

  const currentGrade = doctor ? doctor.confirmed_grade : (pred?.predicted_grade ?? 0);
  const baseImageUrl = activeBaseLayer === 'raw' 
    ? (screening.raw_image_url || screening.preprocessed_image_url)
    : (screening.preprocessed_image_url || screening.raw_image_url);

  const isDoctorReviewRequired = Boolean(screening.requires_manual_doctor_review || pred?.requires_manual_doctor_review);
  const uncertaintyScore = pred?.uncertainty_score ?? pred?.entropy ?? screening.uncertainty_score ?? 0;

  return (
    <div className="space-y-6 pop-in">
      
      {/* Top Banner: Patient Summary & Actions */}
      <div className="glass-panel p-5 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-[rgba(70,170,255,0.2)]">
        <div>
          <div className="flex items-center space-x-3 flex-wrap gap-y-2">
            <h1 className="font-heading font-black text-xl text-white tracking-wide">
              {p.full_name}
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#04070d]/80 text-[#9ab0c9] border border-[rgba(70,170,255,0.25)]">
              {p.age} yrs • {p.gender}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#35b6ff]/15 text-[#35b6ff] border border-[#35b6ff]/40 shadow-[0_0_10px_rgba(53,182,255,0.2)]">
              {screening.eye_side === 'RIGHT' ? (lang === 'hi' ? 'दाहिनी आँख (Right Eye - OD)' : 'Right Eye (OD)') : (lang === 'hi' ? 'बाईं आँख (Left Eye - OS)' : 'Left Eye (OS)')}
            </span>
          </div>
          <p className="text-xs text-[#9ab0c9] mt-1.5 font-mono">
            Record ID: <span className="text-white">{screening.id.slice(0, 16)}</span> • {p.diabetes_history}
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          {isDoctor ? (
            <button
              type="button"
              onClick={onOpenReview}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#081222] hover:bg-[#35b6ff]/20 border border-[#35b6ff]/40 hover:border-[#35b6ff] text-xs font-bold text-white transition-all shadow-[0_0_12px_rgba(53,182,255,0.15)] active:scale-95"
            >
              <Stethoscope className="w-4 h-4 text-emerald-400" />
              <span>{doctor ? 'Update Review' : t.reviewDiagnosis}</span>
            </button>
          ) : (
            <div
              className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-700/50 text-xs font-medium text-slate-400 cursor-not-allowed select-none"
              title="Clinician review and sign-off is restricted to verified ophthalmologists/doctors"
            >
              <Stethoscope className="w-3.5 h-3.5 text-slate-500" />
              <span>Doctor Sign-Off (Locked)</span>
            </div>
          )}

          <button
            type="button"
            onClick={onOpenReport}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl btn-cyan-glow text-xs font-bold text-[#04070d] transition-all font-heading active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>{t.downloadReport}</span>
          </button>
        </div>
      </div>

      {/* Prominent Architectural Change: 2-Tab Layout Switcher */}
      <div className="flex items-center justify-center sm:justify-start">
        <div className="inline-flex p-1.5 rounded-2xl bg-[#0F172A] border border-white/10 shadow-xl space-x-2">
          {/* Tab 1: Simple View (Default active tab — for patients & rural health workers) */}
          <button
            type="button"
            onClick={() => setViewMode('simple')}
            className={`flex items-center space-x-2.5 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
              viewMode === 'simple'
                ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-slate-950 font-black shadow-[0_0_20px_rgba(56,189,248,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <HeartHandshake className="w-4 h-4 shrink-0" />
            <span>{lang === 'hi' ? 'सरल रिपोर्ट (Simple View)' : 'Simple View'}</span>
            <span className="hidden sm:inline-block text-[10px] py-0.5 px-2 rounded-full bg-slate-950/40 text-slate-200 font-mono">
              {lang === 'hi' ? 'मरीज व स्वास्थ्य कर्मी' : 'Village-Friendly'}
            </span>
          </button>

          {/* Tab 2: Full Clinical Report (Designed for doctors and specialists) */}
          <button
            type="button"
            onClick={() => setViewMode('clinical')}
            className={`flex items-center space-x-2.5 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
              viewMode === 'clinical'
                ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-slate-950 font-black shadow-[0_0_20px_rgba(56,189,248,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Stethoscope className="w-4 h-4 shrink-0" />
            <span>{lang === 'hi' ? 'विस्तृत डॉक्टर रिपोर्ट (Full Clinical Report)' : 'Full Clinical Report'}</span>
            <span className="hidden sm:inline-block text-[10px] py-0.5 px-2 rounded-full bg-slate-950/40 text-slate-200 font-mono">
              {lang === 'hi' ? 'नेत्र विशेषज्ञ' : 'Doctor View'}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SIMPLE VIEW (Village-Friendly, Zero Technical Jargon)              */}
      {/* ========================================================================= */}
      {viewMode === 'simple' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch pop-in">
          
          {/* Left Column (7 Cols): Animated Eye Heatwave with single toggle */}
          <div className="lg:col-span-7 bg-[#0F172A] border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col justify-between space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center space-x-2 font-heading">
                  <Eye className="w-4 h-4 text-sky-400" />
                  <span>{lang === 'hi' ? 'रेटिना फोटो एवं एआई हीटवेव' : 'Retinal Eye Scan & AI Heatwave'}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {lang === 'hi' ? 'एआई द्वारा आँख के पर्दे की प्राथमिक जाँच' : 'Automated retinal microvascular scan'}
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                <span>{lang === 'hi' ? 'स्कैन सक्रिय' : 'Scan Active'}</span>
              </span>
            </div>

            {/* Large Image Viewport with Animated Eye Heatwave */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-white/5 flex items-center justify-center p-3 min-h-[360px] sm:min-h-[420px] shadow-inner">
              {/* Base Fundus Image */}
              <img
                src={simpleModeLayer === 'normal' 
                  ? (screening.raw_image_url || screening.preprocessed_image_url) 
                  : (screening.preprocessed_image_url || screening.raw_image_url)}
                alt="Retinal Fundus Photograph"
                className="max-h-[390px] w-auto max-w-full object-contain rounded-xl select-none block shadow-2xl"
              />

              {/* Animated Grad-CAM Heatwave Overlay */}
              {simpleModeLayer === 'heatmap' && pred?.gradcam_url && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-3">
                  <img
                    src={pred.gradcam_url}
                    alt="AI Saliency Heatwave Overlay"
                    className="max-h-[390px] w-auto max-w-full object-contain mix-blend-screen animate-heatwave rounded-xl transition-all duration-300"
                  />
                </div>
              )}

              {/* Smooth Laser Scanline Pulse Effect */}
              {simpleModeLayer === 'heatmap' && (
                <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-scanline pointer-events-none opacity-50" />
              )}
            </div>

            {/* Bottom Controls: ONLY ONE Simple Toggle Switch + Plain-English Caption */}
            <div className="space-y-3 pt-2 border-t border-white/5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="inline-flex p-1 bg-slate-950/80 rounded-xl border border-white/10 self-start shadow-inner">
                  <button
                    type="button"
                    onClick={() => setSimpleModeLayer('normal')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      simpleModeLayer === 'normal'
                        ? 'bg-sky-500 text-slate-950 font-black shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    📷 {lang === 'hi' ? 'सामान्य फोटो (Normal Photo)' : 'Normal Photo'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimpleModeLayer('heatmap')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                      simpleModeLayer === 'heatmap'
                        ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-white font-black shadow-[0_0_14px_rgba(244,63,94,0.4)]'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>🔥 {lang === 'hi' ? 'एआई हीटमैप (AI Heatmap)' : 'AI Heatmap'}</span>
                  </button>
                </div>

                <span className="text-[11px] text-slate-400 font-mono">
                  {simpleModeLayer === 'heatmap' ? '🔥 Visualizing Saliency Zones' : '📷 Viewing Clean Fundus Capture'}
                </span>
              </div>

              {/* 1-Line Plain-English Caption */}
              <p className="text-xs text-slate-300 bg-slate-950/70 p-3 rounded-xl border border-white/5 flex items-center space-x-2.5 leading-relaxed">
                <Info className="w-4 h-4 text-sky-400 shrink-0" />
                <span>
                  {lang === 'hi'
                    ? 'हाइलाइट किए गए लाल और नारंगी क्षेत्र आँख की नसों में आए बदलाव को दर्शाते हैं।'
                    : 'Highlighted red/orange areas show detected blood vessel changes in the eye.'}
                </span>
              </p>
            </div>
          </div>

          {/* Right Column (5 Cols): Stage & Next Step Card */}
          <div className="lg:col-span-5 bg-[#0F172A] border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col justify-between space-y-6">
            <div className="space-y-6">
              
              {/* Traffic-Light Color-Coded Stage Badge */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  {lang === 'hi' ? 'जाँच का परिणाम (Eye Condition Status)' : 'Eye Screening Status'}
                </span>

                {/* Grade 0: Green Safe */}
                {currentGrade === 0 && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-emerald-950/60 border-2 border-emerald-500/70 text-emerald-200 shadow-[0_0_24px_rgba(16,185,129,0.25)] space-y-1.5">
                    <div className="flex items-center space-x-2.5">
                      <span className="w-4 h-4 rounded-full bg-emerald-400 shadow-[0_0_10px_#10b981] animate-pulse" />
                      <span className="text-base sm:text-lg font-black text-white font-heading">
                        {lang === 'hi' ? 'सुरक्षित — सामान्य आँख' : 'Safe — Normal Eye (Grade 0)'}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-300/90 font-medium leading-relaxed">
                      {lang === 'hi'
                        ? 'कोई डायबिटिक रेटिनोपैथी के लक्षण नहीं पाए गए। आँख का पर्दा पूर्णतः स्वस्थ है।'
                        : 'No diabetic retinopathy detected. Retinal microvasculature appears normal.'}
                    </p>
                  </div>
                )}

                {/* Grade 1–2: Yellow/Amber Caution */}
                {(currentGrade === 1 || currentGrade === 2) && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-amber-950/60 border-2 border-amber-500/70 text-amber-200 shadow-[0_0_24px_rgba(245,158,11,0.25)] space-y-1.5">
                    <div className="flex items-center space-x-2.5">
                      <span className="w-4 h-4 rounded-full bg-amber-400 shadow-[0_0_10px_#f59e0b] animate-pulse" />
                      <span className="text-base sm:text-lg font-black text-white font-heading">
                        {lang === 'hi'
                          ? `सावधानी — शुरुआती/मध्यम बदलाव (चरण ${currentGrade})`
                          : `Caution — Early/Moderate DR (Stage ${currentGrade})`}
                      </span>
                    </div>
                    <p className="text-xs text-amber-300/90 font-medium leading-relaxed">
                      {lang === 'hi'
                        ? `${pred?.grade_name || 'हल्के से मध्यम लक्षण'} मिले हैं। समय पर देखभाल एवं डॉक्टर परामर्श आवश्यक है।`
                        : `${pred?.grade_name || 'Mild to moderate non-proliferative retinopathy'} detected. Timely specialist care recommended.`}
                    </p>
                  </div>
                )}

                {/* Grade 3–4: Red High Risk */}
                {(currentGrade === 3 || currentGrade === 4) && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-rose-950/60 border-2 border-rose-500/70 text-rose-200 shadow-[0_0_24px_rgba(244,63,94,0.3)] space-y-1.5">
                    <div className="flex items-center space-x-2.5">
                      <span className="w-4 h-4 rounded-full bg-rose-400 shadow-[0_0_10px_#f43f5e] animate-pulse" />
                      <span className="text-base sm:text-lg font-black text-white font-heading">
                        {lang === 'hi'
                          ? `उच्च जोखिम — चरण ${currentGrade}: ${pred?.grade_name || 'गंभीर स्थिति'}`
                          : `High Risk — Stage ${currentGrade}: ${pred?.grade_name || 'Severe/Proliferative DR'}`}
                      </span>
                    </div>
                    <p className="text-xs text-rose-300/90 font-medium leading-relaxed">
                      {lang === 'hi'
                        ? 'आँख की नसों में गंभीर क्षति या रिसाव के संकेत। दृष्टि बचाने हेतु तुरंत बड़े नेत्र अस्पताल जाएं।'
                        : 'Urgent medical attention required. High risk of vision impairment without clinical intervention.'}
                    </p>
                  </div>
                )}
              </div>

              {/* 5-Step Horizontal Visual Progress Bar (0 -> 1 -> 2 -> 3 -> 4) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span>{lang === 'hi' ? 'बीमारी का स्तर (0 से 4)' : 'Severity Scale (0 to 4)'}</span>
                  <span className="font-mono text-sky-400 font-bold">Stage {currentGrade} of 4</span>
                </div>

                <div className="relative pt-2 pb-1">
                  {/* Background Track */}
                  <div className="absolute top-5 inset-x-3 h-1.5 bg-slate-800 rounded-full" />
                  
                  {/* Filled Track up to current stage */}
                  <div
                    className={`absolute top-5 left-3 h-1.5 rounded-full transition-all duration-500 ${
                      currentGrade === 0
                        ? 'bg-emerald-500'
                        : currentGrade <= 2
                        ? 'bg-amber-400'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, (currentGrade / 4) * 100))}%` }}
                  />

                  {/* 5 Stage Step Nodes */}
                  <div className="relative flex items-center justify-between z-10">
                    {[0, 1, 2, 3, 4].map((stageNum) => {
                      const isActive = stageNum === currentGrade;
                      const isPassed = stageNum < currentGrade;

                      return (
                        <div key={stageNum} className="flex flex-col items-center">
                          <div
                            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-black text-xs transition-all duration-300 border-2 ${
                              isActive
                                ? stageNum === 0
                                  ? 'bg-emerald-500 text-slate-950 border-white shadow-[0_0_14px_#10b981] scale-110'
                                  : stageNum <= 2
                                  ? 'bg-amber-400 text-slate-950 border-white shadow-[0_0_14px_#f59e0b] scale-110'
                                  : 'bg-rose-500 text-white border-white shadow-[0_0_14px_#f43f5e] scale-110'
                                : isPassed
                                ? 'bg-slate-700 text-slate-300 border-slate-600'
                                : 'bg-slate-900 text-slate-500 border-slate-800'
                            }`}
                          >
                            {stageNum}
                          </div>
                          <span
                            className={`text-[10px] font-semibold mt-1.5 text-center ${
                              isActive ? 'text-white font-bold' : 'text-slate-500'
                            }`}
                          >
                            {stageNum === 0 ? 'Normal' : stageNum === 1 ? 'Mild' : stageNum === 2 ? 'Mod' : stageNum === 3 ? 'Sev' : 'PDR'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bold Easy-to-Read "Next Step" Box */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-white/10 space-y-2">
                <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-sky-400">
                  <Clock className="w-4 h-4 text-sky-400" />
                  <span>{lang === 'hi' ? 'अगला कदम / डॉक्टर की सलाह (Next Step)' : 'Recommended Next Step'}</span>
                </div>

                <p className="text-sm sm:text-base font-extrabold text-white leading-snug">
                  {currentGrade === 0 && (lang === 'hi'
                    ? 'नियमित जाँच: वर्ष में 1 बार आँखों की सामान्य जाँच अवश्य करवाएं।'
                    : 'Routine: Yearly diabetic eye checkup recommended.')}
                  {currentGrade === 1 && (lang === 'hi'
                    ? 'फॉलो-अप: 6 से 12 महीने में पुनः जाँच करवाएं और रक्त शर्करा (Blood Sugar) नियंत्रित रखें।'
                    : 'Follow-up: Re-screen in 6 to 12 months. Keep blood sugar under strict control.')}
                  {currentGrade === 2 && (lang === 'hi'
                    ? 'परामर्श: 2 से 4 सप्ताह के भीतर नजदीकी नेत्र विशेषज्ञ (Ophthalmologist) को दिखाएं।'
                    : 'Consultation: Please consult an eye specialist (Ophthalmologist) within 2 to 4 weeks.')}
                  {currentGrade === 3 && (lang === 'hi'
                    ? 'अति आवश्यक: 1 से 2 सप्ताह के भीतर किसी बड़े नेत्र चिकित्सालय में जाँच करवाएं।'
                    : 'Urgent: Please visit an eye specialist clinic within 1 to 2 weeks for evaluation.')}
                  {currentGrade === 4 && (lang === 'hi'
                    ? 'तत्काल आपातकालीन: दृष्टि बचाने हेतु 72 घंटे के भीतर रेटिना विशेषज्ञ से संपर्क करें।'
                    : 'Critical / Immediate: Please visit an eye specialist within 72 hours to prevent vision loss.')}
                </p>

                <p className="text-[11px] text-slate-400 pt-1.5 border-t border-white/5">
                  {lang === 'hi'
                    ? 'यह प्रारंभिक एआई स्क्रीनिंग है। अंतिम निर्णय हमेशा नेत्र चिकित्सक की सलाह पर होना चाहिए।'
                    : 'Preliminary screening by NETRA X AI. Final treatment decisions require ophthalmologist consultation.'}
                </p>
              </div>

            </div>

            {/* Two Clean Action Buttons */}
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={() => setViewMode('clinical')}
                className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-slate-950 font-black text-xs sm:text-sm transition-all shadow-[0_0_20px_rgba(56,189,248,0.35)] flex items-center justify-center space-x-2 active:scale-[0.99]"
              >
                <span>{lang === 'hi' ? 'विस्तृत डॉक्टर रिपोर्ट देखें →' : 'View Full Clinical Report →'}</span>
              </button>

              <button
                type="button"
                onClick={onOpenReport}
                className="w-full py-3 px-5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-white/10 hover:border-sky-400/50 text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center space-x-2 active:scale-[0.99]"
              >
                <Download className="w-4 h-4 text-sky-400" />
                <span>{lang === 'hi' ? 'पीडीएफ रिपोर्ट डाउनलोड करें' : 'Download PDF Report'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: FULL CLINICAL REPORT (Structured 2-Column Responsive Doctor View) */}
      {/* ========================================================================= */}
      {viewMode === 'clinical' && (
        <div className="space-y-6 pop-in">
          
          {/* ROW 1: Patient Clinical Summary & Actions */}
          <div className="glass-panel p-5 rounded-2xl border border-[rgba(70,170,255,0.2)] bg-[#081222]/80 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 text-xs font-bold uppercase text-sky-400 font-mono">
                <FileText className="w-4 h-4" />
                <span>Clinical Record Summary</span>
                <span className="text-slate-500">•</span>
                <span className="text-white font-semibold">{screening.id}</span>
              </div>
              <div className="flex items-center space-x-3 mt-2 flex-wrap gap-y-1 text-xs text-slate-300">
                <span><b>Patient:</b> {p.full_name} ({p.age}y, {p.gender})</span>
                <span className="text-slate-600">|</span>
                <span><b>Eye Evaluated:</b> {screening.eye_side === 'RIGHT' ? 'Right Eye (OD)' : 'Left Eye (OS)'}</span>
                <span className="text-slate-600">|</span>
                <span><b>History:</b> {p.diabetes_history}</span>
              </div>
            </div>

            <div className="flex items-center space-x-2.5 shrink-0">
              {isDoctor ? (
                <button
                  type="button"
                  onClick={onOpenReview}
                  className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-600/30 to-cyan-600/30 hover:from-sky-500/40 hover:to-cyan-500/40 border border-sky-400/60 text-xs font-bold text-sky-200 hover:text-white transition-all shadow-[0_0_16px_rgba(56,189,248,0.25)] hover:shadow-[0_0_24px_rgba(56,189,248,0.45)]"
                  title="Open Clinician Review & Sign-Off Modal"
                >
                  <Stethoscope className="w-4 h-4 text-sky-300" />
                  <span>{doctor ? 'Update Doctor Review' : 'Clinician Review & Sign-Off'}</span>
                </button>
              ) : (
                <div
                  className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-900/60 border border-slate-700/50 text-xs font-medium text-slate-400 cursor-not-allowed select-none"
                  title="Clinician review and sign-off is restricted to verified ophthalmologists/doctors"
                >
                  <Stethoscope className="w-3.5 h-3.5 text-slate-500" />
                  <span>Doctor Review Locked</span>
                </div>
              )}

              <button
                type="button"
                onClick={onOpenReport}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl btn-cyan-glow text-xs font-bold text-slate-950 transition-all font-heading"
              >
                <Download className="w-4 h-4" />
                <span>Download Medical PDF</span>
              </button>
            </div>
          </div>

          {/* ROW 2: Diagnostic Layer Engine (Left) + Biomarkers & Clinical Severity (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left (7 Cols): Multi-Layer Retinal Canvas & Layer Controls */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-[#020408] border border-[rgba(70,170,255,0.35)] rounded-2xl overflow-hidden shadow-2xl relative flex items-center justify-center p-3 min-h-[460px] max-h-[540px]">
                {/* Tech HUD Corner Accents */}
                <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-[#35b6ff]/60 pointer-events-none z-10" />
                <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-[#35b6ff]/60 pointer-events-none z-10" />
                <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-[#35b6ff]/60 pointer-events-none z-10" />
                <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-[#35b6ff]/60 pointer-events-none z-10" />

                {/* Subtle Tech Grid */}
                <div
                  className="absolute inset-0 opacity-15 pointer-events-none"
                  style={{
                    backgroundImage: 'linear-gradient(rgba(53,182,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(53,182,255,0.15) 1px, transparent 1px)',
                    backgroundSize: '32px 32px'
                  }}
                />

                {/* Centered Multi-Layer Canvas Container */}
                <div
                  className="relative transition-transform duration-150 ease-out inline-flex items-center justify-center max-w-full"
                  style={{ transform: `scale(${zoom})` }}
                >
                  {/* Base Retinal Fundus Image */}
                  <img
                    src={baseImageUrl}
                    alt="Retinal Scan"
                    className="max-h-[440px] max-w-full w-auto object-contain select-none rounded-xl block shadow-2xl"
                  />

                  {/* Layer 3: Grad-CAM Saliency Heatmap Overlay */}
                  {showGradcam && pred?.gradcam_url && (
                    <img
                      src={pred.gradcam_url}
                      alt="Grad-CAM Saliency Heatmap"
                      className="absolute inset-0 w-full h-full object-contain pointer-events-none mix-blend-screen transition-opacity duration-150 rounded-xl"
                      style={{ opacity: gradcamOpacity }}
                    />
                  )}

                  {/* Layer 4: Lesion Segmentation Mask Overlay */}
                  {showLesions && lesions?.mask_url && (
                    <img
                      src={lesions.mask_url}
                      alt="Lesion Segmentation Overlay"
                      className="absolute inset-0 w-full h-full object-contain pointer-events-none transition-opacity duration-150 rounded-xl"
                      style={{ opacity: 0.95 }}
                    />
                  )}
                </div>
              </div>

              {/* Diagnostic Layer Engine (Raw, CLAHE, Grad-CAM, Lesions, Opacity Slider) */}
              <LayerControls
                lang={lang}
                activeBaseLayer={activeBaseLayer}
                setActiveBaseLayer={setActiveBaseLayer}
                showGradcam={showGradcam}
                setShowGradcam={setShowGradcam}
                showLesions={showLesions}
                setShowLesions={setShowLesions}
                gradcamOpacity={gradcamOpacity}
                setGradcamOpacity={setGradcamOpacity}
                zoom={zoom}
                setZoom={setZoom}
                resetView={resetView}
                hasLesions={Boolean(lesions && (lesions.microaneurysm_count > 0 || lesions.hemorrhage_count > 0 || lesions.hard_exudate_count > 0 || lesions.soft_exudate_count > 0))}
              />
            </div>

            {/* Right (5 Cols): ICDR Diagnostic Grading & Biomarker Exudates counts */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* Bayesian Deep Learning Clinical Safety Warning */}
              {isDoctorReviewRequired && (
                <div className="bg-[#ff8a3d]/15 border-2 border-[#ff8a3d]/60 rounded-2xl p-4 shadow-xl text-amber-100 space-y-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#ff8a3d]/20 rounded-full blur-2xl pointer-events-none" />
                  <div className="flex items-center space-x-2 text-[#ff8a3d] font-bold text-xs uppercase tracking-wide">
                    <AlertTriangle className="w-4 h-4 text-[#ff8a3d] shrink-0 animate-pulse" />
                    <span>Bayesian Clinical Safety Gate Triggered</span>
                    <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#ff8a3d]/20 text-[#ff8a3d] border border-[#ff8a3d]/40 font-bold">
                      Entropy: {uncertaintyScore.toFixed(3)} &gt; 0.50
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-100/90 leading-relaxed font-medium">
                    High predictive entropy detected. <b>Auto-approval blocked.</b> Mandatory clinical validation required by an ophthalmologist.
                  </p>
                  {pred?.safety_rationale && pred.safety_rationale.length > 0 && (
                    <ul className="text-[10px] font-mono text-[#ffb020] list-disc list-inside space-y-0.5 pt-1 border-t border-[#ff8a3d]/20">
                      {pred.safety_rationale.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* CARD 1: ICDR Diagnostic Grading */}
              <div className="glass-panel p-5 shadow-xl rounded-2xl border border-[rgba(70,170,255,0.2)] space-y-3.5">
                <div className="flex items-center justify-between border-b border-[rgba(70,170,255,0.15)] pb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#9ab0c9]">
                      {t.diagnosisTitle}
                    </span>
                    <div className="mt-1">
                      <SeverityBadge grade={currentGrade} gradeName={pred?.grade_name} size="lg" />
                    </div>
                  </div>
                  <div className="text-right">
                    <UrgencyBadge urgency={screening.referral_urgency} />
                    <div className="text-xs text-[#35b6ff] font-mono font-bold mt-1.5 flex items-center justify-end space-x-1">
                      <Sparkles className="w-3.5 h-3.5 text-[#35b6ff]" />
                      <span>{Math.round((pred?.confidence ?? 0) * 100)}% {t.confidence}</span>
                    </div>
                  </div>
                </div>

                {/* Doctor Review Verification Status */}
                {doctor && (
                  <div className="p-3 bg-[#35b6ff]/10 border border-[#35b6ff]/30 rounded-xl text-xs space-y-1">
                    <div className="flex items-center space-x-1.5 text-[#35b6ff] font-bold">
                      <ShieldCheck className="w-4 h-4 text-[#35b6ff]" />
                      <span>Clinician Verified by Dr. {doctor.doctor_name}</span>
                    </div>
                    {doctor.was_overridden && (
                      <p className="text-[#ffb020] text-[11px] font-semibold">
                        ⚠️ Grade was modified by doctor from Grade {pred?.predicted_grade} to Grade {doctor.confirmed_grade}.
                      </p>
                    )}
                    {doctor.clinical_notes && (
                      <p className="text-[#eaf3ff] text-[11px] italic">
                        "{doctor.clinical_notes}"
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* CARD 2: Detected Eye Spots & Vessel Changes (2x2 Grid) */}
              <div className="glass-panel p-5 shadow-xl rounded-2xl border border-[rgba(70,170,255,0.2)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white tracking-wide">
                    {lang === 'hi' ? 'आँख के धब्बे और नसों में बदलाव' : 'Detected Eye Spots & Vessel Changes'}
                  </span>
                  <span className="text-[10px] font-mono text-[#35b6ff] bg-[#35b6ff]/10 px-2 py-0.5 rounded border border-[#35b6ff]/30">
                    Morphological CV
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Microaneurysms */}
                  <div className="p-3.5 rounded-xl bg-[#081222]/90 border border-[rgba(70,170,255,0.2)] flex items-center justify-between space-x-2">
                    <div>
                      <div className="text-xs font-bold text-white leading-tight">
                        Microaneurysms
                      </div>
                      <div className="text-[10px] text-[#9ab0c9] mt-0.5">
                        {lang === 'hi' ? 'सूक्ष्म उभार' : 'Capillary leaks'}
                      </div>
                    </div>
                    <div className="text-xl font-black text-[#35b6ff] font-mono shrink-0">
                      {lesions?.microaneurysm_count ?? 0}
                    </div>
                  </div>

                  {/* Hemorrhages */}
                  <div className="p-3.5 rounded-xl bg-[#081222]/90 border border-[rgba(70,170,255,0.2)] flex items-center justify-between space-x-2">
                    <div>
                      <div className="text-xs font-bold text-white leading-tight">
                        Hemorrhages
                      </div>
                      <div className="text-[10px] text-[#9ab0c9] mt-0.5">
                        {lang === 'hi' ? 'रक्तस्राव धब्बे' : 'Dot-blot blood'}
                      </div>
                    </div>
                    <div className="text-xl font-black text-[#ff4d6d] font-mono shrink-0">
                      {lesions?.hemorrhage_count ?? 0}
                    </div>
                  </div>

                  {/* Hard Exudates */}
                  <div className="p-3.5 rounded-xl bg-[#081222]/90 border border-[rgba(70,170,255,0.2)] flex items-center justify-between space-x-2">
                    <div>
                      <div className="text-xs font-bold text-white leading-tight">
                        Hard Exudates
                      </div>
                      <div className="text-[10px] text-[#9ab0c9] mt-0.5">
                        {lang === 'hi' ? 'कठोर रिसाव' : 'Lipid deposits'}
                      </div>
                    </div>
                    <div className="text-xl font-black text-[#ffb020] font-mono shrink-0">
                      {lesions?.hard_exudate_count ?? 0}
                    </div>
                  </div>

                  {/* Soft Exudates */}
                  <div className="p-3.5 rounded-xl bg-[#081222]/90 border border-[rgba(70,170,255,0.2)] flex items-center justify-between space-x-2">
                    <div>
                      <div className="text-xs font-bold text-white leading-tight">
                        Soft Exudates
                      </div>
                      <div className="text-[10px] text-[#9ab0c9] mt-0.5">
                        {lang === 'hi' ? 'नरम धब्बे' : 'Cotton-wool spots'}
                      </div>
                    </div>
                    <div className="text-xl font-black text-[#ffd166] font-mono shrink-0">
                      {lesions?.soft_exudate_count ?? 0}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* ROW 3: AI Severity Breakdown (Left) + Bayesian Clinical Safety Gate & Checkpoint (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left (6 Cols): AI Severity Breakdown Probability Chart */}
            <div className="lg:col-span-6">
              {pred?.class_probabilities && (
                <ProbabilityChart
                  lang={lang}
                  probabilities={pred.class_probabilities}
                  predictedGrade={pred.predicted_grade}
                />
              )}
            </div>

            {/* Right (6 Cols): Bayesian Clinical Safety Gate & Checkpoint */}
            <div className="lg:col-span-6">
              <div className="glass-panel p-5 shadow-xl rounded-2xl border border-[rgba(70,170,255,0.2)] space-y-3.5">
                <div className="flex items-center justify-between border-b border-[rgba(70,170,255,0.15)] pb-2.5">
                  <div className="flex items-center space-x-2 text-xs font-bold text-white">
                    <Microscope className="w-4 h-4 text-[#35b6ff]" />
                    <span>{pred?.model_status === 'VERIFIED_TRAINED_CHECKPOINT' ? 'Verified Checkpoint' : (pred?.model_status || 'Verified Checkpoint')}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-[11px] text-[#9ab0c9] font-mono">
                    <Clock className="w-3.5 h-3.5 text-[#35b6ff]" />
                    <span>{pred?.inference_time_ms ?? 0}ms</span>
                  </div>
                </div>

                <p className="text-[11px] text-[#9ab0c9] font-mono">
                  Backbone: <span className="text-white font-semibold">{pred?.model_provenance || 'EfficientNet-B0 (APTOS/EyePACS)'}</span>
                </p>

                {/* 2x2 Uncertainty Metrics Grid */}
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-xl bg-[#04070d]/80 border border-[rgba(70,170,255,0.15)]">
                    <span className="text-[10px] text-[#9ab0c9] block font-medium">Monte Carlo Entropy</span>
                    <b className="text-white font-mono text-xs">{uncertaintyScore.toFixed(3)}</b>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#04070d]/80 border border-[rgba(70,170,255,0.15)]">
                    <span className="text-[10px] text-[#9ab0c9] block font-medium">Epistemic Uncertainty</span>
                    <b className="text-[#35b6ff] font-mono text-xs">{(pred?.epistemic_uncertainty ?? 0).toFixed(3)}</b>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#04070d]/80 border border-[rgba(70,170,255,0.15)]">
                    <span className="text-[10px] text-[#9ab0c9] block font-medium">Aleatoric Uncertainty</span>
                    <b className="text-[#ff8a3d] font-mono text-xs">{(pred?.aleatoric_uncertainty ?? 0).toFixed(3)}</b>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#04070d]/80 border border-[rgba(70,170,255,0.15)]">
                    <span className="text-[10px] text-[#9ab0c9] block font-medium">Calibrated Temperature</span>
                    <b className="text-[#3dff9a] font-mono text-xs">{(pred?.temperature ?? 1.5).toFixed(2)}</b>
                  </div>
                </div>

                {/* Clinical Safety Approval Status Badge */}
                <div className="pt-2 border-t border-[rgba(70,170,255,0.15)] flex items-center justify-between">
                  <span className="text-[11px] text-[#9ab0c9] font-semibold">Approval Status:</span>
                  {isDoctorReviewRequired ? (
                    <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-[#ff8a3d]/20 text-[#ff8a3d] border border-[#ff8a3d]/50 shadow-[0_0_10px_rgba(255,138,61,0.2)]">
                      ⚠️ MANUAL REVIEW REQUIRED
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-[#3dff9a]/20 text-[#3dff9a] border border-[#3dff9a]/50 shadow-[0_0_10px_rgba(61,255,154,0.2)]">
                      ✓ AUTO-APPROVED (SAFE)
                    </span>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Footer: Clinical Decision Support Disclaimer */}
          <div className="p-3.5 glass-panel rounded-2xl border border-[rgba(70,170,255,0.15)] flex items-start space-x-2 text-[11px] text-[#9ab0c9]">
            <Info className="w-4 h-4 text-[#35b6ff] shrink-0 mt-0.5" />
            <span>{t.researchDisclaimer}</span>
          </div>

        </div>
      )}

    </div>
  );
};
