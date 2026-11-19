import React from 'react';
import { 
  Eye, Activity, Stethoscope, Sparkles, UserCheck, ShieldCheck, 
  ArrowRight, CheckCircle2, ChevronRight, User as UserIcon, LogIn
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

  return (
    <div className="w-full max-w-5xl mx-auto space-y-12 sm:space-y-16 py-4 sm:py-8 animate-fade-in">
      
      {/* 1. Hero Headline & Overview */}
      <section className="text-center space-y-5 max-w-3xl mx-auto pt-2 sm:pt-6">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-semibold shadow-[0_0_15px_rgba(56,189,248,0.2)]">
          <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span>Automated Retinal Microvasculature Screening System</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white font-heading tracking-tight leading-tight sm:leading-tight">
          Diabetic Retinopathy Screening,{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-300 to-teal-300 drop-shadow-[0_0_20px_rgba(56,189,248,0.4)]">
            Simplified by AI.
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-sans max-w-2xl mx-auto">
          NETRA X empowers rural health camps and eye clinics to detect diabetic blindness early. 
          Upload one retinal fundus photo for instant 5-stage ICDR grading, lesion heatmaps, 
          and certified ophthalmologist verification.
        </p>

        {/* Primary Action Button: Try Demo Mode */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <button
            type="button"
            onClick={() => onNavigateTab('demo')}
            className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm transition-all shadow-[0_0_24px_rgba(251,191,36,0.4)] hover:shadow-[0_0_32px_rgba(251,191,36,0.6)] active:scale-95 flex items-center justify-center space-x-2.5"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>Try Demo Mode (No Login Required)</span>
            <ArrowRight className="w-4 h-4 text-slate-950" />
          </button>

          {/* Quick link if already logged in */}
          {currentUser && (
            <button
              type="button"
              onClick={() => onNavigateTab(isDoctor ? 'doctor-portal' : 'intake')}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-white font-bold text-sm transition-all flex items-center justify-center space-x-2"
            >
              <span>Go to {isDoctor ? 'Doctor Portal' : 'Patient Intake'}</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>
      </section>

      {/* 2. Simple 3-Step Visual Overview */}
      <section className="space-y-6">
        <div className="text-center space-y-1.5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-sky-400 font-mono">
            How NETRA X Works
          </h2>
          <p className="text-xl sm:text-2xl font-bold text-white font-heading">
            3-Step Visual Clinical Pathway
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {/* Step 1 */}
          <div className="relative p-6 rounded-3xl bg-[#0F172A]/90 border border-white/10 shadow-xl space-y-4 hover:border-sky-500/40 transition-all group">
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
          <div className="relative p-6 rounded-3xl bg-[#0F172A]/90 border border-white/10 shadow-xl space-y-4 hover:border-cyan-500/40 transition-all group">
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
          <div className="relative p-6 rounded-3xl bg-[#0F172A]/90 border border-white/10 shadow-xl space-y-4 hover:border-teal-500/40 transition-all group">
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

      {/* 3. Role Entry Cards: Patients/Health Workers vs Doctors/Specialists */}
      <section className="space-y-6 pt-4">
        <div className="text-center space-y-1.5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-teal-400 font-mono">
            Role-Specific Workspaces
          </h2>
          <p className="text-xl sm:text-2xl font-bold text-white font-heading">
            Choose Your Portal to Continue
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card 1: Patients & Health Workers */}
          <div className="p-7 rounded-3xl bg-gradient-to-b from-[#0F172A] to-[#0b1222] border border-sky-500/30 shadow-2xl space-y-5 hover:border-sky-400/50 transition-all relative overflow-hidden flex flex-col justify-between">
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
                <h3 className="text-xl font-bold text-white font-heading">
                  For Patients & Health Workers
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                  Register patients at village camps, upload retinal photos, run AI scans, and receive doctor-verified prescriptions and reports.
                </p>
              </div>

              <div className="space-y-2 text-xs text-slate-300 pt-1">
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

            <div className="pt-4 border-t border-white/5">
              {currentUser && !isDoctor ? (
                <button
                  type="button"
                  onClick={() => onNavigateTab('intake')}
                  className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-lg shadow-sky-500/20 flex items-center justify-center space-x-2"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Enter Patient Intake Workspace</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenAuthWithRole('user')}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-slate-950 font-black text-xs sm:text-sm transition-all shadow-lg shadow-sky-500/25 flex items-center justify-center space-x-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>User Login / Register</span>
                </button>
              )}
            </div>
          </div>

          {/* Card 2: Doctors & Specialists */}
          <div className="p-7 rounded-3xl bg-gradient-to-b from-[#0F172A] to-[#09151f] border border-teal-500/30 shadow-2xl space-y-5 hover:border-teal-400/50 transition-all relative overflow-hidden flex flex-col justify-between">
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
                <h3 className="text-xl font-bold text-white font-heading">
                  For Doctors & Specialists
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                  Access the clinical review queue, inspect fundus imagery with zoom & pan, confirm or override AI grades, sign off, and contact patients.
                </p>
              </div>

              <div className="space-y-2 text-xs text-slate-300 pt-1">
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

            <div className="pt-4 border-t border-white/5">
              {currentUser && isDoctor ? (
                <button
                  type="button"
                  onClick={() => onNavigateTab('doctor-portal')}
                  className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-lg shadow-teal-500/20 flex items-center justify-center space-x-2"
                >
                  <Stethoscope className="w-4 h-4" />
                  <span>Enter Doctor Portal Workspace</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenAuthWithRole('doctor')}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black text-xs sm:text-sm transition-all shadow-lg shadow-teal-500/25 flex items-center justify-center space-x-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Doctor Login / Register</span>
                </button>
              )}
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
