import React, { useState } from 'react';
import { 
  Eye, Activity, Stethoscope, Sparkles, UserCheck, ShieldCheck, 
  ArrowRight, CheckCircle2, ChevronRight, User as UserIcon, LogIn,
  Scan, Info, Zap
} from 'lucide-react';
import { UserProfile } from '../types';

interface HomeViewProps {
  currentUser?: UserProfile | null;
  onNavigateTab: (tab: 'demo' | 'intake' | 'studio' | 'review' | 'doctor-portal') => void;
  onOpenAuthWithRole: (role: 'user' | 'doctor') => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  currentUser,
  onNavigateTab,
  onOpenAuthWithRole
}) => {
  const isDoctor = currentUser?.role?.toLowerCase() === 'doctor';
  const [activeHotspot, setActiveHotspot] = useState<'disc' | 'vessels' | 'macula' | null>(null);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-14 sm:space-y-20 py-4 sm:py-8 animate-fade-in">
      
      {/* =========================================================================
          SECTION 1: RESTORED ORIGINAL EYE HERO SECTION (Visual & Interactive)
          ========================================================================= */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#0B132B]/80 via-[#0F172A]/90 to-[#0F172A] border border-sky-500/20 p-6 sm:p-10 lg:p-12 shadow-2xl">
        {/* Ambient background glow */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-10 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center relative z-10">
          
          {/* Left Column: Original Hero Copy & CTAs */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-semibold shadow-[0_0_15px_rgba(56,189,248,0.2)]">
              <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>Automated Retinal Microvasculature Screening System</span>
            </div>

            {/* Restored Original Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white font-heading tracking-tight leading-[1.15]">
              Diabetic retinopathy is{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-300 to-teal-300 drop-shadow-[0_0_20px_rgba(56,189,248,0.4)]">
                silent until it is late.
              </span>
            </h1>

            {/* Restored Original Subtext */}
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-sans max-w-xl">
              It is a leading cause of preventable blindness, yet rural and underserved clinics rarely have an eye specialist. Netra X turns one fundus photograph into a severity grade, lesion outlines and a heatmap that shows its reasoning.
            </p>

            {/* Restored Feature Pills */}
            <div className="flex flex-wrap gap-2.5 pt-1">
              <span className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-sky-950/60 text-sky-300 border border-sky-500/30 shadow-sm flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                <span>5-stage grading</span>
              </span>
              <span className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 shadow-sm flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span>Lesion segmentation</span>
              </span>
              <span className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-teal-950/60 text-teal-300 border border-teal-500/30 shadow-sm flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                <span>Explainable heatmaps</span>
              </span>
            </div>

            {/* Hero Action Buttons */}
            <div className="pt-3 flex flex-wrap items-center gap-3.5">
              <button
                type="button"
                onClick={() => onNavigateTab('demo')}
                className="px-7 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm transition-all shadow-[0_0_24px_rgba(251,191,36,0.4)] hover:shadow-[0_0_32px_rgba(251,191,36,0.6)] active:scale-95 flex items-center space-x-2.5"
              >
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>Try Demo Mode (No Login Required)</span>
                <ArrowRight className="w-4 h-4 text-slate-950" />
              </button>

              {currentUser ? (
                <button
                  type="button"
                  onClick={() => onNavigateTab(isDoctor ? 'doctor-portal' : 'intake')}
                  className="px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-white font-bold text-sm transition-all flex items-center space-x-2"
                >
                  <span>Go to {isDoctor ? 'Doctor Portal' : 'Patient Intake'}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              ) : (
                <a
                  href="#portal-selection"
                  className="px-5 py-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800/90 border border-white/10 text-slate-300 hover:text-white font-semibold text-xs sm:text-sm transition-all flex items-center space-x-2"
                >
                  <span>Choose Portal Below</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </a>
              )}
            </div>
          </div>

          {/* Right Column: Interactive Animated Eye & Retinal Scanner Showcase */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            <div className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-full p-2 bg-gradient-to-tr from-sky-500/20 via-cyan-500/10 to-teal-500/20 border border-sky-500/30 shadow-[0_0_50px_rgba(56,189,248,0.25)] flex items-center justify-center">
              
              {/* Outer Radar Ring */}
              <div className="absolute inset-0 rounded-full border border-dashed border-sky-400/40 animate-[spin_20s_linear_infinite]" />
              
              {/* Pulsing Concentric Ring */}
              <div className="absolute inset-4 rounded-full border border-sky-500/20 animate-pulse" />
              <div className="absolute inset-8 rounded-full border border-cyan-500/20" />

              {/* Retinal Fundus Core Display */}
              <div className="relative w-48 h-48 sm:w-60 sm:h-60 rounded-full overflow-hidden bg-gradient-to-br from-[#4a0808] via-[#781717] to-[#1a0202] shadow-inner flex items-center justify-center border-2 border-amber-500/30">
                
                {/* Retinal vascular tree pattern background */}
                <svg className="absolute inset-0 w-full h-full opacity-65 pointer-events-none" viewBox="0 0 200 200">
                  <circle cx="100" cy="100" r="95" fill="none" stroke="rgba(255,100,50,0.15)" strokeWidth="1" />
                  {/* Blood vessels radiating from optic disc (cx=65, cy=95) */}
                  <path d="M65,95 Q80,70 120,50 T180,40" fill="none" stroke="#e11d48" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M65,95 Q90,90 140,90 T185,95" fill="none" stroke="#be123c" strokeWidth="2.2" strokeLinecap="round" />
                  <path d="M65,95 Q80,120 125,145 T175,165" fill="none" stroke="#e11d48" strokeWidth="2.4" strokeLinecap="round" />
                  <path d="M65,95 Q50,70 30,55 T15,45" fill="none" stroke="#be123c" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M65,95 Q50,115 35,140 T20,160" fill="none" stroke="#e11d48" strokeWidth="1.8" strokeLinecap="round" />
                  {/* Capillary branches */}
                  <path d="M110,55 Q130,40 150,35" fill="none" stroke="#fda4af" strokeWidth="1" strokeDasharray="3 2" />
                  <path d="M120,140 Q145,150 160,160" fill="none" stroke="#fda4af" strokeWidth="1" strokeDasharray="3 2" />
                </svg>

                {/* Vertical Scanning Pulse Line */}
                <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-[bounce_3s_ease-in-out_infinite] opacity-80 pointer-events-none" />

                {/* Hotspot 1: Optic Disc */}
                <button
                  type="button"
                  onMouseEnter={() => setActiveHotspot('disc')}
                  onMouseLeave={() => setActiveHotspot(null)}
                  onClick={() => setActiveHotspot(activeHotspot === 'disc' ? null : 'disc')}
                  className="absolute top-[42%] left-[28%] w-8 h-8 rounded-full bg-amber-200/90 shadow-[0_0_18px_#fde047] border border-amber-300 flex items-center justify-center transition-transform hover:scale-125 focus:outline-none"
                  title="Optic Disc"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-600 animate-ping" />
                </button>

                {/* Hotspot 2: Vascular Arcades */}
                <button
                  type="button"
                  onMouseEnter={() => setActiveHotspot('vessels')}
                  onMouseLeave={() => setActiveHotspot(null)}
                  onClick={() => setActiveHotspot(activeHotspot === 'vessels' ? null : 'vessels')}
                  className="absolute top-[26%] right-[32%] w-5 h-5 rounded-full bg-rose-500/80 shadow-[0_0_12px_#f43f5e] border border-rose-300 flex items-center justify-center transition-transform hover:scale-125 focus:outline-none"
                  title="Vascular Arcade"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                </button>

                {/* Hotspot 3: Macula & Fovea */}
                <button
                  type="button"
                  onMouseEnter={() => setActiveHotspot('macula')}
                  onMouseLeave={() => setActiveHotspot(null)}
                  onClick={() => setActiveHotspot(activeHotspot === 'macula' ? null : 'macula')}
                  className="absolute top-[52%] right-[30%] w-6 h-6 rounded-full bg-amber-500/40 border border-amber-400/80 shadow-[0_0_10px_#f59e0b] flex items-center justify-center transition-transform hover:scale-125 focus:outline-none"
                  title="Macula (Central Vision)"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />
                </button>

                {/* HUD Crosshairs */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-24 h-24 border border-cyan-400/30 rounded-full" />
                  <div className="absolute w-full h-[1px] bg-cyan-400/20" />
                  <div className="absolute h-full w-[1px] bg-cyan-400/20" />
                </div>
              </div>

              {/* Interactive Telemetry Pill (Changes on hotspot interaction) */}
              <div className="absolute -bottom-4 bg-slate-900/95 border border-sky-500/40 px-3.5 py-1.5 rounded-full shadow-lg text-[11px] font-mono text-sky-300 flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>
                  {activeHotspot === 'disc' && 'Optic Disc: Normal Margin (0.3 CDR)'}
                  {activeHotspot === 'vessels' && 'Vessels: Caliber & Branching Monitored'}
                  {activeHotspot === 'macula' && 'Macula: Hard Exudate Guard Active'}
                  {!activeHotspot && 'AI Telemetry: Live Saliency Active'}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-6 font-mono text-center flex items-center space-x-1.5">
              <Scan className="w-3.5 h-3.5 text-sky-400" />
              <span>Interactive Retinal HUD • Hover landmarks to inspect</span>
            </p>
          </div>

        </div>
      </section>


      {/* =========================================================================
          SECTION 2: CHOOSE YOUR PORTAL TO CONTINUE (Directly Below Eye Hero)
          ========================================================================= */}
      <section id="portal-selection" className="space-y-6 pt-2">
        <div className="text-center space-y-1.5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-teal-400 font-mono">
            Role-Specific Workspaces
          </h2>
          <p className="text-2xl sm:text-3xl font-bold text-white font-heading">
            Choose Your Portal to Continue
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card 1: Patients & Health Workers */}
          <div className="p-7 sm:p-8 rounded-3xl bg-gradient-to-b from-[#0F172A] to-[#0b1222] border border-sky-500/30 shadow-2xl space-y-5 hover:border-sky-400/50 transition-all relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-400/30 text-sky-400 flex items-center justify-center shadow-[0_0_16px_rgba(56,189,248,0.25)]">
                  <UserIcon className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-sky-500/10 text-sky-300 border border-sky-500/20">
                  Health Camp & Intake
                </span>
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-white font-heading">
                  For Patients & Health Workers
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                  Register patients at village camps, upload retinal photos, run AI scans, and receive doctor-verified prescriptions and reports.
                </p>
              </div>

              <div className="space-y-2.5 text-xs text-slate-300 pt-1">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>Simple village-friendly 2-tab scan results</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>1-Click request for ophthalmologist review</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>Download certified bilingual clinical PDF</span>
                </div>
              </div>
            </div>

            <div className="pt-5 border-t border-white/5">
              {currentUser && !isDoctor ? (
                <button
                  type="button"
                  onClick={() => onNavigateTab('intake')}
                  className="w-full py-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-sky-500/20 flex items-center justify-center space-x-2"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Enter Patient Intake Workspace</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenAuthWithRole('user')}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-slate-950 font-black text-sm transition-all shadow-lg shadow-sky-500/25 flex items-center justify-center space-x-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>User Login / Register</span>
                </button>
              )}
            </div>
          </div>

          {/* Card 2: Doctors & Specialists */}
          <div className="p-7 sm:p-8 rounded-3xl bg-gradient-to-b from-[#0F172A] to-[#09151f] border border-teal-500/30 shadow-2xl space-y-5 hover:border-teal-400/50 transition-all relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-400/30 text-teal-400 flex items-center justify-center shadow-[0_0_16px_rgba(20,184,166,0.25)]">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-teal-500/10 text-teal-300 border border-teal-500/20">
                  Clinician Portal
                </span>
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-white font-heading">
                  For Doctors & Specialists
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                  Access the clinical review queue, inspect fundus imagery with zoom & pan, confirm or override AI grades, sign off, and contact patients.
                </p>
              </div>

              <div className="space-y-2.5 text-xs text-slate-300 pt-1">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>Priority triage queue with urgent risk flags</span>
                </div>
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>AI Grade Override & 1-click clinical templates</span>
                </div>
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>Direct patient contact via Call and WhatsApp</span>
                </div>
              </div>
            </div>

            <div className="pt-5 border-t border-white/5">
              {currentUser && isDoctor ? (
                <button
                  type="button"
                  onClick={() => onNavigateTab('doctor-portal')}
                  className="w-full py-3.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-teal-500/20 flex items-center justify-center space-x-2"
                >
                  <Stethoscope className="w-4 h-4" />
                  <span>Enter Doctor Portal Workspace</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenAuthWithRole('doctor')}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black text-sm transition-all shadow-lg shadow-teal-500/25 flex items-center justify-center space-x-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Doctor Login / Register</span>
                </button>
              )}
            </div>
          </div>

        </div>
      </section>


      {/* =========================================================================
          SECTION 3: 3-STEP VISUAL CLINICAL PATHWAY (Below Portal Cards)
          ========================================================================= */}
      <section className="space-y-6 pt-2">
        <div className="text-center space-y-1.5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-sky-400 font-mono">
            How NETRA X Works
          </h2>
          <p className="text-2xl sm:text-3xl font-bold text-white font-heading">
            3-Step Visual Clinical Pathway
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          {/* Step 1 */}
          <div className="relative p-6 sm:p-7 rounded-3xl bg-[#0F172A]/90 border border-white/10 shadow-xl space-y-4 hover:border-sky-500/40 transition-all group">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shadow-[0_0_16px_rgba(56,189,248,0.2)] group-hover:scale-105 transition-transform">
                <Eye className="w-6 h-6" />
              </div>
              <span className="font-mono text-2xl font-black text-slate-700 group-hover:text-sky-400/40 transition-colors">
                01
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-heading mb-1.5">
                1. Scan Eye
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Capture or upload a retinal fundus photograph. Real-time Image Quality Assessment (IQA) instantly checks for blur and illumination issues.
              </p>
            </div>
            <div className="pt-2 flex items-center space-x-1.5 text-[11px] text-sky-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Automated Blur & Illumination Guard</span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative p-6 sm:p-7 rounded-3xl bg-[#0F172A]/90 border border-white/10 shadow-xl space-y-4 hover:border-cyan-500/40 transition-all group">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shadow-[0_0_16px_rgba(34,211,238,0.2)] group-hover:scale-105 transition-transform">
                <Activity className="w-6 h-6" />
              </div>
              <span className="font-mono text-2xl font-black text-slate-700 group-hover:text-cyan-400/40 transition-colors">
                02
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-heading mb-1.5">
                2. AI Grade & Heatmap
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Deep neural network grades DR severity from Grade 0 (Normal) to Grade 4 (Proliferative) with explainable Grad-CAM saliency heatmaps.
              </p>
            </div>
            <div className="pt-2 flex items-center space-x-1.5 text-[11px] text-cyan-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>5-Stage ICDR Classification & Lesions</span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative p-6 sm:p-7 rounded-3xl bg-[#0F172A]/90 border border-white/10 shadow-xl space-y-4 hover:border-teal-500/40 transition-all group">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center shadow-[0_0_16px_rgba(20,184,166,0.2)] group-hover:scale-105 transition-transform">
                <Stethoscope className="w-6 h-6" />
              </div>
              <span className="font-mono text-2xl font-black text-slate-700 group-hover:text-teal-400/40 transition-colors">
                03
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-heading mb-1.5">
                3. Doctor Review
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Ophthalmologists inspect scans with zoom & pan, confirm or override AI grades, sign off digitally, and contact patients via Call/WhatsApp.
              </p>
            </div>
            <div className="pt-2 flex items-center space-x-1.5 text-[11px] text-teal-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Digital Sign-Off & Direct Patient Contact</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer reassurance banner */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 text-center text-xs text-slate-400">
        Demo Mode is 100% open and requires zero login or registration. Real patient data and clinical reviews are securely protected with role-based access control.
      </div>

    </div>
  );
};
