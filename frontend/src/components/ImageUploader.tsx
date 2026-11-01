import React, { useState, useRef } from 'react';
import { Upload, Camera, AlertCircle, CheckCircle, RefreshCw, FileUp, Sparkles } from 'lucide-react';
import { Language, translations } from '../utils/language';
import { EyeSide, IqaResult } from '../types';
import { precheckIqa } from '../services/api';

interface ImageUploaderProps {
  lang: Language;
  onAnalyze: (formData: FormData) => void;
  isLoading: boolean;
}

const BENCHMARKS = [
  {
    file: 'sample_normal_grade0.jpg',
    name: 'Rajesh Sharma',
    age: 52,
    gender: 'Male',
    grade: 0,
    icon: '🟢',
    label: 'Grade 0: Normal Retina (No DR)',
    badge: 'Normal Control',
    color: 'border-emerald-500/30 hover:border-emerald-400 bg-emerald-950/20 text-emerald-300 hover:bg-emerald-950/40',
  },
  {
    file: 'sample_mild_grade1.jpg',
    name: 'Sunita Verma',
    age: 58,
    gender: 'Female',
    grade: 1,
    icon: '🟡',
    label: 'Grade 1: Mild NPDR',
    badge: 'Microaneurysms Only',
    color: 'border-amber-500/30 hover:border-amber-400 bg-amber-950/20 text-amber-300 hover:bg-amber-950/40',
  },
  {
    file: 'sample_moderate_grade2.jpg',
    name: 'Mohammad Ali',
    age: 63,
    gender: 'Male',
    grade: 2,
    icon: '🟠',
    label: 'Grade 2: Moderate NPDR',
    badge: 'Exudates & Hemorrhages',
    color: 'border-orange-500/30 hover:border-orange-400 bg-orange-950/20 text-orange-300 hover:bg-orange-950/40',
  },
  {
    file: 'sample_severe_grade3.jpg',
    name: 'Anita Devi',
    age: 66,
    gender: 'Female',
    grade: 3,
    icon: '🔴',
    label: 'Grade 3: Severe NPDR',
    badge: '4-Quadrant Blots',
    color: 'border-rose-500/30 hover:border-rose-400 bg-rose-950/20 text-rose-300 hover:bg-rose-950/40',
  },
  {
    file: 'sample_proliferative_grade4.jpg',
    name: 'Kailash Chand',
    age: 71,
    gender: 'Male',
    grade: 4,
    icon: '🚨',
    label: 'Grade 4: Proliferative DR',
    badge: 'Neovascularization',
    color: 'border-red-500/40 hover:border-red-400 bg-red-950/30 text-red-300 hover:bg-red-950/50',
  },
  {
    file: 'sample_blurry_fail.jpg',
    name: 'Vikram Patel',
    age: 49,
    gender: 'Male',
    grade: 1,
    icon: '⚠️',
    label: 'Blurry Sample (IQA Retake)',
    badge: 'Simulated Blur Artifact',
    color: 'border-slate-600/40 hover:border-slate-400 bg-slate-900/40 text-slate-300 hover:bg-slate-900/70',
  },
];

