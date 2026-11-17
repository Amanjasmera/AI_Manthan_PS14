import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Camera,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  FileUp,
  Sparkles,
  User,
  Calendar,
  Users,
  Eye,
  Activity,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Check,
  ChevronRight,
  Info
} from 'lucide-react';
import { Language, translations } from '../utils/language';
import { EyeSide, IqaResult } from '../types';
import { precheckIqa } from '../services/api';

interface ImageUploaderProps {
  lang: Language;
  onAnalyze: (formData: FormData) => void;
  isLoading: boolean;
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
    colorTheme: {
      border: 'border-emerald-500/30 hover:border-emerald-400',
      activeBorder: 'border-emerald-400 ring-2 ring-emerald-400/80',
      bg: 'bg-emerald-950/20 hover:bg-emerald-950/40',
      activeBg: 'bg-emerald-900/35',
      pillBg: 'bg-emerald-500/20 border-emerald-500/40',
      pillText: 'text-emerald-300',
      glow: 'shadow-[0_0_18px_rgba(16,185,129,0.3)]',
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
    colorTheme: {
      border: 'border-amber-500/30 hover:border-amber-400',
      activeBorder: 'border-amber-400 ring-2 ring-amber-400/80',
      bg: 'bg-amber-950/20 hover:bg-amber-950/40',
      activeBg: 'bg-amber-900/35',
      pillBg: 'bg-amber-500/20 border-amber-500/40',
      pillText: 'text-amber-300',
      glow: 'shadow-[0_0_18px_rgba(245,158,11,0.3)]',
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
    colorTheme: {
      border: 'border-orange-500/30 hover:border-orange-400',
      activeBorder: 'border-orange-400 ring-2 ring-orange-400/80',
      bg: 'bg-orange-950/20 hover:bg-orange-950/40',
      activeBg: 'bg-orange-900/35',
      pillBg: 'bg-orange-500/20 border-orange-500/40',
      pillText: 'text-orange-300',
      glow: 'shadow-[0_0_18px_rgba(249,115,22,0.3)]',
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
    colorTheme: {
      border: 'border-rose-500/30 hover:border-rose-400',
      activeBorder: 'border-rose-400 ring-2 ring-rose-400/80',
      bg: 'bg-rose-950/20 hover:bg-rose-950/40',
      activeBg: 'bg-rose-900/35',
      pillBg: 'bg-rose-500/20 border-rose-500/40',
      pillText: 'text-rose-300',
      glow: 'shadow-[0_0_18px_rgba(244,63,94,0.3)]',
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
    colorTheme: {
      border: 'border-red-500/40 hover:border-red-400',
      activeBorder: 'border-red-400 ring-2 ring-red-400/80',
      bg: 'bg-red-950/30 hover:bg-red-950/50',
      activeBg: 'bg-red-900/45',
      pillBg: 'bg-red-500/25 border-red-500/50',
      pillText: 'text-red-200',
      glow: 'shadow-[0_0_20px_rgba(239,68,68,0.4)]',
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
    colorTheme: {
      border: 'border-slate-600/40 hover:border-slate-400',
      activeBorder: 'border-amber-400 ring-2 ring-amber-400/80',
      bg: 'bg-slate-900/40 hover:bg-slate-900/70',
      activeBg: 'bg-slate-900/80',
      pillBg: 'bg-slate-700/40 border-slate-600/40',
      pillText: 'text-slate-300',
      glow: 'shadow-[0_0_16px_rgba(148,163,184,0.3)]',
    },
  },
];

const SCAN_STAGES_EN = [
  'Stage 1: Scanning Image Sharpness, Pupil FOV & Clarity Gate...',
  'Stage 2: Segmenting Microaneurysms & Exudate Lesions...',
  'Stage 3: Running EfficientNet-B0 & Calibrating Bayesian Safety...',
];

const SCAN_STAGES_HI = [
  'चरण 1: फोटो स्पष्टता, कंट्रास्ट एवं गुणवत्ता की जांच जारी है...',
  'चरण 2: सूक्ष्म रक्तस्राव एवं पीले रिसाव धब्बों की पहचान जारी है...',
  'चरण 3: एआई डीप लर्निंग एवं क्लिनिकल सुरक्षा स्कोर की गणना जारी है...',
];

export const ImageUploader: React.FC<ImageUploaderProps> = ({ lang, onAnalyze, isLoading }) => {
  const t = translations[lang];

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedBenchmark, setSelectedBenchmark] = useState<string | null>(null);
  const [patientName, setPatientName] = useState('Rajesh Sharma');
  const [patientAge, setPatientAge] = useState(58);
  const [patientGender, setPatientGender] = useState('Male');
  const [diabetesHistory, setDiabetesHistory] = useState('Type 2 Diabetes (7 yrs, HbA1c 7.9%)');
  const [eyeSide, setEyeSide] = useState<EyeSide>('RIGHT');

  const [iqaChecking, setIqaChecking] = useState(false);
  const [iqaResult, setIqaResult] = useState<IqaResult | null>(null);
  const [scanStageIndex, setScanStageIndex] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cycle scan stages during loading animation
  useEffect(() => {
    if (!isLoading) {
      setScanStageIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setScanStageIndex((prev) => (prev + 1) % 3);
    }, 1800);
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleFileChange = async (file: File) => {
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setIqaResult(null);

    // Run rapid live IQA pre-check
    setIqaChecking(true);
    try {
      const res = await precheckIqa(file);
      setIqaResult(res);
    } catch (e) {
      console.warn('IQA pre-check notice:', e);
    } finally {
      setIqaChecking(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedBenchmark(null);
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSelectSample = async (
    filename: string,
    defaultName: string,
    grade: number,
    age: number,
    gender: string
  ) => {
    try {
      setSelectedBenchmark(filename);
      let res = await fetch(`/api/v1/files/${filename}`);
      if (!res.ok) {
        res = await fetch(`/samples/${filename}`);
      }
      const blob = await res.blob();
      const file = new File([blob], filename, { type: 'image/jpeg' });
      setPatientName(defaultName);
      setPatientAge(age);
      setPatientGender(gender);
      setEyeSide(grade % 2 === 0 ? 'RIGHT' : 'LEFT');
      handleFileChange(file);
    } catch (e) {
      console.error('Failed to load sample image:', e);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('patient_name', patientName);
    formData.append('age', patientAge.toString());
    formData.append('gender', patientGender);
    formData.append('diabetes_history', diabetesHistory);
    formData.append('eye_side', eyeSide);

    onAnalyze(formData);
  };

  // Helper calculation for IQA progress gauges
  const getSharpnessStatus = (score: number) => {
    if (score >= 80) return { label: lang === 'hi' ? 'स्पष्ट' : 'Crisp', color: 'text-emerald-400', bar: 'bg-emerald-400', pct: Math.min(100, Math.round((score / 200) * 100)) };
    return { label: lang === 'hi' ? 'धुंधली' : 'Blurry', color: 'text-rose-400', bar: 'bg-rose-500', pct: Math.max(8, Math.round((score / 80) * 40)) };
  };

  const getLuminanceStatus = (score: number) => {
    if (score < 22) return { label: lang === 'hi' ? 'अंधेरा' : 'Too Dark', color: 'text-amber-400', bar: 'bg-amber-400', pct: 20 };
    if (score > 230) return { label: lang === 'hi' ? 'अति तीव्र' : 'Overlit', color: 'text-amber-400', bar: 'bg-amber-400', pct: 95 };
    return { label: lang === 'hi' ? 'संतुलित' : 'Balanced', color: 'text-emerald-400', bar: 'bg-emerald-400', pct: Math.round((score / 255) * 100) };
  };

  const getContrastStatus = (score: number) => {
    if (score >= 18) return { label: lang === 'hi' ? 'उत्तम' : 'Optimal', color: 'text-emerald-400', bar: 'bg-emerald-400', pct: Math.min(100, Math.round((score / 50) * 100)) };
    return { label: lang === 'hi' ? 'कम' : 'Low', color: 'text-amber-400', bar: 'bg-amber-400', pct: 30 };
  };

  return (
    <div className="space-y-4">
      {/* CARD 1: RETINAL PHOTO & LIVE QUALITY CHECK */}
      <div className="glass-panel p-4 sm:p-5 shadow-2xl relative overflow-hidden rounded-2xl border border-sky-500/25 bg-slate-950/70">
        <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Card Header with Numbered Badge */}
        <div className="flex items-center justify-between pb-3.5 border-b border-sky-500/15 mb-3.5">
          <div className="flex items-center space-x-2.5">
            <span className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/40 flex items-center justify-center font-heading font-black text-xs shadow-[0_0_10px_rgba(56,189,248,0.25)]">
              1
            </span>
            <div>
              <h2 className="font-heading font-bold text-sm sm:text-base text-white tracking-wide">
                {lang === 'hi' ? 'रेटिना फोटो एवं गुणवत्ता जांच' : '1. Retinal Photo & Quality Check'}
              </h2>
              <p className="text-[11px] text-slate-400 font-medium">
                {lang === 'hi' ? 'फंडस कैमरा फोटो अपलोड करें या नीचे से नमूना चुनें' : 'Upload fundus photo or pick a sample below'}
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/10 text-sky-300 border border-sky-500/20">
            {lang === 'hi' ? 'शून्य-शुल्क IQA' : 'Zero-Charge IQA'}
          </span>
        </div>

        {/* Upload Dropzone with Pulse Ring & Iris Reveal */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-3.5 sm:p-4 text-center cursor-pointer transition-all duration-200 group ${
            previewUrl
              ? 'border-sky-400 bg-sky-950/30 shadow-[0_0_20px_rgba(56,189,248,0.2)]'
              : 'border-sky-500/35 hover:border-sky-400 bg-slate-900/60 hover:bg-slate-900/90 hover:-translate-y-0.5 animate-pulse-ring'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                setSelectedBenchmark(null);
                handleFileChange(e.target.files[0]);
              }
            }}
          />

          {previewUrl ? (
            <div className="flex items-center space-x-3 text-left">
              <div className="relative shrink-0">
                <img
                  src={previewUrl}
                  alt="Retinal Preview"
                  className="w-16 h-16 object-cover rounded-xl border-2 border-sky-400 shadow-md animate-iris-reveal"
                />
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-lg border border-white">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-white truncate">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">{selectedFile?.name || 'Retinal Scan Loaded'}</span>
                </div>
                <p className="text-[11px] text-sky-400 mt-0.5 font-semibold">
                  {lang === 'hi' ? 'फोटो लोड हो गई • बदलने के लिए यहाँ क्लिक करें' : 'Photo loaded • Click to replace file'}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                  {selectedFile ? `${(selectedFile.size / 1024).toFixed(0)} KB • JPG/PNG` : 'Verified benchmark sample'}
                </p>
              </div>

              <button
                type="button"
                className="shrink-0 px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-[11px] font-bold transition"
              >
                {lang === 'hi' ? 'बदलें' : 'Change'}
              </button>
            </div>
          ) : (
            <div className="py-2.5 flex flex-col items-center justify-center space-y-2">
              <div className="w-11 h-11 rounded-xl bg-sky-500/15 border border-sky-400/40 flex items-center justify-center text-sky-300 shadow-[0_0_14px_rgba(56,189,248,0.25)] group-hover:scale-105 transition-transform">
                <FileUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-white">
                  {lang === 'hi' ? 'फंडस फोटो यहाँ ड्रैग करें या क्लिक करके चुनें' : 'Click to browse or drop retinal fundus photo'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {lang === 'hi' ? 'कैमरा एक्सपोर्ट, JPG, PNG, TIFF (न्यूनतम 512×512 पिक्सल)' : 'Works with any fundus camera (JPG, PNG, TIFF • Min 512×512)'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Live IQA Pre-check Evaluating Feedback */}
        {iqaChecking && (
          <div className="mt-3 p-3 bg-slate-900/90 border border-sky-500/30 rounded-xl flex items-center space-x-2.5 text-xs text-sky-300 animate-pulse">
            <RefreshCw className="w-4 h-4 animate-spin text-sky-400 shrink-0" />
            <span className="font-medium">
              {lang === 'hi' ? 'स्वचालित गुणवत्ता जांच: स्पष्टता (शार्पनेस) एवं रोशनी का विश्लेषण जारी है...' : 'Evaluating aperture sharpness, illumination & focus quality...'}
            </span>
          </div>
        )}

        {/* Live IQA Pre-check Results with Visual Gauges */}
        {iqaResult && !iqaChecking && (
          <div
            className={`mt-3 p-3.5 rounded-xl border text-xs transition-all ${
              iqaResult.passed
                ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200'
                : 'bg-rose-950/40 border-rose-500/60 text-rose-200'
            }`}
          >
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2 pb-2 border-b border-white/10">
              <div className="flex items-center space-x-2">
                {iqaResult.passed ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span className="font-bold text-xs sm:text-sm text-white">
                  {iqaResult.passed
                    ? (lang === 'hi' ? 'छवि गुणवत्ता: पास (विश्लेषण योग्य)' : 'Quality Gate: PASSED — Safe for AI Grading')
                    : (lang === 'hi' ? 'छवि गुणवत्ता: अस्वीकृत (धुंधली फोटो)' : 'Quality Gate: FAILED — Retake Required')}
                </span>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  iqaResult.passed
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}
              >
                {iqaResult.passed
                  ? (lang === 'hi' ? '₹25 मान्य स्कैन' : '₹25 Valid Scan')
                  : (lang === 'hi' ? '₹0 शुल्क छूट (सुरक्षित)' : '₹0 Billed — Waived')}
              </span>
            </div>

            {/* Error tags if rejected */}
            {iqaResult.error_codes && iqaResult.error_codes.length > 0 && !iqaResult.passed && (
              <div className="flex flex-wrap gap-1.5 my-2">
                {iqaResult.error_codes.map((code) => (
                  <span
                    key={code}
                    className="px-2 py-0.5 rounded bg-rose-950 text-rose-200 font-mono text-[10px] font-bold border border-rose-800"
                  >
                    ⚠️ {code}
                  </span>
                ))}
              </div>
            )}

            {/* Recapture Tips for Field Workers */}
            {iqaResult.recapture_instructions && !iqaResult.passed && (
              <div className="p-2.5 rounded-lg bg-rose-950/70 border border-rose-900/80 text-[11px] text-rose-200 font-medium mb-2.5 space-y-1">
                <p className="font-bold text-rose-100 flex items-center space-x-1">
                  <span>💡 {lang === 'hi' ? 'कैंप ऑपरेटर सुझाव:' : 'Operator Recapture Tip:'}</span>
                </p>
                <p className="leading-relaxed opacity-95">{iqaResult.recapture_instructions}</p>
              </div>
            )}

            {/* Visual Progress Gauges for 3 Core Optical Parameters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 font-sans">
              {/* Sharpness Gauge */}
              {(() => {
                const s = getSharpnessStatus(iqaResult.blur_score);
                return (
                  <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-slate-400 font-medium">{lang === 'hi' ? 'स्पष्टता' : 'Sharpness'}</span>
                      <span className={`font-bold ${s.color}`}>{s.label}</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div className={`h-full rounded-full ${s.bar}`} style={{ width: `${s.pct}%` }} />
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono mt-1 block">Score: {iqaResult.blur_score.toFixed(1)}</span>
                  </div>
                );
              })()}

              {/* Luminance Gauge */}
              {(() => {
                const l = getLuminanceStatus(iqaResult.illumination_score);
                return (
                  <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-slate-400 font-medium">{lang === 'hi' ? 'रोशनी' : 'Brightness'}</span>
                      <span className={`font-bold ${l.color}`}>{l.label}</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div className={`h-full rounded-full ${l.bar}`} style={{ width: `${l.pct}%` }} />
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono mt-1 block">Score: {iqaResult.illumination_score.toFixed(1)}</span>
                  </div>
                );
              })()}

              {/* Contrast Gauge */}
              {(() => {
                const c = getContrastStatus(iqaResult.contrast_score);
                return (
                  <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-slate-400 font-medium">{lang === 'hi' ? 'कंट्रास्ट' : 'Contrast'}</span>
                      <span className={`font-bold ${c.color}`}>{c.label}</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div className={`h-full rounded-full ${c.bar}`} style={{ width: `${c.pct}%` }} />
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono mt-1 block">Score: {iqaResult.contrast_score.toFixed(1)}</span>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* CARD 2: QUICK SAMPLE CLINICAL BENCHMARKS (1-Click Test Cases) */}
      <div className="glass-panel p-4 sm:p-5 shadow-2xl relative overflow-hidden rounded-2xl border border-sky-500/25 bg-slate-950/70">
        <div className="flex items-center justify-between pb-3 border-b border-sky-500/15 mb-3">
          <div className="flex items-center space-x-2.5">
            <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-heading font-black text-xs shadow-[0_0_10px_rgba(245,158,11,0.25)]">
              2
            </span>
            <div>
              <h3 className="font-heading font-bold text-sm sm:text-base text-white tracking-wide">
                {lang === 'hi' ? 'त्वरित क्लिनिकल नमूने' : '2. Quick Sample Cases'}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                {lang === 'hi' ? 'बिना कैमरा के तुरंत टेस्ट करने के लिए किसी एक पर क्लिक करें' : '1-Click benchmarks for rapid field testing & demos'}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-sky-400 font-bold bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
            6 Ready Cases
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {BENCHMARKS.map((bm) => {
            const isSelected = selectedBenchmark === bm.file;
            return (
              <button
                key={bm.file}
                type="button"
                onClick={() => handleSelectSample(bm.file, bm.name, bm.grade, bm.age, bm.gender)}
                className={`p-3 rounded-xl border text-left transition-all duration-200 relative group flex items-start space-x-2.5 ${
                  isSelected
                    ? `${bm.colorTheme.activeBorder} ${bm.colorTheme.activeBg} ${bm.colorTheme.glow} scale-[1.01]`
                    : `${bm.colorTheme.border} ${bm.colorTheme.bg} hover:-translate-y-0.5 hover:shadow-md`
                }`}
              >
                <span className="text-lg shrink-0 leading-none mt-0.5">{bm.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-xs text-white leading-tight truncate">
                      {lang === 'hi' ? bm.labelHi : bm.label}
                    </span>
                    {isSelected && (
                      <span className="shrink-0 text-[9px] font-black px-1.5 py-0.2 rounded bg-sky-400 text-slate-950 uppercase tracking-tighter">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-300 opacity-90 mt-0.5 truncate">
                    {bm.name} • {lang === 'hi' ? bm.badgeHi : bm.badge}
                  </div>
                  <div className="mt-1.5 flex items-center space-x-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${bm.colorTheme.pillBg} ${bm.colorTheme.pillText}`}>
                      {bm.severityPill}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* CARD 3: PATIENT DEMOGRAPHICS & CLINICAL DATA */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="glass-panel p-4 sm:p-5 shadow-2xl relative overflow-hidden rounded-2xl border border-sky-500/25 bg-slate-950/70">
          <div className="flex items-center justify-between pb-3 border-b border-sky-500/15 mb-3.5">
            <div className="flex items-center space-x-2.5">
              <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-heading font-black text-xs shadow-[0_0_10px_rgba(16,185,129,0.25)]">
                3
              </span>
              <div>
                <h3 className="font-heading font-bold text-sm sm:text-base text-white tracking-wide">
                  {lang === 'hi' ? 'मरीज़ की जानकारी एवं आँख का चयन' : '3. Patient Details'}
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  {lang === 'hi' ? 'प्रमाणित क्लिनिकल रिपोर्ट हेतु विवरण दर्ज करें' : 'Required for bilingual PDF clinical report generation'}
                </p>
              </div>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Step 3 of 3</span>
          </div>

          <div className="space-y-3.5">
            {/* Patient Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1.5">
                <User className="w-3.5 h-3.5 text-sky-400" />
                <span>{t.patientName}</span>
                <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                required
                placeholder="e.g. Rajesh Sharma"
                className="w-full px-3.5 py-2.5 min-h-[44px] bg-slate-900/90 border border-sky-500/25 focus:border-sky-400 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400/40 transition-all font-medium"
              />
            </div>

            {/* Age & Gender Side by Side */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-sky-400" />
                  <span>{t.patientAge}</span>
                  <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  value={patientAge}
                  onChange={(e) => setPatientAge(Number(e.target.value))}
                  required
                  min={1}
                  max={120}
                  className="w-full px-3.5 py-2.5 min-h-[44px] bg-slate-900/90 border border-sky-500/25 focus:border-sky-400 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-400/40 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1.5">
                  <Users className="w-3.5 h-3.5 text-sky-400" />
                  <span>{t.patientGender}</span>
                </label>
                <select
                  value={patientGender}
                  onChange={(e) => setPatientGender(e.target.value)}
                  className="w-full px-3 py-2.5 min-h-[44px] bg-slate-900/90 border border-sky-500/25 focus:border-sky-400 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-400/40 transition-all font-medium cursor-pointer"
                >
                  <option value="Male">{t.male}</option>
                  <option value="Female">{t.female}</option>
                  <option value="Other">{t.other}</option>
                </select>
              </div>
            </div>

            {/* Eye Evaluated OD / OS Toggle with Visual Eye Indicator */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <Eye className="w-3.5 h-3.5 text-sky-400" />
                  <span>{t.eyeSide}</span>
                </span>
                <span className="text-[10px] text-slate-400">OD = Right Eye, OS = Left Eye</span>
              </label>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setEyeSide('RIGHT')}
                  className={`py-2.5 px-3.5 min-h-[44px] rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
                    eyeSide === 'RIGHT'
                      ? 'bg-sky-500/25 border-sky-400 text-sky-200 shadow-[0_0_16px_rgba(56,189,248,0.35)] ring-1 ring-sky-400'
                      : 'bg-slate-900/70 border-slate-700/60 text-slate-400 hover:text-white hover:border-slate-600'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-[0_0_6px_#38bdf8]" />
                  <span>{t.rightEye}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEyeSide('LEFT')}
                  className={`py-2.5 px-3.5 min-h-[44px] rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
                    eyeSide === 'LEFT'
                      ? 'bg-sky-500/25 border-sky-400 text-sky-200 shadow-[0_0_16px_rgba(56,189,248,0.35)] ring-1 ring-sky-400'
                      : 'bg-slate-900/70 border-slate-700/60 text-slate-400 hover:text-white hover:border-slate-600'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-[0_0_6px_#38bdf8]" />
                  <span>{t.leftEye}</span>
                </button>
              </div>
            </div>

            {/* Diabetes History */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1.5">
                <Activity className="w-3.5 h-3.5 text-sky-400" />
                <span>{t.patientHistory}</span>
              </label>
              <input
                type="text"
                value={diabetesHistory}
                onChange={(e) => setDiabetesHistory(e.target.value)}
                placeholder="e.g. Type 2 Diabetes, 5 yrs, HbA1c 8.1%"
                className="w-full px-3.5 py-2.5 min-h-[44px] bg-slate-900/90 border border-sky-500/25 focus:border-sky-400 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400/40 transition-all font-medium"
              />
            </div>
          </div>
        </div>

        {/* PRIMARY CTA: ANALYZE RETINAL MICROVASCULATURE */}
        <div className="pt-1">
          <button
            type="submit"
            disabled={!selectedFile || isLoading}
            className={`w-full min-h-[52px] py-3.5 px-6 rounded-xl font-heading font-black text-sm tracking-wide flex items-center justify-center space-x-2.5 transition-all shadow-xl active:scale-[0.98] ${
              !selectedFile || isLoading
                ? 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed shadow-none'
                : 'btn-shimmer text-slate-950 font-black shadow-[0_0_24px_rgba(56,189,248,0.4)] hover:shadow-[0_0_32px_rgba(56,189,248,0.65)]'
            }`}
          >
            {isLoading ? (
              <div className="flex flex-col items-center justify-center space-y-1 text-slate-950">
                <div className="flex items-center space-x-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span className="font-bold text-xs uppercase tracking-wider">
                    {lang === 'hi' ? 'एआई विश्लेषण प्रगति पर है' : 'Analyzing Retinal Scan...'}
                  </span>
                </div>
                <p className="text-[11px] font-sans font-medium text-slate-900/90 animate-pulse">
                  {lang === 'hi' ? SCAN_STAGES_HI[scanStageIndex] : SCAN_STAGES_EN[scanStageIndex]}
                </p>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Camera className="w-5 h-5 text-slate-950" />
                <span>{t.analyzeBtn}</span>
                <ChevronRight className="w-4 h-4 text-slate-950/80 group-hover:translate-x-0.5 transition-transform" />
              </div>
            )}
          </button>

          {!selectedFile && !isLoading && (
            <p className="text-center text-[11px] text-slate-400 mt-2 font-medium flex items-center justify-center space-x-1">
              <Info className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>
                {lang === 'hi'
                  ? 'शुरू करने के लिए ऊपर से कोई नमूना चुनें या फोटो अपलोड करें'
                  : 'Please pick a 1-click sample above or upload a photo to enable analysis'}
              </span>
            </p>
          )}
        </div>
      </form>
    </div>
  );
};
