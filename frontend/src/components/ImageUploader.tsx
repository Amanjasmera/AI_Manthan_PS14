import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Camera,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  FileUp,
  User,
  Calendar,
  Eye,
  Activity,
  ShieldCheck,
  Check,
  ChevronRight,
  Info,
  Edit3
} from 'lucide-react';
import { Language, translations } from '../utils/language';
import { IqaResult } from '../types';
import { precheckIqa } from '../services/api';
import { ActivePatientState } from './PatientIntake';

interface ImageUploaderProps {
  lang: Language;
  patient: ActivePatientState;
  onAnalyze: (formData: FormData) => void;
  isLoading: boolean;
  onEditPatient: () => void;
}

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

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  lang,
  patient,
  onAnalyze,
  isLoading,
  onEditPatient,
}) => {
  const t = translations[lang];

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('patient_name', patient.name);
    formData.append('age', patient.age.toString());
    formData.append('gender', patient.gender);
    formData.append('diabetes_history', patient.combinedHistory || 'Routine Screening');
    formData.append('eye_side', patient.eyeSide);

    onAnalyze(formData);
  };

  // Helper calculations for IQA progress gauges
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
      {/* 1. TOP COMPACT PATIENT SUMMARY BAR */}
      <div className="glass-panel p-4 rounded-2xl border border-sky-500/25 bg-slate-950/80 shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="font-heading font-black text-sm text-white tracking-wide truncate">
                {patient.name}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                {patient.age}y • {patient.gender}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                {patient.eyeSide === 'RIGHT' ? 'Right Eye (OD)' : 'Left Eye (OS)'}
              </span>
            </div>

            {/* History & Symptoms Tags */}
            <div className="flex items-center space-x-1.5 mt-2 flex-wrap gap-y-1 text-[10px]">
              {patient.historyItems && patient.historyItems.length > 0 ? (
                patient.historyItems.slice(0, 2).map((item, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded bg-amber-950/50 text-amber-200 border border-amber-800/60 font-medium">
                    {item.split('(')[0]}
                  </span>
                ))
              ) : null}
              {patient.symptomsItems && patient.symptomsItems.length > 0 ? (
                patient.symptomsItems.slice(0, 2).map((sym, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded bg-emerald-950/50 text-emerald-200 border border-emerald-800/60 font-medium">
                    {sym.split('(')[0]}
                  </span>
                ))
              ) : null}
            </div>
          </div>

          <button
            type="button"
            onClick={onEditPatient}
            className="shrink-0 flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-sky-500/30 text-sky-300 hover:text-white hover:border-sky-400 text-[11px] font-bold transition shadow-sm"
            title="Edit patient details"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{lang === 'hi' ? 'बदलें' : 'Edit'}</span>
          </button>
        </div>
      </div>

      {/* 2. RETINAL FUNDUS IMAGE UPLOAD DROPZONE */}
      <div className="glass-panel p-4 sm:p-5 shadow-2xl relative overflow-hidden rounded-2xl border border-sky-500/25 bg-slate-950/70">
        <div className="flex items-center justify-between pb-3 border-b border-sky-500/15 mb-3.5">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/40 flex items-center justify-center font-heading font-bold text-xs">
              <Upload className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-xs sm:text-sm text-white">
                {lang === 'hi' ? 'रेटिना फोटो अपलोड' : 'Retinal Fundus Photo Intake'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {lang === 'hi' ? 'फंडस कैमरा इमेज चुनें' : 'Upload scan for ' + (patient.eyeSide === 'RIGHT' ? 'Right Eye (OD)' : 'Left Eye (OS)')}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/25">
            Zero-Charge IQA
          </span>
        </div>

        {/* Dropzone with Pulse Ring */}
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
                  {lang === 'hi' ? 'फोटो लोड हो गई • बदलने के लिए यहाँ क्लिक करें' : 'Photo loaded • Click to replace'}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                  {selectedFile ? `${(selectedFile.size / 1024).toFixed(0)} KB • JPG/PNG` : 'Fundus scan ready'}
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
              {lang === 'hi' ? 'स्वचालित गुणवत्ता जांच: स्पष्टता एवं रोशनी का विश्लेषण जारी है...' : 'Evaluating aperture sharpness, illumination & focus quality...'}
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

            {/* Recapture Guidance */}
            {iqaResult.recapture_instructions && !iqaResult.passed && (
              <div className="p-2.5 rounded-lg bg-rose-950/70 border border-rose-900/80 text-[11px] text-rose-200 font-medium mb-2.5 space-y-1">
                <p className="font-bold text-rose-100 flex items-center space-x-1">
                  <span>💡 {lang === 'hi' ? 'कैंप ऑपरेटर सुझाव:' : 'Operator Recapture Tip:'}</span>
                </p>
                <p className="leading-relaxed opacity-95">{iqaResult.recapture_instructions}</p>
              </div>
            )}

            {/* Visual Progress Gauges for 3 Core Optical Parameters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-sans">
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

      {/* 3. PRIMARY CTA: ANALYZE RETINAL MICROVASCULATURE */}
      <form onSubmit={handleSubmit} className="pt-1">
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
              <span>{lang === 'hi' ? 'रेटिना सूक्ष्मरक्तवाहिका जांच करें' : 'Analyze Retinal Microvasculature'}</span>
              <ChevronRight className="w-4 h-4 text-slate-950/80 group-hover:translate-x-0.5 transition-transform" />
            </div>
          )}
        </button>

        {!selectedFile && !isLoading && (
          <p className="text-center text-[11px] text-slate-400 mt-2 font-medium flex items-center justify-center space-x-1">
            <Info className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>
              {lang === 'hi'
                ? 'जांच प्रारंभ करने के लिए कृपया ऊपर मरीज की आँख का फोटो अपलोड करें'
                : 'Please upload a fundus photograph above to initiate deep AI grading'}
            </span>
          </p>
        )}
      </form>
    </div>
  );
};
