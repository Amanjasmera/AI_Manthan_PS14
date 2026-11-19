import React from 'react';
import { Eye, Activity, FileText, Stethoscope, Sparkles, UserCheck, Home } from 'lucide-react';

export type NavigationTab = 'intake' | 'studio' | 'demo' | 'review' | 'history';

interface HeaderProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
}) => {
  return (
    <>
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 border-b border-[rgba(70,170,255,0.2)] bg-[#04070d]/85 backdrop-blur-xl transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            
            {/* Logo & Branding - Clicking navigates cleanly to Home landing page */}
            <a
              href="/prototype"
              className="flex items-center space-x-3 cursor-pointer group select-none text-decoration-none"
              title="NETRA X • Return to Home"
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-[#0284c7]/40 via-[#35b6ff]/20 to-[#35b6ff]/40 border border-[#35b6ff]/50 flex items-center justify-center shadow-[0_0_16px_rgba(53,182,255,0.3)] group-hover:shadow-[0_0_24px_rgba(53,182,255,0.6)] transition-all">
                <Eye className="w-5 h-5 sm:w-6 sm:h-6 text-[#35b6ff] group-hover:scale-110 transition-transform" />
              </div>
              <div>
                <span className="font-heading font-black text-xl sm:text-2xl tracking-wider text-white">
                  NETRA <span className="text-[#35b6ff] drop-shadow-[0_0_12px_#35b6ff]">X</span>
                </span>
                <p className="text-[11px] font-sans text-[#9ab0c9] tracking-wide">
                  Explore. Learn. See Better.
                </p>
              </div>
            </a>

            {/* Navigation Items: Clean, High-Contrast & Clearly Separated in exact specified order */}
            <nav className="hidden md:flex items-center space-x-1.5 bg-[#081222]/80 p-1.5 rounded-full border border-[rgba(70,170,255,0.25)] backdrop-blur-md shadow-lg text-xs font-semibold">
              {/* 1. Home (Routes to the main Landing Page) */}
              <a
                href="/prototype"
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-full text-[#9ab0c9] hover:text-[#eaf3ff] hover:bg-slate-800/60 transition-all duration-200"
                title="Return to NETRA X Landing Page"
              >
                <Home className="w-3.5 h-3.5 text-[#35b6ff]" />
                <span>Home</span>
              </a>

              {/* 2. Patient Intake (Step 1: Register Patient) */}
              <button
                type="button"
                onClick={() => onTabChange('intake')}
                className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-full transition-all duration-200 ${
                  activeTab === 'intake'
                    ? 'bg-[#35b6ff] text-[#04070d] shadow-[0_0_14px_rgba(53,182,255,0.5)] font-bold'
                    : 'text-[#9ab0c9] hover:text-[#eaf3ff] hover:bg-slate-800/60'
                }`}
                title="Register Patient Demographics & Symptoms"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Patient Intake</span>
              </button>

              {/* 3. Eye Scan (Step 2: Upload & AI Scan) */}
              <button
                type="button"
                onClick={() => onTabChange('studio')}
                className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-full transition-all duration-200 ${
                  activeTab === 'studio'
                    ? 'bg-[#35b6ff] text-[#04070d] shadow-[0_0_14px_rgba(53,182,255,0.5)] font-bold'
                    : 'text-[#9ab0c9] hover:text-[#eaf3ff] hover:bg-slate-800/60'
                }`}
                title="Upload Retinal Image & Run AI Scan"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Eye Scan</span>
              </button>

              {/* 4. Demo Mode (Sample test cases) */}
              <button
                type="button"
                onClick={() => onTabChange('demo')}
                className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-full transition-all duration-200 ${
                  activeTab === 'demo'
                    ? 'bg-amber-400 text-slate-950 shadow-[0_0_14px_rgba(251,191,36,0.5)] font-black'
                    : 'text-amber-300 hover:text-white hover:bg-amber-950/40'
                }`}
                title="Explore 1-Click Clinical Benchmark Samples"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Demo Mode</span>
              </button>

              {/* 5. Doctor Review (Pending doctor approvals) */}
              <button
                type="button"
                onClick={() => onTabChange('review')}
                className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-full transition-all duration-200 ${
                  activeTab === 'review'
                    ? 'bg-[#35b6ff] text-[#04070d] shadow-[0_0_14px_rgba(53,182,255,0.5)] font-bold'
                    : 'text-[#9ab0c9] hover:text-[#eaf3ff] hover:bg-slate-800/60'
                }`}
                title="Clinician Overrides & Sign-Off"
              >
                <Stethoscope className="w-3.5 h-3.5" />
                <span>Doctor Review</span>
              </button>

              {/* 6. Past Records (Renamed from Screening Registry) */}
              <button
                type="button"
                onClick={() => onTabChange('history')}
                className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-full transition-all duration-200 ${
                  activeTab === 'history'
                    ? 'bg-[#35b6ff] text-[#04070d] shadow-[0_0_14px_rgba(53,182,255,0.5)] font-bold'
                    : 'text-[#9ab0c9] hover:text-[#eaf3ff] hover:bg-slate-800/60'
                }`}
                title="View All Past Screenings & Records"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Past Records</span>
              </button>

              {/* 7. 3D Eye Tour (Routes to the interactive eye tour) */}
              <a
                href="/prototype#p2"
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-full text-[#35b6ff] bg-[#35b6ff]/10 hover:bg-[#35b6ff]/20 border border-[#35b6ff]/30 transition-all font-bold"
                title="Launch 3D Eye Interactive Showcase"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>3D Eye Tour ↗</span>
              </a>
            </nav>

          </div>
        </div>
      </header>

      {/* Mobile Floating Bottom Dock (Screen < 768px) */}
      <nav className="md:hidden fixed bottom-3 inset-x-3 z-50 bg-[#081222]/95 backdrop-blur-xl border border-[rgba(70,170,255,0.35)] rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.8)] p-1.5 flex items-center justify-around text-[10px] font-semibold text-[#9ab0c9]">
        <a
          href="/prototype"
          className="flex flex-col items-center py-1.5 px-2 rounded-xl transition-all hover:text-white"
        >
          <Home className="w-4 h-4 mb-0.5 text-[#35b6ff]" />
          <span>Home</span>
        </a>

        <button
          onClick={() => onTabChange('intake')}
          className={`flex flex-col items-center py-1.5 px-2 rounded-xl transition-all ${
            activeTab === 'intake' ? 'text-[#35b6ff] font-bold bg-[#35b6ff]/10' : 'hover:text-white'
          }`}
        >
          <UserCheck className="w-4 h-4 mb-0.5" />
          <span>Intake</span>
        </button>

        <button
          onClick={() => onTabChange('studio')}
          className={`flex flex-col items-center py-1.5 px-2 rounded-xl transition-all ${
            activeTab === 'studio' ? 'text-[#35b6ff] font-bold bg-[#35b6ff]/10' : 'hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4 mb-0.5" />
          <span>Scan</span>
        </button>

        <button
          onClick={() => onTabChange('demo')}
          className={`flex flex-col items-center py-1.5 px-2 rounded-xl transition-all ${
            activeTab === 'demo' ? 'text-amber-400 font-bold bg-amber-400/10' : 'hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4 mb-0.5 text-amber-400" />
          <span>Demo</span>
        </button>

        <button
          onClick={() => onTabChange('review')}
          className={`flex flex-col items-center py-1.5 px-2 rounded-xl transition-all ${
            activeTab === 'review' ? 'text-[#35b6ff] font-bold bg-[#35b6ff]/10' : 'hover:text-white'
          }`}
        >
          <Stethoscope className="w-4 h-4 mb-0.5" />
          <span>Doctor</span>
        </button>

        <button
          onClick={() => onTabChange('history')}
          className={`flex flex-col items-center py-1.5 px-2 rounded-xl transition-all ${
            activeTab === 'history' ? 'text-[#35b6ff] font-bold bg-[#35b6ff]/10' : 'hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4 mb-0.5" />
          <span>Records</span>
        </button>

        <a
          href="/prototype#p2"
          className="flex flex-col items-center py-1.5 px-2 rounded-xl transition-all text-[#35b6ff]"
          title="3D Eye Tour"
        >
          <Eye className="w-4 h-4 mb-0.5" />
          <span>3D Tour</span>
        </a>
      </nav>
    </>
  );
};
