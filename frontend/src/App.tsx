import React, { useState, useEffect } from 'react';
import { Header, NavigationTab } from './components/Header';
import { HomeView } from './components/HomeView';
import { PatientIntake, ActivePatientState } from './components/PatientIntake';
import { DemoModeView } from './components/DemoModeView';
import { ImageUploader } from './components/ImageUploader';
import { DiagnosticStudio } from './components/DiagnosticStudio';
import { PatientHistoryTable } from './components/PatientHistoryTable';
import { DoctorReviewModal } from './components/DoctorReviewModal';
import { ReportModal } from './components/ReportModal';
import { AuthModal } from './components/AuthModal';
import { DoctorPortal } from './components/DoctorPortal';
import { Language } from './utils/language';
import { ScreeningDetail, ScreeningListItem, UserProfile } from './types';
import { uploadAndAnalyzeScreening, listScreenings, getScreeningDetail, getStoredUser, clearAuthSession } from './services/api';
import { Stethoscope, AlertTriangle, Eye, ShieldAlert, LogIn, Lock } from 'lucide-react';

const initialPatientState: ActivePatientState = {
  name: 'Rajesh Sharma',
  age: 58,
  gender: 'Male',
  eyeSide: 'RIGHT',
  historyItems: ['Diabetes (Type 1 or 2)'],
  historyNote: '7 yrs, on metformin',
  symptomsItems: ['Blurred Vision'],
  symptomsNote: 'Noticeable for last 2 months',
  combinedHistory: 'Diabetes (Type 1 or 2) (7 yrs, on metformin) • Symptoms: Blurred Vision [Noticeable for last 2 months]',
};