export const ImageUploader: React.FC<ImageUploaderProps> = ({ lang, onAnalyze, isLoading }) => {
  const t = translations[lang];

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [patientName, setPatientName] = useState('Rajesh Sharma');
  const [patientAge, setPatientAge] = useState(58);
  const [patientGender, setPatientGender] = useState('Male');
  const [diabetesHistory, setDiabetesHistory] = useState('Type 2 Diabetes (7 yrs, HbA1c 7.9%)');
  const [eyeSide, setEyeSide] = useState<EyeSide>('RIGHT');

  const [iqaChecking, setIqaChecking] = useState(false);
  const [iqaResult, setIqaResult] = useState<IqaResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleSelectSample = async (
    filename: string,
    defaultName: string,
    grade: number,
    age: number,
    gender: string
  ) => {
    try {
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

  return (
    <div className="glass-panel p-5 sm:p-6 shadow-2xl relative overflow-hidden pop-in rounded-2xl border border-[rgba(70,170,255,0.2)]">
      {/* Decorative top-right corner glow */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-[#35b6ff]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Section Header */}
      <div className="mb-5">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#35b6ff]/20 text-[#35b6ff] flex items-center justify-center border border-[#35b6ff]/30 shadow-[0_0_10px_rgba(53,182,255,0.2)]">
            <Upload className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-lg text-white">
              {t.uploadTitle}
            </h2>
            <p className="text-xs text-[#9ab0c9] mt-0.5">{t.uploadSubtitle}</p>
          </div>
        </div>
      </div>

      {/* Select Sample Clinical Benchmark (Clean 2-Column Readable Layout with Full Stage Names, No Truncation) */}
      <div className="mb-5 bg-[#04070d]/60 p-3.5 sm:p-4 rounded-2xl border border-[rgba(70,170,255,0.2)]">
        <div className="flex items-center justify-between text-xs font-bold text-[#eaf3ff] mb-3">
          <span className="flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#ffb020]" />
            <span>Select Sample Clinical Benchmark:</span>
          </span>
          <span className="text-[10px] text-[#35b6ff] font-mono">1-Click Test Cases</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {BENCHMARKS.map((bm) => (
            <button
              key={bm.file}
              type="button"
              onClick={() => handleSelectSample(bm.file, bm.name, bm.grade, bm.age, bm.gender)}
              className={`p-2.5 rounded-xl border text-left transition-all flex items-start space-x-2.5 text-xs ${bm.color} hover:shadow-md hover:scale-[1.01]`}
            >
              <span className="text-base shrink-0 leading-none mt-0.5">{bm.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-white leading-tight">
                  {bm.label}
                </div>
                <div className="text-[10px] opacity-80 mt-0.5">
                  {bm.name} • {bm.badge}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Compact, Modern Upload Area */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border border-dashed rounded-xl p-3.5 sm:p-4 text-center cursor-pointer transition-all ${
            previewUrl
              ? 'border-[#35b6ff] bg-[#35b6ff]/10 shadow-[0_0_16px_rgba(53,182,255,0.15)]'
              : 'border-[rgba(70,170,255,0.3)] hover:border-[#35b6ff] bg-[#04070d]/60 hover:bg-[#081222]/80'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
          />
          {previewUrl ? (
            <div className="flex items-center space-x-3.5">
              <img
                src={previewUrl}
                alt="Retinal Preview"
                className="w-14 h-14 object-cover rounded-xl border border-[#35b6ff]/50 shadow-md shrink-0"
              />
              <div className="text-left min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate flex items-center space-x-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-[#3dff9a] shrink-0" />
                  <span className="truncate">{selectedFile?.name}</span>
                </div>
                <p className="text-[11px] text-[#35b6ff] mt-0.5 font-medium">Photo loaded • Click to replace</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-3 py-1">
              <div className="w-9 h-9 rounded-xl bg-[#35b6ff]/15 border border-[#35b6ff]/35 flex items-center justify-center text-[#35b6ff] shrink-0 shadow-[0_0_10px_rgba(53,182,255,0.2)]">
                <FileUp className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-white leading-tight">
                  Click to browse or drag & drop fundus photo
                </p>
                <p className="text-[11px] text-[#9ab0c9] mt-0.5">
                  DICOM exports, JPG, PNG, TIFF (Min. 512×512)
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Live IQA Pre-check Feedback */}
        {iqaChecking && (
          <div className="p-3 bg-[#04070d] border border-[rgba(70,170,255,0.3)] rounded-xl flex items-center space-x-2.5 text-xs text-[#9ab0c9]">
            <RefreshCw className="w-4 h-4 animate-spin text-[#35b6ff]" />
            <span>Evaluating retinal aperture, Laplacian sharpness, and luminance...</span>
          </div>
        )}

        {iqaResult && !iqaChecking && (
          <div
            className={`p-3.5 rounded-xl border text-xs ${
              iqaResult.passed
                ? 'bg-[#3dff9a]/10 border-[#3dff9a]/40 text-[#3dff9a]'
                : 'bg-[#ff4d6d]/10 border-[#ff4d6d]/40 text-[#ff4d6d]'
            }`}
          >
            <div className="flex items-center space-x-2 font-bold flex-wrap gap-1">
              {iqaResult.passed ? (
                <CheckCircle className="w-4 h-4 text-[#3dff9a]" />
              ) : (
                <AlertCircle className="w-4 h-4 text-[#ff4d6d]" />
              )}
              <span>{iqaResult.passed ? t.iqaPassed : t.iqaFailed}</span>
              {iqaResult.error_codes?.map((code) => (
                <span key={code} className="px-2 py-0.5 rounded bg-rose-950 text-white font-mono text-[9px] border border-rose-800">
                  {code}
                </span>
              ))}
            </div>
            <p className="text-[11px] mt-1 text-slate-300 leading-relaxed">{iqaResult.feedback}</p>
            {iqaResult.recapture_instructions && !iqaResult.passed && (
              <p className="text-[10px] mt-1.5 text-rose-200 font-semibold bg-rose-950/60 p-2 rounded-lg border border-rose-900/60">
                <b>Recapture Guidance:</b> {iqaResult.recapture_instructions}
              </p>
            )}
            <div className="grid grid-cols-3 gap-2 mt-2 pt-1.5 border-t border-[rgba(70,170,255,0.15)] text-[10px] text-[#9ab0c9] font-mono">
              <div>Sharpness: <b className="text-white">{iqaResult.blur_score}</b></div>
              <div>Luminance: <b className="text-white">{iqaResult.illumination_score}</b></div>
              <div>Contrast: <b className="text-white">{iqaResult.contrast_score}</b></div>
            </div>
          </div>
        )}

        {/* Patient Metadata Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-xs font-semibold text-[#9ab0c9] mb-1">{t.patientName}</label>
            <input
              type="text"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              required
              className="w-full px-3.5 py-2 bg-[#04070d]/80 border border-[rgba(70,170,255,0.25)] focus:border-[#35b6ff] rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#35b6ff] transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-[#9ab0c9] mb-1">{t.patientAge}</label>
              <input
                type="number"
                value={patientAge}
                onChange={(e) => setPatientAge(Number(e.target.value))}
                required
                className="w-full px-3.5 py-2 bg-[#04070d]/80 border border-[rgba(70,170,255,0.25)] focus:border-[#35b6ff] rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#35b6ff] transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#9ab0c9] mb-1">{t.patientGender}</label>
              <select
                value={patientGender}
                onChange={(e) => setPatientGender(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#04070d]/80 border border-[rgba(70,170,255,0.25)] focus:border-[#35b6ff] rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#35b6ff] transition-all"
              >
                <option value="Male">{t.male}</option>
                <option value="Female">{t.female}</option>
                <option value="Other">{t.other}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9ab0c9] mb-1">{t.eyeSide}</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEyeSide('RIGHT')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                  eyeSide === 'RIGHT'
                    ? 'bg-[#35b6ff]/20 border-[#35b6ff] text-[#35b6ff] shadow-[0_0_12px_rgba(53,182,255,0.3)]'
                    : 'bg-[#04070d]/60 border-[rgba(70,170,255,0.15)] text-[#9ab0c9] hover:text-white'
                }`}
              >
                {t.rightEye}
              </button>
              <button
                type="button"
                onClick={() => setEyeSide('LEFT')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                  eyeSide === 'LEFT'
                    ? 'bg-[#35b6ff]/20 border-[#35b6ff] text-[#35b6ff] shadow-[0_0_12px_rgba(53,182,255,0.3)]'
                    : 'bg-[#04070d]/60 border-[rgba(70,170,255,0.15)] text-[#9ab0c9] hover:text-white'
                }`}
              >
                {t.leftEye}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9ab0c9] mb-1">{t.patientHistory}</label>
            <input
              type="text"
              value={diabetesHistory}
              onChange={(e) => setDiabetesHistory(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#04070d]/80 border border-[rgba(70,170,255,0.25)] focus:border-[#35b6ff] rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#35b6ff] transition-all"
            />
          </div>
        </div>

        {/* Submit Screening Analysis Button */}
        <button
          type="submit"
          disabled={!selectedFile || isLoading}
          className={`w-full mt-2 py-3 px-5 rounded-xl font-heading font-bold text-sm tracking-wide flex items-center justify-center space-x-2 transition-all shadow-xl ${
            !selectedFile || isLoading
              ? 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed'
              : 'btn-cyan-glow text-[#04070d] font-black active:scale-[0.99]'
          }`}
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-[#04070d]" />
              <span>{t.analyzing}</span>
            </>
          ) : (
            <>
              <Camera className="w-4 h-4" />
              <span>{t.analyzeBtn}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
