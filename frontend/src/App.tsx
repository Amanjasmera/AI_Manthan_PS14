import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { DiagnosticStudio } from './components/DiagnosticStudio';
import { PatientHistoryTable } from './components/PatientHistoryTable';
import { DoctorReviewModal } from './components/DoctorReviewModal';
import { ReportModal } from './components/ReportModal';
import { Language } from './utils/language';
import { ScreeningDetail, ScreeningListItem } from './types';
import { uploadAndAnalyzeScreening, listScreenings, getScreeningDetail } from './services/api';
import { Stethoscope, AlertTriangle, Eye, ShieldAlert, Sparkles, Upload, UserCheck, ShieldCheck, Zap } from 'lucide-react';

export function App() {
  const [lang, setLang] = useState<Language>('en');
  const [activeTab, setActiveTab] = useState<'studio' | 'history' | 'review'>('studio');

  // Strict initial state: activeScreening is null on initial app load
  const [activeScreening, setActiveScreening] = useState<ScreeningDetail | null>(null);
  const [screeningsList, setScreeningsList] = useState<ScreeningListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [iqaRejection, setIqaRejection] = useState<string | null>(null);

  // Modals
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Fetch initial screening registry list without auto-selecting any screening
  const loadInitialData = async () => {
    try {
      const res = await listScreenings(1, 50);
      setScreeningsList(res.items);
      // Strictly maintain initial empty state: do NOT auto-select res.items[0]
    } catch (e) {
      console.warn('Initial screenings load notice:', e);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleAnalyze = async (formData: FormData) => {
    setIsLoading(true);
    setError(null);
    setIqaRejection(null);
    try {
      const result = await uploadAndAnalyzeScreening(formData);
      const isPassed = Boolean(result.iqa?.passed && result.iqa_passed !== false);
      if (!isPassed) {
        setActiveScreening(null);
        setIqaRejection(
          "Quality Check Failed: Retinal Scan Unreadable / Non-Retinal. Image rejected due to severe blur, low illumination, or non-retinal artifact. Diagnosis stopped to prevent medical misdiagnosis. Please capture a clear fundus photo."
        );
      } else {
        setActiveScreening(result);
        setIqaRejection(null);
      }
      setActiveTab('studio');
      // Refresh screening registry
      const res = await listScreenings(1, 50);
      setScreeningsList(res.items);
    } catch (err: any) {
      setActiveScreening(null);
      const msg = err.message || '';
      if (
        msg.includes('verification failed') ||
        msg.includes('QUALITY_CHECK_FAILED') ||
        msg.includes('BLUR') ||
        msg.includes('NON_RETINAL') ||
        msg.includes('Quality Check') ||
        msg.includes('400') ||
        msg.includes('failed')
      ) {
        setIqaRejection(
          "Quality Check Failed: Retinal Scan Unreadable / Non-Retinal. Image rejected due to severe blur, low illumination, or non-retinal artifact. Diagnosis stopped to prevent medical misdiagnosis. Please capture a clear fundus photo."
        );
      } else {
        setError(msg || 'Screening analysis failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectScreening = async (id: string) => {
    try {
      setError(null);
      setIqaRejection(null);
      const detail = await getScreeningDetail(id);
      const isPassed = Boolean(detail.iqa?.passed && detail.iqa_passed !== false);
      if (!isPassed) {
        setActiveScreening(null);
        setIqaRejection(
          "Quality Check Failed: Retinal Scan Unreadable / Non-Retinal. Image rejected due to severe blur, low illumination, or non-retinal artifact. Diagnosis stopped to prevent medical misdiagnosis. Please capture a clear fundus photo."
        );
      } else {
        setActiveScreening(detail);
      }
      setActiveTab('studio');
    } catch (e: any) {
      setError(e.message || 'Failed to load screening detail');
    }
  };

  const handleReviewSuccess = (updated: ScreeningDetail) => {
    setActiveScreening(updated);
    listScreenings(1, 50).then((res) => setScreeningsList(res.items));
  };

  return (
    <div className="min-h-screen bg-[#04070d] text-[#eaf3ff] flex flex-col font-sans selection:bg-[#35b6ff] selection:text-[#04070d]">
      {/* Top Header: NETRA X Branding & 5 Clean Navigation Items */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-28 md:pb-10">
        
        {/* Global Error Notification */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-950/70 border border-rose-500/50 text-rose-200 text-xs flex items-center justify-between shadow-xl">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="px-3 py-1 rounded-xl bg-rose-900/50 hover:bg-rose-900 text-white font-bold transition"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tab 1: Diagnostic Studio */}
        {activeTab === 'studio' && (
          <div className="space-y-6">
            {/* 1. INSTANT CLARITY ONBOARDING STRIP */}
            <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-sky-500/25 bg-slate-950/75 shadow-2xl relative overflow-hidden pop-in">
              {/* Ambient gradient backglow */}
              <div className="absolute -top-10 -left-10 w-44 h-44 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-10 -right-10 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Header Title & Subtitle */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3.5 mb-3.5 border-b border-sky-500/15">
                <div>
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                      {lang === 'hi' ? 'प्राथमिक स्वास्थ्य केंद्र (PHC) एवं शिविर संस्करण' : 'PHC & Health Camp Screening Edition'}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                      <span>{lang === 'hi' ? 'एआई इंजन तैयार' : 'AI Engine Ready'}</span>
                    </span>
                  </div>
                  <h2 className="font-heading font-black text-base sm:text-lg text-white mt-1">
                    {lang === 'hi' ? 'नेत्रा एक्स: त्वरित 3-चरणीय रेटिना जांच' : 'NETRA X: Rapid 3-Step Eye Screening Workflow'}
                  </h2>
                  <p className="text-xs text-slate-300/90 font-medium">
                    {lang === 'hi'
                      ? 'ग्रामीण स्वास्थ्य शिविरों एवं क्लिनिकों के लिए त्वरित, एआई-सहायित डायबिटिक रेटिनोपैथी जांच'
                      : 'Fast, AI-assisted Diabetic Retinopathy screening designed for rural health camps & clinics'}
                  </p>
                </div>

                {/* Quick Feature Badges */}
                <div className="flex items-center space-x-2 shrink-0 flex-wrap gap-1.5">
                  <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-sky-500/20 text-[11px] text-sky-200 font-semibold shadow-sm">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>15-Sec Scan</span>
                  </div>
                  <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-emerald-500/20 text-[11px] text-emerald-200 font-semibold shadow-sm">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>₹0 Blur Waiver</span>
                  </div>
                </div>
              </div>

              {/* 3 Visual Numbered Steps */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 relative">
                {/* Step 1 */}
                <div className="flex items-start space-x-3 p-3 rounded-xl bg-slate-900/70 border border-sky-500/20 hover:border-sky-400/40 transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-400/40 text-sky-300 flex items-center justify-center font-heading font-black text-xs shrink-0 shadow-[0_0_12px_rgba(56,189,248,0.25)]">
                    1
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-1.5">
                      <Upload className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <h4 className="font-bold text-xs text-white">
                        {lang === 'hi' ? 'आँख का फोटो डालें' : 'Upload Eye Photo'}
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                      {lang === 'hi'
                        ? 'फंडस फोटो अपलोड करें या 1-क्लिक नमूना चुनें'
                        : 'Capture or drag-drop fundus photo (or pick sample case)'}
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start space-x-3 p-3 rounded-xl bg-slate-900/70 border border-amber-500/20 hover:border-amber-400/40 transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center font-heading font-black text-xs shrink-0 shadow-[0_0_12px_rgba(245,158,11,0.25)]">
                    2
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <h4 className="font-bold text-xs text-white">
                        {lang === 'hi' ? 'मरीज़ विवरण भरें' : 'Fill Patient Info'}
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                      {lang === 'hi'
                        ? 'नाम, उम्र एवं जांची गई आँख (OD/OS) दर्ज करें'
                        : 'Enter patient name, age & select evaluated eye (OD/OS)'}
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start space-x-3 p-3 rounded-xl bg-slate-900/70 border border-emerald-500/20 hover:border-emerald-400/40 transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center font-heading font-black text-xs shrink-0 shadow-[0_0_12px_rgba(16,185,129,0.25)]">
                    3
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <h4 className="font-bold text-xs text-white">
                        {lang === 'hi' ? 'त्वरित एआई निदान' : 'Instant AI Screening'}
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                      {lang === 'hi'
                        ? 'ICDR ग्रेड, हीटमैप व द्विभाषी मेडिकल रिपोर्ट प्राप्त करें'
                        : 'Get ICDR Grade 0-4, lesion heatmaps & bilingual PDF'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
              {/* Left Column: Image Upload & Benchmark Selector (5 Cols) */}
              <div className="lg:col-span-5">
                <ImageUploader
                  lang={lang}
                  onAnalyze={handleAnalyze}
                  isLoading={isLoading}
                />
              </div>

              {/* Center & Right Column: Strict State Control (7 Cols) */}
              <div className="lg:col-span-7">
                {iqaRejection ? (
                  /* ON REJECTION (IQA Failure): Show ONLY Prominent Red Rejection Alert */
                  <div className="min-h-[460px] glass-panel p-8 sm:p-12 border-2 border-rose-500/70 bg-rose-950/40 rounded-2xl shadow-2xl flex flex-col items-center justify-center text-center space-y-5 pop-in">
                    <div className="w-16 h-16 rounded-2xl bg-rose-900/60 border border-rose-500/80 flex items-center justify-center text-rose-300 shadow-[0_0_24px_rgba(244,63,94,0.4)]">
                      <ShieldAlert className="w-9 h-9 text-rose-400" />
                    </div>
                    <div className="max-w-md space-y-2.5">
                      <h3 className="font-heading font-black text-base sm:text-lg text-rose-200 uppercase tracking-wide">
                        Quality Check Failed: Retinal Scan Unreadable / Non-Retinal
                      </h3>
                      <p className="text-xs sm:text-sm text-rose-300/90 leading-relaxed font-medium">
                        Image rejected due to severe blur, low illumination, or non-retinal artifact. Diagnosis stopped to prevent medical misdiagnosis. Please capture a clear fundus photo.
                      </p>
                      <div className="pt-2">
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                          ₹0 Waived — Zero-Charge Billing Protection Active
                        </span>
                      </div>
                    </div>
                  </div>
                ) : activeScreening && (activeScreening.iqa?.passed && activeScreening.iqa_passed !== false) ? (
                  /* ANALYZED STATE: Valid Retinal Scan with Diagnostic Layer Engine & Data Cards */
                  <DiagnosticStudio
                    screening={activeScreening}
                    lang={lang}
                    onOpenReview={() => setIsReviewOpen(true)}
                    onOpenReport={() => setIsReportOpen(true)}
                  />
                ) : (
                  /* INITIAL STATE: Animated Calming Retinal Scanner Preview & What AI Checks For Card */
                  <div className="glass-panel p-6 sm:p-8 rounded-2xl shadow-2xl flex flex-col space-y-6 pop-in border border-sky-500/25 bg-slate-950/70">
                    
                    {/* Top Status Header */}
                    <div className="flex items-center justify-between pb-3.5 border-b border-sky-500/15">
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping inline-block" />
                        <span className="text-xs font-mono font-bold text-sky-300 tracking-wider uppercase">
                          {lang === 'hi' ? 'एआई स्कैनर तैयार • स्टैंडबाय' : 'AI Retinal Scanner • Standing By'}
                        </span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-sky-500/15 text-sky-300 border border-sky-500/30 font-semibold">
                        ICDR Gold Standard
                      </span>
                    </div>

                    {/* Center Animated Retinal Radar Graphic */}
                    <div className="py-4 flex flex-col items-center justify-center text-center relative">
                      {/* Floating Ambient Glow Particles */}
                      <div className="absolute top-2 left-1/4 w-2 h-2 rounded-full bg-sky-400/60 blur-[1px] animate-float-1 pointer-events-none" />
                      <div className="absolute bottom-6 right-1/4 w-2.5 h-2.5 rounded-full bg-emerald-400/50 blur-[1px] animate-float-2 pointer-events-none" />
                      <div className="absolute top-1/2 right-12 w-1.5 h-1.5 rounded-full bg-amber-400/50 blur-[1px] animate-float-3 pointer-events-none" />

                      {/* Concentric Rotating Scanner Graphic */}
                      <div className="relative w-36 h-36 sm:w-44 sm:h-44 flex items-center justify-center mb-4">
                        {/* Outer Dotted Rotating Ring */}
                        <div className="absolute inset-0 rounded-full border-2 border-dashed border-sky-400/30 animate-radar-sweep pointer-events-none" />
                        
                        {/* Middle Pulsing Ring */}
                        <div className="absolute inset-3 sm:inset-4 rounded-full border border-sky-400/40 animate-radar-pulse pointer-events-none" />
                        
                        {/* Soft Radial Gradient Glow */}
                        <div className="absolute inset-6 rounded-full bg-sky-500/15 blur-md pointer-events-none" />
                        
                        {/* Inner Pupil Circle with Sweeping Laser Line */}
                        <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-900 border-2 border-sky-400 flex items-center justify-center shadow-[0_0_30px_rgba(56,189,248,0.35)] overflow-hidden">
                          {/* Laser Sweep Beam */}
                          <div className="retinal-laser" />
                          {/* Central Eye Icon */}
                          <Eye className="w-10 h-10 sm:w-12 sm:h-12 text-sky-300 relative z-10" />
                        </div>
                      </div>

                      {/* Headline & Welcoming Guide */}
                      <h3 className="font-heading font-black text-lg sm:text-xl text-white tracking-wide">
                        {lang === 'hi' ? 'रेटिना स्कैन विश्लेषण की प्रतीक्षा है' : 'Awaiting Retinal Scan Analysis'}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-300/90 max-w-lg mt-1.5 leading-relaxed font-medium">
                        {lang === 'hi'
                          ? 'बाईं ओर दी गई गैलरी से कोई 1-क्लिक नमूना चुनें या मरीज की आँख का फोटो अपलोड करें। एआई तुरंत माइक्रोवेसल्स एवं रेटिनोपैथी के लक्षणों की जांच करेगा।'
                          : 'Upload a fundus photograph on the left or select any 1-Click Sample Benchmark to initialize deep inference, Grad-CAM heatmaps, and lesion segmentation.'}
                      </p>
                    </div>

                    {/* 3-Bullet "What AI Checks For" Card */}
                    <div className="bg-slate-900/80 border border-sky-500/20 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>{lang === 'hi' ? 'एआई क्या जांचता है?' : 'What NETRA X AI Checks For:'}</span>
                        </span>
                        <span className="text-[10px] text-sky-400 font-mono">3 Core Clinician Guardrails</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                        {/* Bullet 1 */}
                        <div className="flex items-start space-x-2.5 p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                          <span className="w-5 h-5 rounded-md bg-rose-500/20 border border-rose-500/40 text-rose-300 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">
                            1
                          </span>
                          <div>
                            <h5 className="text-xs font-bold text-white leading-tight">
                              {lang === 'hi' ? 'सूक्ष्म रक्तस्राव' : 'Microaneurysms'}
                            </h5>
                            <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                              {lang === 'hi'
                                ? 'बारीक लाल रक्त धब्बों की पहचान (प्रारंभिक लक्षण)'
                                : 'Pinpoint vascular dilatations & dot-blot hemorrhages'}
                            </p>
                          </div>
                        </div>

                        {/* Bullet 2 */}
                        <div className="flex items-start space-x-2.5 p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                          <span className="w-5 h-5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">
                            2
                          </span>
                          <div>
                            <h5 className="text-xs font-bold text-white leading-tight">
                              {lang === 'hi' ? 'पीले रिसाव व सूजन' : 'Exudates & Swelling'}
                            </h5>
                            <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                              {lang === 'hi'
                                ? 'मैकुला के पास पीले लिपिड धब्बे एवं नसों की सूजन'
                                : 'Hard yellow lipid deposits & soft cotton-wool infarcts'}
                            </p>
                          </div>
                        </div>

                        {/* Bullet 3 */}
                        <div className="flex items-start space-x-2.5 p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                          <span className="w-5 h-5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">
                            3
                          </span>
                          <div>
                            <h5 className="text-xs font-bold text-white leading-tight">
                              {lang === 'hi' ? 'फोटो गुणवत्ता व ₹0 सुरक्षा' : 'IQA Billing Guard'}
                            </h5>
                            <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                              {lang === 'hi'
                                ? 'धुंधली फोटो पर शून्य शुल्क छूट ताकि गलत जांच न हो'
                                : 'Auto-detects blur/glare; ₹0 charged on retake scans'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Camp Operator Quick Action Tip */}
                    <div className="p-3 rounded-xl bg-sky-950/30 border border-sky-500/30 flex items-center justify-between flex-wrap gap-2 text-xs">
                      <div className="flex items-center space-x-2 text-sky-200">
                        <span className="text-base">💡</span>
                        <span className="font-medium">
                          {lang === 'hi'
                            ? 'कैंप ऑपरेटर सुझाव: लाइव डेमो के लिए बाईं ओर "Grade 0: Normal Retina" या "Grade 1: Mild NPDR" पर क्लिक करें।'
                            : 'Camp Operator Tip: Click "Grade 0: Normal Retina" or "Grade 1: Mild NPDR" on the left for a fast 1-second demonstration.'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Clinician Review Queue */}
        {activeTab === 'review' && (
          <div className="space-y-6 pop-in">
            <div className="glass-panel p-6 shadow-2xl flex items-center justify-between rounded-2xl border border-[rgba(70,170,255,0.2)]">
              <div className="flex items-center space-x-3.5">
                <div className="w-11 h-11 rounded-2xl bg-[#35b6ff]/20 text-[#35b6ff] flex items-center justify-center border border-[#35b6ff]/40 shadow-[0_0_16px_rgba(53,182,255,0.25)]">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="font-heading font-black text-xl text-white">
                    Doctor Review & Clinical Triage Queue
                  </h1>
                  <p className="text-xs text-[#9ab0c9] mt-0.5">
                    Ophthalmologist sign-off, AI grade confirmation/override, and clinical referral planning
                  </p>
                </div>
              </div>
            </div>

            <PatientHistoryTable
              screenings={screeningsList}
              lang={lang}
              onSelectScreening={(id) => {
                handleSelectScreening(id);
                setIsReviewOpen(true);
              }}
            />
          </div>
        )}

        {/* Tab 3: Screening Registry & Patient History */}
        {activeTab === 'history' && (
          <PatientHistoryTable
            screenings={screeningsList}
            lang={lang}
            onSelectScreening={handleSelectScreening}
          />
        )}

      </main>

      {/* Doctor Review Verification Modal */}
      {isReviewOpen && activeScreening && (
        <DoctorReviewModal
          screening={activeScreening}
          lang={lang}
          onClose={() => setIsReviewOpen(false)}
          onSuccess={handleReviewSuccess}
        />
      )}

      {/* PDF Report Viewer Modal */}
      {isReportOpen && activeScreening && (
        <ReportModal
          screening={activeScreening}
          lang={lang}
          onClose={() => setIsReportOpen(false)}
        />
      )}

      {/* Clean Minimal Footer */}
      <footer className="border-t border-[rgba(70,170,255,0.15)] bg-[#04070d]/90 backdrop-blur-md py-6 text-center text-xs text-[#9ab0c9] mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-heading font-black text-sm text-white">
              NETRA <span className="text-[#35b6ff]">X</span>
            </span>
            <span className="text-slate-600">•</span>
            <span>Explore. Learn. See Better.</span>
          </div>
          <div className="text-[11px] text-[#9ab0c9]">
            ICDR 5-Grade Standard • Clinical Decision Support System
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
