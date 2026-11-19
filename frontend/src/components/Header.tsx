import React from 'react';
import { Eye, Activity, Stethoscope, Sparkles, UserCheck, Home, LogOut, LogIn, User as UserIcon } from 'lucide-react';
import { UserProfile } from '../types';

export type NavigationTab = 'demo' | 'intake' | 'studio' | 'review' | 'doctor-portal';

interface HeaderProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  currentUser?: UserProfile | null;
  onOpenAuth?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  currentUser,
  onOpenAuth,
  onLogout,
}) => {
  const isDoctor = currentUser?.role?.toLowerCase() === 'doctor';

  return (
    <>
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 border-b border-[rgba(70,170,255,0.2)] bg-[#04070d]/85 backdrop-blur-xl transition-all">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20 gap-2 sm:gap-4">
            
            {/* Logo & Branding - Clicking navigates cleanly to Home landing page */}
            <a
              href="/prototype"
              className="flex items-center space-x-2.5 sm:space-x-3 cursor-pointer group select-none text-decoration-none shrink-0"
              title="NETRA X • Return to Home"
            >
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-[#0284c7]/40 via-[#35b6ff]/20 to-[#35b6ff]/40 border border-[#35b6ff]/50 flex items-center justify-center shadow-[0_0_16px_rgba(53,182,255,0.3)] group-hover:shadow-[0_0_24px_rgba(53,182,255,0.6)] transition-all">
                <Eye className="w-5 h-5 sm:w-6 sm:h-6 text-[#35b6ff] group-hover:scale-110 transition-transform" />
              </div>
              <div>
                <span className="font-heading font-black text-lg sm:text-2xl tracking-wider text-white">
                  NETRA <span className="text-[#35b6ff] drop-shadow-[0_0_12px_#35b6ff]">X</span>
                </span>
                <p className="text-[10px] sm:text-[11px] font-sans text-[#9ab0c9] tracking-wide hidden sm:block">
                  Explore. Learn. See Better.
                </p>
              </div>
            </a>

            {/* Navigation Items: Ordered with Home & Demo Mode Together, Past Records Removed */}
            <nav className="hidden lg:flex items-center space-x-1 sm:space-x-1.5 bg-[#081222]/80 p-1.5 rounded-full border border-[rgba(70,170,255,0.25)] backdrop-blur-md shadow-lg text-xs font-semibold whitespace-nowrap">
              {/* 1. Home (Routes to the main Landing Page) */}
              <a
                href="/prototype"
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-[#9ab0c9] hover:text-[#eaf3ff] hover:bg-slate-800/60 transition-all duration-200 whitespace-nowrap"
                title="Return to NETRA X Landing Page"
              >
                <Home className="w-3.5 h-3.5 text-[#35b6ff] shrink-0" />
                <span className="whitespace-nowrap">Home</span>
              </a>

              {/* 2. Demo Mode (Placed right next to Home) */}
              <button
                type="button"
                onClick={() => onTabChange('demo')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full transition-all duration-200 whitespace-nowrap ${
                  activeTab === 'demo'
                    ? 'bg-amber-400 text-slate-950 shadow-[0_0_14px_rgba(251,191,36,0.5)] font-black'
                    : 'text-amber-300 hover:text-white hover:bg-amber-950/40'
                }`}
                title="Explore 1-Click Clinical Benchmark Samples (No Login / No DB Required)"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="whitespace-nowrap">Demo Mode</span>
              </button>

              {/* 3. Patient Intake (Step 1: Register Patient - Auth Required) */}
              <button
                type="button"
                onClick={() => onTabChange('intake')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full transition-all duration-200 whitespace-nowrap ${
                  activeTab === 'intake'
                    ? 'bg-[#35b6ff] text-[#04070d] shadow-[0_0_14px_rgba(53,182,255,0.5)] font-bold'
                    : 'text-[#9ab0c9] hover:text-[#eaf3ff] hover:bg-slate-800/60'
                }`}
                title="Register Patient Demographics & Symptoms (Login Required)"
              >
                <UserCheck className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">Patient Intake</span>
              </button>

              {/* 4. Eye Scan (Step 2: Upload & AI Scan - Auth Required) */}
              <button
                type="button"
                onClick={() => onTabChange('studio')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full transition-all duration-200 whitespace-nowrap ${
                  activeTab === 'studio'
                    ? 'bg-[#35b6ff] text-[#04070d] shadow-[0_0_14px_rgba(53,182,255,0.5)] font-bold'
                    : 'text-[#9ab0c9] hover:text-[#eaf3ff] hover:bg-slate-800/60'
                }`}
                title="Upload Retinal Image & Run AI Scan (Login Required)"
              >
                <Activity className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">Eye Scan</span>
              </button>

              {/* 5. Doctor Review (Clinician Overrides & Sign-Off - Auth Required) */}
              <button
                type="button"
                onClick={() => onTabChange('review')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full transition-all duration-200 whitespace-nowrap ${
                  activeTab === 'review'
                    ? 'bg-[#35b6ff] text-[#04070d] shadow-[0_0_14px_rgba(53,182,255,0.5)] font-bold'
                    : 'text-[#9ab0c9] hover:text-[#eaf3ff] hover:bg-slate-800/60'
                }`}
                title="Doctor Review & Sign-Off (Login Required)"
              >
                <Stethoscope className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">Doctor Review</span>
              </button>

              {/* 6. Doctor Portal: Strictly displayed ONLY for authenticated doctors */}
              {isDoctor && (
                <button
                  type="button"
                  onClick={() => onTabChange('doctor-portal')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full transition-all duration-200 whitespace-nowrap ${
                    activeTab === 'doctor-portal'
                      ? 'bg-teal-500 text-slate-950 shadow-[0_0_14px_rgba(20,184,166,0.5)] font-black'
                      : 'text-teal-300 hover:text-white hover:bg-teal-950/40'
                  }`}
                  title="Ophthalmologist Portal & Patient Review Queue"
                >
                  <Stethoscope className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  <span className="whitespace-nowrap">Doctor Portal</span>
                </button>
              )}
            </nav>

            {/* Right-Side User Profile, Full Name (No Clipping) & Logout */}
            <div className="flex items-center space-x-2 shrink-0 flex-shrink-0 whitespace-nowrap">
              {currentUser ? (
                <div className="flex items-center space-x-2.5 bg-[#081222]/95 border border-[rgba(70,170,255,0.3)] rounded-full py-1.5 pl-2.5 pr-3 shadow-lg flex-shrink-0 whitespace-nowrap">
                  {isDoctor ? (
                    <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shadow-[0_0_8px_rgba(52,211,153,0.25)] shrink-0 whitespace-nowrap">
                      <Stethoscope className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Doctor</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/20 text-sky-300 border border-sky-400/40 shadow-[0_0_8px_rgba(56,189,248,0.25)] shrink-0 whitespace-nowrap">
                      <UserIcon className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span>Health Worker</span>
                    </span>
                  )}

                  {/* Full logged-in Doctor / User Name with zero clipping */}
                  <span className="text-xs font-bold text-white whitespace-nowrap shrink-0">
                    {currentUser.full_name}
                  </span>

                  <button
                    type="button"
                    onClick={onLogout}
                    className="p-1 rounded-full text-[#9ab0c9] hover:text-rose-400 hover:bg-rose-950/50 transition-colors shrink-0"
                    title="Logout / Sign Out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-full bg-[#35b6ff]/20 hover:bg-[#35b6ff]/30 border border-[#35b6ff]/50 text-[#35b6ff] hover:text-white text-xs font-bold transition-all shadow-[0_0_12px_rgba(53,182,255,0.25)] shrink-0 whitespace-nowrap"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* Mobile Floating Bottom Dock (Screen < 1024px) */}
      <nav className="lg:hidden fixed bottom-3 inset-x-3 z-50 bg-[#081222]/95 backdrop-blur-xl border border-[rgba(70,170,255,0.35)] rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.8)] p-1.5 flex items-center justify-around text-[10px] font-semibold text-[#9ab0c9] whitespace-nowrap">
        <a
          href="/prototype"
          className="flex flex-col items-center py-1.5 px-2 rounded-xl transition-all hover:text-white whitespace-nowrap"
        >
          <Home className="w-4 h-4 mb-0.5 text-[#35b6ff]" />
          <span>Home</span>
        </a>

        <button
          onClick={() => onTabChange('demo')}
          className={`flex flex-col items-center py-1.5 px-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'demo' ? 'text-amber-400 font-bold bg-amber-400/10' : 'hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4 mb-0.5 text-amber-400" />
          <span>Demo</span>
        </button>

        <button
          onClick={() => onTabChange('intake')}
          className={`flex flex-col items-center py-1.5 px-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'intake' ? 'text-[#35b6ff] font-bold bg-[#35b6ff]/10' : 'hover:text-white'
          }`}
        >
          <UserCheck className="w-4 h-4 mb-0.5" />
          <span>Intake</span>
        </button>

        <button
          onClick={() => onTabChange('studio')}
          className={`flex flex-col items-center py-1.5 px-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'studio' ? 'text-[#35b6ff] font-bold bg-[#35b6ff]/10' : 'hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4 mb-0.5" />
          <span>Scan</span>
        </button>

        <button
          onClick={() => onTabChange('review')}
          className={`flex flex-col items-center py-1.5 px-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'review' ? 'text-[#35b6ff] font-bold bg-[#35b6ff]/10' : 'hover:text-white'
          }`}
        >
          <Stethoscope className="w-4 h-4 mb-0.5" />
          <span>Review</span>
        </button>

        {isDoctor && (
          <button
            onClick={() => onTabChange('doctor-portal')}
            className={`flex flex-col items-center py-1.5 px-2 rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'doctor-portal' ? 'text-teal-400 font-bold bg-teal-500/10' : 'hover:text-white'
            }`}
          >
            <Stethoscope className="w-4 h-4 mb-0.5 text-teal-400" />
            <span>Portal</span>
          </button>
        )}
      </nav>
    </>
  );
};
