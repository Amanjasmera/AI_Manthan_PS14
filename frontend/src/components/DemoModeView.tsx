import React, { useState } from 'react';
import {
  Sparkles,
  PlayCircle,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Info,
  ArrowRight,
  Eye,
  FileText
} from 'lucide-react';
import { Language } from '../utils/language';
import { ScreeningDetail } from '../types';
import { DiagnosticStudio } from './DiagnosticStudio';

interface DemoModeViewProps {
  lang: Language;
  onAnalyze: (formData: FormData) => void;
  isLoading: boolean;
  activeScreening: ScreeningDetail | null;
  onOpenReview: () => void;
  onOpenReport: () => void;
  onSwitchToIntake: () => void;
}

interface BenchmarkCase {
  file: string;
  name: string;
  age: number;
  gender: string;
  grade: number;
  icon: string;
  label: string;
  labelHi: string;
  badge: string;
  badgeHi: string;
  severityPill: string;
  summary: string;
  colorTheme: {
    border: string;
    activeBorder: string;
    bg: string;
    activeBg: string;
    pillBg: string;
    pillText: string;
    glow: string;
  };
}

const BENCHMARKS: BenchmarkCase[] = [
  {
    file: 'sample_normal_grade0.jpg',
    name: 'Rajesh Sharma',
    age: 52,
    gender: 'Male',
    grade: 0,
    icon: '🟢',
    label: 'Grade 0: Normal Retina',
    labelHi: 'ग्रेड 0: सामान्य रेटिना',
    badge: 'Normal Control (No DR)',
    badgeHi: 'कोई रेटिनोपैथी नहीं',
    severityPill: 'Normal Control',
    summary: 'Clear macula and sharp disc margin. Zero hemorrhages or exudates.',
    colorTheme: {
      border: 'border-emerald-500/30 hover:border-emerald-400',
      activeBorder: 'border-emerald-400 ring-2 ring-emerald-400/80',
      bg: 'bg-emerald-950/20 hover:bg-emerald-950/40',
      activeBg: 'bg-emerald-900/40',
      pillBg: 'bg-emerald-500/20 border-emerald-500/40',
      pillText: 'text-emerald-300',
      glow: 'shadow-[0_0_20px_rgba(16,185,129,0.3)]',
    },
  },
  {
    file: 'sample_mild_grade1.jpg',
    name: 'Sunita Verma',
    age: 58,
    gender: 'Female',
    grade: 1,
    icon: '🟡',
    label: 'Grade 1: Mild NPDR',
    labelHi: 'ग्रेड 1: हल्का NPDR',
    badge: 'Microaneurysms Only',
    badgeHi: 'केवल सूक्ष्म उभार',
    severityPill: 'Mild Risk',
    summary: 'Isolated red pinpoint capillary dilatations. Baseline monitoring advised.',
    colorTheme: {
      border: 'border-amber-500/30 hover:border-amber-400',
      activeBorder: 'border-amber-400 ring-2 ring-amber-400/80',
      bg: 'bg-amber-950/20 hover:bg-amber-950/40',
      activeBg: 'bg-amber-900/40',
      pillBg: 'bg-amber-500/20 border-amber-500/40',
      pillText: 'text-amber-300',
      glow: 'shadow-[0_0_20px_rgba(245,158,11,0.3)]',
    },
  },
  {
    file: 'sample_moderate_grade2.jpg',
    name: 'Mohammad Ali',
    age: 63,
    gender: 'Male',
    grade: 2,
    icon: '🟠',
    label: 'Grade 2: Moderate NPDR',
    labelHi: 'ग्रेड 2: मध्यम NPDR',
    badge: 'Exudates & Hemorrhages',
    badgeHi: 'रिसाव व रक्तस्राव',
    severityPill: 'Moderate Risk',
    summary: 'Discrete yellow lipid exudates with dot-blot hemorrhages in 1-2 quadrants.',
    colorTheme: {
      border: 'border-orange-500/30 hover:border-orange-400',
      activeBorder: 'border-orange-400 ring-2 ring-orange-400/80',
      bg: 'bg-orange-950/20 hover:bg-orange-950/40',
      activeBg: 'bg-orange-900/40',
      pillBg: 'bg-orange-500/20 border-orange-500/40',
      pillText: 'text-orange-300',
      glow: 'shadow-[0_0_20px_rgba(249,115,22,0.3)]',
    },
  },
  {
    file: 'sample_severe_grade3.jpg',
    name: 'Anita Devi',
    age: 66,
    gender: 'Female',
    grade: 3,
    icon: '🔴',
    label: 'Grade 3: Severe NPDR',
    labelHi: 'ग्रेड 3: गंभीर NPDR',
    badge: '4-Quadrant Blots',
    badgeHi: 'चारों भागों में धब्बे',
    severityPill: 'Severe Risk',
    summary: '4-2-1 Rule: >20 intraretinal hemorrhages in all 4 quadrants. High risk of progression.',
    colorTheme: {
      border: 'border-rose-500/30 hover:border-rose-400',
      activeBorder: 'border-rose-400 ring-2 ring-rose-400/80',
      bg: 'bg-rose-950/20 hover:bg-rose-950/40',
      activeBg: 'bg-rose-900/40',
      pillBg: 'bg-rose-500/20 border-rose-500/40',
      pillText: 'text-rose-300',
      glow: 'shadow-[0_0_20px_rgba(244,63,94,0.3)]',
    },
  },
  {
    file: 'sample_proliferative_grade4.jpg',
    name: 'Kailash Chand',
    age: 71,
    gender: 'Male',
    grade: 4,
    icon: '🚨',
    label: 'Grade 4: Proliferative DR',
    labelHi: 'ग्रेड 4: अत्यधिक गंभीर PDR',
    badge: 'Neovascularization',
    badgeHi: 'नई असामान्य रक्तवाहिकाएं',
    severityPill: 'Critical Action',
    summary: 'Neovascularization (NVD/NVE), preretinal hemorrhage risk. Urgent laser/anti-VEGF referral.',
    colorTheme: {
      border: 'border-red-500/40 hover:border-red-400',
      activeBorder: 'border-red-400 ring-2 ring-red-400/80',
      bg: 'bg-red-950/30 hover:bg-red-950/50',
      activeBg: 'bg-red-900/50',
      pillBg: 'bg-red-500/25 border-red-500/50',
      pillText: 'text-red-200',
      glow: 'shadow-[0_0_22px_rgba(239,68,68,0.45)]',
    },
  },
  {
    file: 'sample_blurry_fail.jpg',
    name: 'Vikram Patel',
    age: 49,
    gender: 'Male',
    grade: 1,
    icon: '⚠️',
    label: 'Blurry Sample (IQA Retake)',
    labelHi: 'धुंधला फोटो (पुनः जांच)',
    badge: 'Simulated Blur Artifact',
    badgeHi: 'कैमरा शेक / धुंधलापन',
    severityPill: '₹0 Waived Retake',
    summary: 'Laplacian sharpness fails gate (<80). Diagnosis halted to prevent false negative. ₹0 billed.',
    colorTheme: {
      border: 'border-slate-600/40 hover:border-slate-400',
      activeBorder: 'border-amber-400 ring-2 ring-amber-400/80',
      bg: 'bg-slate-900/40 hover:bg-slate-900/70',
      activeBg: 'bg-slate-900/80',
      pillBg: 'bg-slate-700/40 border-slate-600/40',
      pillText: 'text-slate-300',
      glow: 'shadow-[0_0_18px_rgba(148,163,184,0.3)]',
    },
  },
];