export default function App() {
  const [lang, setLang] = useState<Language>('en');

  // Authentication & RBAC User State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => getStoredUser());
  const [authRolePref, setAuthRolePref] = useState<'user' | 'doctor'>('user');
  const [authNoticeMessage, setAuthNoticeMessage] = useState<string | null>(null);

  const isDoctor = currentUser?.role?.toLowerCase() === 'doctor';

  // Default active tab based on role and URL parameters
  const [activeTab, setActiveTab] = useState<NavigationTab>(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab') as NavigationTab | null;
    const user = getStoredUser();

    if (user) {
      if (user.role?.toLowerCase() === 'doctor') {
        if (tabParam && ['doctor-portal', 'home', 'demo'].includes(tabParam)) {
          return tabParam;
        }
        return 'doctor-portal';
      } else {
        if (tabParam && ['home', 'demo', 'intake', 'studio', 'review'].includes(tabParam)) {
          return tabParam;
        }
        return 'intake';
      }
    }

    // Guest / Unauthenticated: Default to 'home', or 'demo' if explicitly requested
    if (tabParam === 'demo') {
      return 'demo';
    }
    return 'home';
  });

  // Active patient demographics & symptoms from Intake
  const [activePatient, setActivePatient] = useState<ActivePatientState>(initialPatientState);

  // Screening inference state
  const [activeScreening, setActiveScreening] = useState<ScreeningDetail | null>(null);
  const [screeningsList, setScreeningsList] = useState<ScreeningListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [iqaRejection, setIqaRejection] = useState<string | null>(null);

  // Modals
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const handleAuthSuccess = (user: UserProfile, _token: string) => {
    setCurrentUser(user);
    setAuthNoticeMessage(null);
    if (user.role?.toLowerCase() === 'doctor') {
      handleTabChange('doctor-portal');
    } else {
      handleTabChange('intake');
    }
    loadInitialData();
  };

  const handleLogout = () => {
    clearAuthSession();
    setCurrentUser(null);
    setAuthNoticeMessage(null);
    setActiveTab('home');
    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'home');
    window.history.replaceState({}, '', url.toString());
    loadInitialData();
  };

  // Fetch initial screening registry list if user is logged in
  const loadInitialData = async () => {
    try {
      const res = await listScreenings(1, 50);
      setScreeningsList(res.items);
    } catch (e) {
      console.warn('Initial screenings load notice:', e);
    }
  };

  useEffect(() => {
    loadInitialData();
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab') as NavigationTab | null;
    const user = getStoredUser();

    if (!user) {
      // If unauthenticated visitor tries to access any protected tab via URL
      if (tabParam && ['intake', 'studio', 'review', 'doctor-portal'].includes(tabParam)) {
        setActiveTab('home');
        setAuthRolePref(tabParam === 'doctor-portal' ? 'doctor' : 'user');
        setAuthNoticeMessage("Please log in to access this feature.");
        setIsAuthOpen(true);
        const url = new URL(window.location.href);
        url.searchParams.set('tab', 'home');
        window.history.replaceState({}, '', url.toString());
      }
    } else if (user.role?.toLowerCase() !== 'doctor' && tabParam === 'doctor-portal') {
      // User trying to access doctor portal
      setActiveTab('intake');
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'intake');
      window.history.replaceState({}, '', url.toString());
    } else if (user.role?.toLowerCase() === 'doctor' && tabParam && ['intake', 'studio', 'review'].includes(tabParam)) {
      // Doctor trying to access user intake tabs
      setActiveTab('doctor-portal');
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'doctor-portal');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const handleTabChange = (tab: NavigationTab) => {
    // 1. Public Access: 'home' and 'demo' are open to everyone without login
    if (tab === 'home' || tab === 'demo') {
      setActiveTab(tab);
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState({}, '', url.toString());
      return;
    }

    // 2. Strict Login Gate: 'intake', 'studio', 'review', and 'doctor-portal' require login
    if (!currentUser) {
      setAuthRolePref(tab === 'doctor-portal' ? 'doctor' : 'user');
      setAuthNoticeMessage("Please log in to access this feature.");
      setIsAuthOpen(true);
      return;
    }

    // 3. Doctor Portal Gate: strictly requires doctor role
    if (tab === 'doctor-portal') {
      if (currentUser.role?.toLowerCase() !== 'doctor') {
        setError("Access Denied: The Doctor Portal is restricted exclusively to certified ophthalmologists.");
        return;
      }
    }

    // 4. Clinician Workspace Focus: Doctors stay focused in doctor-portal
    if (currentUser.role?.toLowerCase() === 'doctor' && ['intake', 'studio', 'review'].includes(tab)) {
      setActiveTab('doctor-portal');
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'doctor-portal');
      window.history.replaceState({}, '', url.toString());
      return;
    }

    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState({}, '', url.toString());
  };

  // In-Memory Benchmark Case Selection (Pure In-Memory, No DB writes required)
  const handleSelectDemoCase = (detail: ScreeningDetail | null, iqaError: string | null) => {
    if (iqaError) {
      setActiveScreening(null);
      setIqaRejection(iqaError);
    } else {
      setActiveScreening(detail);
      setIqaRejection(null);
    }
    setError(null);
  };

  const handleAnalyze = async (formData: FormData) => {
    if (!currentUser) {
      setAuthRolePref('user');
      setAuthNoticeMessage("Please log in to access this feature.");
      setIsAuthOpen(true);
      return;
    }

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

      if (activeTab === 'intake') {
        setActiveTab('studio');
      }

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
      {/* Top Header: NETRA X Dynamic Role-Based Navigation Bar */}
      <Header
        activeTab={activeTab}
        onTabChange={handleTabChange}
        currentUser={currentUser}
        onOpenAuth={() => {
          setAuthRolePref('user');
          setAuthNoticeMessage(null);
          setIsAuthOpen(true);
        }}
        onLogout={handleLogout}
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

        {/* Guest Lock Screen Barrier if guest somehow lands on protected tabs */}
        {!currentUser && !['home', 'demo'].includes(activeTab) && (
          <div className="min-h-[500px] flex items-center justify-center p-4">
            <div className="max-w-md w-full p-8 rounded-3xl bg-[#0F172A] border border-sky-500/30 text-center shadow-2xl space-y-5 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 mx-auto flex items-center justify-center">
                <Lock className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white font-heading">Sign In Required</h2>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Patient Intake, Live Scanning, and Doctor Reviews are protected features. Please sign in to access clinical workflows, or explore Demo Mode freely without an account.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthRolePref('user');
                    setAuthNoticeMessage("Please log in to access this feature.");
                    setIsAuthOpen(true);
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-sky-500/20 flex items-center justify-center space-x-1.5"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In / Register</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTabChange('demo')}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition-colors"
                >
                  Explore Demo Mode
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 0: CLUTTER-FREE HOME / LANDING PAGE (Public) */}
        {activeTab === 'home' && (
          <HomeView
            currentUser={currentUser}
            onNavigateTab={handleTabChange}
            onOpenAuthWithRole={(role) => {
              setAuthRolePref(role);
              setAuthNoticeMessage(null);
              setIsAuthOpen(true);
            }}
          />
        )}

        {/* VIEW 1: DEDICATED DEMO MODE (Public, 100% In-Memory, No DB Required) */}
        {activeTab === 'demo' && (
          <DemoModeView
            lang={lang}
            onSelectSampleCase={handleSelectDemoCase}
            isLoading={isLoading}
            activeScreening={activeScreening}
            iqaRejection={iqaRejection}
            onOpenReview={() => {
              if (!currentUser) {
                setAuthRolePref('user');
                setAuthNoticeMessage("Please log in to access this feature.");
                setIsAuthOpen(true);
              } else {
                setIsReviewOpen(true);
              }
            }}
            onOpenReport={() => setIsReportOpen(true)}
            onSwitchToIntake={() => handleTabChange('intake')}
          />
        )}

        {/* VIEW 2: PATIENT INTAKE (Step 1 Entry for Real Patients - Logged In Users Only) */}
        {currentUser && !isDoctor && activeTab === 'intake' && (
          <PatientIntake
            lang={lang}
            initialPatient={activePatient}
            onSaveAndProceed={(patient) => {
              setActivePatient(patient);
              setActiveTab('studio');
            }}
            onSwitchToDemo={() => handleTabChange('demo')}
          />
        )}

        {/* VIEW 3: DIAGNOSTIC STUDIO (Focused Scan & Results - Logged In Users Only) */}
        {currentUser && !isDoctor && activeTab === 'studio' && (
          <div className="space-y-6 pop-in">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
              
              {/* Left Column: Focused Image Upload & IQA (5 Cols) */}
              <div className="lg:col-span-5">
                <ImageUploader
                  lang={lang}
                  patient={activePatient}
                  onAnalyze={handleAnalyze}
                  isLoading={isLoading}
                  onEditPatient={() => setActiveTab('intake')}
                />
              </div>

              {/* Right Column: Clean Results Canvas (7 Cols) */}
              <div className="lg:col-span-7">
                {isLoading ? (
                  <div className="min-h-[460px] glass-panel p-8 sm:p-12 rounded-2xl shadow-2xl flex flex-col items-center justify-center text-center space-y-5 border border-sky-500/30 bg-slate-950/80 pop-in">
                    <div className="relative w-28 h-28 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full border-2 border-dashed border-sky-400 animate-radar-sweep" />
                      <div className="absolute inset-3 rounded-full border border-sky-400/50 animate-radar-pulse" />
                      <div className="w-14 h-14 rounded-full bg-slate-900 border-2 border-sky-400 flex items-center justify-center text-sky-300 shadow-[0_0_24px_rgba(56,189,248,0.5)]">
                        <Eye className="w-7 h-7 text-sky-400 animate-pulse" />
                      </div>
                    </div>
                    <div className="space-y-1.5 max-w-sm">
                      <h3 className="font-heading font-black text-base text-white">
                        {lang === 'hi' ? 'एआई सूक्ष्मरक्तवाहिका विश्लेषण जारी है...' : 'Analyzing Retinal Microvasculature...'}
                      </h3>
                      <p className="text-xs text-sky-300 font-medium animate-pulse">
                        {lang === 'hi' ? 'कृपया प्रतीक्षा करें • 15 सेकंड में क्लिनिकल ग्रेडिंग' : 'Evaluating lesions, Grad-CAM heatmaps & ICDR grade (15s)'}
                      </p>
                    </div>
                  </div>
                ) : iqaRejection ? (
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
                  <DiagnosticStudio
                    screening={activeScreening}
                    lang={lang}
                    userRole={currentUser?.role}
                    onOpenReview={() => setIsReviewOpen(true)}
                    onOpenReport={() => setIsReportOpen(true)}
                    onUpdateScreening={(updated) => {
                      setActiveScreening(updated);
                      listScreenings(1, 50).then((res) => setScreeningsList(res.items));
                    }}
                  />
                ) : (
                  <div className="min-h-[460px] glass-panel p-8 sm:p-12 rounded-2xl shadow-2xl flex flex-col items-center justify-center text-center text-slate-400 space-y-4 pop-in border border-sky-500/25 bg-slate-950/70">
                    <div className="relative w-24 h-24 flex items-center justify-center mb-2">
                      <div className="absolute inset-0 rounded-full border border-dashed border-sky-500/30 animate-radar-sweep pointer-events-none" />
                      <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-[0_0_20px_rgba(53,182,255,0.25)]">
                        <Eye className="w-8 h-8" />
                      </div>
                    </div>
                    <div className="max-w-md space-y-2">
                      <h3 className="font-heading font-black text-lg text-white">
                        {lang === 'hi' ? 'आँख की फोटो अपलोड करें (Ready for Eye Scan)' : 'Ready for Eye Scan (आँख की फोटो अपलोड करें)'}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                        {lang === 'hi'
                          ? `बाईं ओर मरीज ${activePatient.name} की ${activePatient.eyeSide === 'RIGHT' ? 'दाहिनी आँख (OD)' : 'बाईं आँख (OS)'} का फोटो अपलोड कर विश्लेषण प्रारंभ करें।`
                          : `Upload a fundus photograph on the left for patient ${activePatient.name} (${activePatient.eyeSide === 'RIGHT' ? 'Right Eye - OD' : 'Left Eye - OS'}) to initiate automated AI grading.`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 4: CLINICIAN REVIEW QUEUE (Logged In Users Only) */}
        {currentUser && !isDoctor && activeTab === 'review' && (
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

        {/* VIEW 5: DEDICATED REAL-WORLD DOCTOR PORTAL (Clinician Workspace - Doctors Only) */}
        {currentUser && isDoctor && activeTab === 'doctor-portal' && (
          <DoctorPortal
            onNavigateHome={() => handleTabChange('home')}
            onOpenLoginModal={() => {
              setAuthRolePref('doctor');
              setAuthNoticeMessage(null);
              setIsAuthOpen(true);
            }}
          />
        )}

      </main>

      {/* Doctor Review Modal */}
      {isReviewOpen && activeScreening && (
        <DoctorReviewModal
          screening={activeScreening}
          lang={lang}
          onClose={() => setIsReviewOpen(false)}
          onSuccess={handleReviewSuccess}
        />
      )}

      {/* Clinical PDF Report Modal */}
      {isReportOpen && activeScreening && (
        <ReportModal
          screening={activeScreening}
          lang={lang}
          onClose={() => setIsReportOpen(false)}
        />
      )}

      {/* Role-Based Authentication & Registration Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => {
          setIsAuthOpen(false);
          setAuthNoticeMessage(null);
        }}
        onAuthSuccess={handleAuthSuccess}
        initialRole={authRolePref}
        noticeMessage={authNoticeMessage || undefined}
      />
    </div>
  );
}
