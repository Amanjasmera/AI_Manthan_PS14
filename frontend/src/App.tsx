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
import { Stethoscope, AlertTriangle, Eye, ShieldAlert } from 'lucide-react';

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
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
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
                  /* INITIAL STATE: Awaiting Retinal Scan Analysis Empty State Card */
                  <div className="min-h-[460px] glass-panel p-8 sm:p-12 rounded-2xl shadow-2xl flex flex-col items-center justify-center text-center text-[#9ab0c9] space-y-4 pop-in border border-[rgba(70,170,255,0.2)]">
                    <div className="w-16 h-16 rounded-2xl bg-[#081222] border border-[rgba(70,170,255,0.3)] flex items-center justify-center text-[#35b6ff] shadow-[0_0_20px_rgba(53,182,255,0.25)]">
                      <Eye className="w-8 h-8" />
                    </div>
                    <div className="max-w-md space-y-2">
                      <h3 className="font-heading font-black text-lg text-white">
                        Awaiting Retinal Scan Analysis
                      </h3>
                      <p className="text-xs sm:text-sm text-[#9ab0c9] leading-relaxed">
                        Upload a fundus photograph on the left or select any sample clinical benchmark to initialize deep inference & explainability maps.
                      </p>
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