export const DemoModeView: React.FC<DemoModeViewProps> = ({
  lang,
  onAnalyze,
  isLoading,
  activeScreening,
  onOpenReview,
  onOpenReport,
  onSwitchToIntake,
}) => {
  const [selectedBenchmark, setSelectedBenchmark] = useState<string | null>(null);

  const handleRunSample = async (bm: BenchmarkCase) => {
    try {
      setSelectedBenchmark(bm.file);
      let res = await fetch(`/api/v1/files/${bm.file}`);
      if (!res.ok) {
        res = await fetch(`/samples/${bm.file}`);
      }
      const blob = await res.blob();
      const file = new File([blob], bm.file, { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('patient_name', bm.name);
      formData.append('age', bm.age.toString());
      formData.append('gender', bm.gender);
      formData.append('diabetes_history', `Benchmark Clinical Case: ${bm.badge}`);
      formData.append('eye_side', bm.grade % 2 === 0 ? 'RIGHT' : 'LEFT');

      onAnalyze(formData);
    } catch (e) {
      console.error('Failed to run demo sample:', e);
    }
  };

  return (
    <div className="space-y-6 pop-in">
      {/* Top Banner */}
      <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-sky-500/25 bg-slate-950/80 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-44 h-44 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                CLINICAL BENCHMARK SHOWCASE
              </span>
              <span className="text-[10px] font-mono text-sky-400">
                APTOS 2019 + Messidor-2 Standard
              </span>
            </div>
            <h1 className="font-heading font-black text-xl sm:text-2xl text-white">
              {lang === 'hi' ? 'डेमो एवं नमूना केस परीक्षण' : 'Demo Mode: 1-Click Clinical Benchmarks'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300/90 mt-1 max-w-2xl leading-relaxed">
              {lang === 'hi'
                ? 'बिना मरीज पंजीकरण के सभी 5 ग्रेड (Grade 0 से 4) एवं IQA रिजेक्शन का त्वरित लाइव विश्लेषण देखें।'
                : 'Click any pre-verified clinical fundus scan below to run instant inference, Grad-CAM saliency maps, and Bayesian uncertainty estimation without manual patient entry.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onSwitchToIntake}
            className="shrink-0 flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-500/40 text-xs font-bold transition shadow-sm self-start md:self-auto active:scale-95"
          >
            <span>{lang === 'hi' ? 'असली मरीज पंजीकरण पर जाएं' : 'Switch to Real Patient Intake'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 6 Benchmark Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {BENCHMARKS.map((bm) => {
          const isSelected = selectedBenchmark === bm.file;
          return (
            <div
              key={bm.file}
              className={`p-4 rounded-2xl border text-left transition-all duration-200 relative flex flex-col justify-between ${
                isSelected
                  ? `${bm.colorTheme.activeBorder} ${bm.colorTheme.activeBg} ${bm.colorTheme.glow} scale-[1.01]`
                  : `${bm.colorTheme.border} ${bm.colorTheme.bg} hover:-translate-y-1 hover:shadow-xl`
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center space-x-2 min-w-0">
                    <span className="text-xl shrink-0">{bm.icon}</span>
                    <h3 className="font-heading font-bold text-xs sm:text-sm text-white truncate">
                      {lang === 'hi' ? bm.labelHi : bm.label}
                    </h3>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border shrink-0 ${bm.colorTheme.pillBg} ${bm.colorTheme.pillText}`}>
                    {bm.severityPill}
                  </span>
                </div>

                <div className="text-[11px] text-slate-300 font-medium mb-1">
                  {bm.name} ({bm.age}y, {bm.gender}) • <span className="text-slate-400 font-mono text-[10px]">{lang === 'hi' ? bm.badgeHi : bm.badge}</span>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                  {bm.summary}
                </p>
              </div>

              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleRunSample(bm)}
                className={`w-full py-2.5 px-3 rounded-xl font-heading font-bold text-xs flex items-center justify-center space-x-2 transition shadow ${
                  isSelected && isLoading
                    ? 'bg-sky-400 text-slate-950'
                    : 'bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 hover:border-sky-400 active:scale-95'
                }`}
              >
                {isSelected && isLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-950" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-3.5 h-3.5 text-sky-400" />
                    <span>Run Diagnostic Scan</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Render Diagnostic Results below if a benchmark was analyzed */}
      {activeScreening && (activeScreening.iqa?.passed && activeScreening.iqa_passed !== false) && (
        <div className="pt-4 border-t border-sky-500/20 space-y-4">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
            <h2 className="font-heading font-black text-lg text-white">
              {lang === 'hi' ? 'डेमो विश्लेषण परिणाम (Diagnostic Results)' : 'Demo Diagnostic Results & Visualizer'}
            </h2>
          </div>
          <DiagnosticStudio
            screening={activeScreening}
            lang={lang}
            onOpenReview={onOpenReview}
            onOpenReport={onOpenReport}
          />
        </div>
      )}
    </div>
  );
};

