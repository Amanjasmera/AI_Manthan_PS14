import React from 'react';
import { Eye, Activity, FileText, Stethoscope, ExternalLink } from 'lucide-react';

interface HeaderProps {
  activeTab: 'studio' | 'history' | 'review';
  onTabChange: (tab: 'studio' | 'history' | 'review') => void;
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
            
            {/* Logo & Branding: Strictly "NETRA X" with space and subtitle "Explore. Learn. See Better." */}
            <div
              className="flex items-center space-x-3 cursor-pointer group select-none"
              onClick={() => onTabChange('studio')}
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
            </div>

            {/* Exactly 5 Navigation Items: Cleanly Aligned & Fully Working */}
            <nav className="hidden md:flex items-center space-x-2 bg-[#081222]/80 p-1.5 rounded-full border border-[rgba(70,170,255,0.25)] backdrop-blur-md shadow-lg text-xs font-semibold">
              {/* 1. Diagnostic Studio */}
              <button
                onClick={() => onTabChange('studio')}
                className={`flex items-center space-x-1.5 px-4 py-2 rounded-full transition-all duration-200 ${
                  activeTab === 'studio'
                    ? 'bg-[#35b6ff] text-[#04070d] shadow-[0_0_14px_rgba(53,182,255,0.5)] font-bold'
                    : 'text-[#9ab0c9] hover:text-[#eaf3ff] hover:bg-slate-800/60'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Diagnostic Studio</span>
              </button>

              {/* 2. Doctor Review */}
              <button
                onClick={() => onTabChange('review')}
                className={`flex items-center space-x-1.5 px-4 py-2 rounded-full transition-all duration-200 ${
                  activeTab === 'review'
                    ? 'bg-[#35b6ff] text-[#04070d] shadow-[0_0_14px_rgba(53,182,255,0.5)] font-bold'
                    : 'text-[#9ab0c9] hover:text-[#eaf3ff] hover:bg-slate-800/60'
                }`}
              >
                <Stethoscope className="w-3.5 h-3.5" />
                <span>Doctor Review</span>
              </button>

              {/* 3. Screening Registry */}
              <button
                onClick={() => onTabChange('history')}
                className={`flex items-center space-x-1.5 px-4 py-2 rounded-full transition-all duration-200 ${
                  activeTab === 'history'
                    ? 'bg-[#35b6ff] text-[#04070d] shadow-[0_0_14px_rgba(53,182,255,0.5)] font-bold'
                    : 'text-[#9ab0c9] hover:text-[#eaf3ff] hover:bg-slate-800/60'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Screening Registry</span>
              </button>

              {/* 4. 3D Eye Tour */}
              <a
                href={import.meta.env.PROD ? "https://ai-manthan-ps14.onrender.com/prototype" : "/prototype.html"}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-full text-[#35b6ff] bg-[#35b6ff]/10 hover:bg-[#35b6ff]/20 border border-[#35b6ff]/30 transition-all font-bold"
                title="Launch 3D Eye Interactive Showcase"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>3D Eye Tour ↗</span>
              </a>

              {/* 5. API Docs */}
              <a
                href={import.meta.env.PROD ? "https://ai-manthan-ps14.onrender.com/docs" : "http://localhost:8000/docs"}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-1.5 px-4 py-2 rounded-full text-[#9ab0c9] hover:text-white hover:bg-slate-800/60 transition-all"
                title="FastAPI Interactive Documentation"
              >
                <span>API Docs</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>
            </nav>

          </div>
        </div>
      </header>

      {/* Mobile Floating Bottom Dock (Screen < 768px) */}
      <nav className="md:hidden fixed bottom-3 inset-x-3 z-50 bg-[#081222]/95 backdrop-blur-xl border border-[rgba(70,170,255,0.35)] rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.8)] p-1.5 flex items-center justify-around text-[10px] font-semibold text-[#9ab0c9]">
        <button
          onClick={() => onTabChange('studio')}
          className={`flex flex-col items-center py-1.5 px-2 rounded-xl transition-all ${
            activeTab === 'studio' ? 'text-[#35b6ff] font-bold bg-[#35b6ff]/10' : 'hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4 mb-0.5" />
          <span>Studio</span>
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
          <span>Registry</span>
        </button>

        <a
          href={import.meta.env.PROD ? "https://ai-manthan-ps14.onrender.com/prototype" : "/prototype.html"}
          className="flex flex-col items-center py-1.5 px-2 rounded-xl text-[#35b6ff] hover:text-white"
        >
          <Eye className="w-4 h-4 mb-0.5 text-[#35b6ff]" />
          <span>3D Eye</span>
        </a>

        <a
          href={import.meta.env.PROD ? "https://ai-manthan-ps14.onrender.com/docs" : "http://localhost:8000/docs"}
          target="_blank"
          rel="noreferrer"
          className="flex flex-col items-center py-1.5 px-2 rounded-xl text-[#9ab0c9] hover:text-white"
        >
          <ExternalLink className="w-4 h-4 mb-0.5" />
          <span>API</span>
        </a>
      </nav>
    </>
  );
};
