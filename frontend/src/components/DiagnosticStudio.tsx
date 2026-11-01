import React, { useState } from 'react';
import { Download, Stethoscope, AlertTriangle, ShieldCheck, Microscope, Info, Clock, Sparkles } from 'lucide-react';
import { ScreeningDetail } from '../types';
import { Language, translations } from '../utils/language';
import { SeverityBadge, UrgencyBadge } from './SeverityBadge';
import { LayerControls } from './LayerControls';
import { ProbabilityChart } from './ProbabilityChart';

interface DiagnosticStudioProps {
  screening: ScreeningDetail;
  lang: Language;
  onOpenReview: () => void;
  onOpenReport: () => void;
}

export const DiagnosticStudio: React.FC<DiagnosticStudioProps> = ({
  screening,
  lang,
  onOpenReview,
  onOpenReport,
}) => {
  const t = translations[lang];

  const [activeBaseLayer, setActiveBaseLayer] = useState<'raw' | 'clahe'>('clahe');
  const [showGradcam, setShowGradcam] = useState(true);
  const [showLesions, setShowLesions] = useState(true);
  const [gradcamOpacity, setGradcamOpacity] = useState(0.55);
  const [zoom, setZoom] = useState(1);

  const resetView = () => setZoom(1);

  const p = screening.patient;
  const pred = screening.prediction;
  const lesions = screening.lesions;
  const iqa = screening.iqa;
  const doctor = screening.doctor_review;

  // STRICT ON REJECTION GUARD:
  // If image failed IQA quality check, strictly HIDE center image view, Diagnostic Layer Engine,
  // ICDR grading cards, lesion counts, and report download button. Show ONLY clear Red Rejection Alert.
  if (iqa?.passed === false || screening.iqa_passed === false) {
    return (
      <div className="min-h-[460px] glass-panel p-8 border-2 border-rose-500/70 bg-rose-950/40 rounded-2xl shadow-2xl flex flex-col items-center justify-center text-center space-y-4 pop-in">
        <div className="w-16 h-16 rounded-2xl bg-rose-900/60 border border-rose-500/80 flex items-center justify-center text-rose-300 shadow-[0_0_24px_rgba(244,63,94,0.4)]">
          <AlertTriangle className="w-8 h-8 text-rose-400" />
        </div>
        <div className="max-w-lg space-y-2">
          <h3 className="font-heading font-black text-base sm:text-lg text-rose-200 uppercase tracking-wide">
            Quality Check Failed: Retinal Scan Unreadable / Non-Retinal
          </h3>
          <p className="text-xs sm:text-sm text-rose-300/90 leading-relaxed font-medium">
            Image rejected due to severe blur, low illumination, or non-retinal artifact. Diagnosis stopped to prevent medical misdiagnosis. Please capture a clear fundus photo.
          </p>
        </div>
      </div>
    );
  }

  const currentGrade = doctor ? doctor.confirmed_grade : (pred?.predicted_grade ?? 0);
  const baseImageUrl = activeBaseLayer === 'raw' 
    ? screening.raw_image_url 
    : (screening.preprocessed_image_url || screening.raw_image_url);

  const isDoctorReviewRequired = Boolean(screening.requires_manual_doctor_review || pred?.requires_manual_doctor_review);
  const uncertaintyScore = pred?.uncertainty_score ?? pred?.entropy ?? screening.uncertainty_score ?? 0;

  return (
    <div className="space-y-6 pop-in">
      {/* Top Banner: Patient Info & Actions */}
      <div className="glass-panel p-5 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-[rgba(70,170,255,0.2)]">
        <div>
          <div className="flex items-center space-x-3 flex-wrap gap-y-2">
            <h1 className="font-heading font-black text-xl text-white tracking-wide">
              {p.full_name}
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#04070d]/80 text-[#9ab0c9] border border-[rgba(70,170,255,0.25)]">
              {p.age} yrs • {p.gender}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#35b6ff]/15 text-[#35b6ff] border border-[#35b6ff]/40 shadow-[0_0_10px_rgba(53,182,255,0.2)]">
              {screening.eye_side === 'RIGHT' ? t.rightEye : t.leftEye}
            </span>
          </div>
          <p className="text-xs text-[#9ab0c9] mt-1.5 font-mono">
            Record ID: <span className="text-white">{screening.id.slice(0, 16)}</span> • {p.diabetes_history}
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={onOpenReview}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#081222] hover:bg-[#35b6ff]/20 border border-[#35b6ff]/40 hover:border-[#35b6ff] text-xs font-bold text-white transition-all shadow-[0_0_12px_rgba(53,182,255,0.15)] active:scale-95"
          >
            <Stethoscope className="w-4 h-4 text-[#35b6ff]" />
            <span>{doctor ? 'Update Review' : t.reviewDiagnosis}</span>
          </button>

          <button
            type="button"
            onClick={onOpenReport}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl btn-cyan-glow text-xs font-bold text-[#04070d] transition-all font-heading active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>{t.downloadReport}</span>
          </button>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Left Column: Viewport Canvas & Diagnostic Layer Engine (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#020408] border border-[rgba(70,170,255,0.35)] rounded-2xl overflow-hidden shadow-2xl relative flex items-center justify-center p-3 min-h-[460px] max-h-[540px]">
            {/* Tech HUD Corner Accents */}
            <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-[#35b6ff]/60 pointer-events-none z-10" />
            <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-[#35b6ff]/60 pointer-events-none z-10" />
            <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-[#35b6ff]/60 pointer-events-none z-10" />
            <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-[#35b6ff]/60 pointer-events-none z-10" />

            {/* Subtle Tech Grid */}
            <div
              className="absolute inset-0 opacity-15 pointer-events-none"
              style={{
                backgroundImage: 'linear-gradient(rgba(53,182,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(53,182,255,0.15) 1px, transparent 1px)',
                backgroundSize: '32px 32px'
              }}
            />

            {/* Centered, Fitted Multi-Layer Canvas Container */}
            <div
              className="relative transition-transform duration-150 ease-out inline-flex items-center justify-center max-w-full"
              style={{ transform: `scale(${zoom})` }}
            >
              {/* Base Retinal Fundus Image */}
              <img
                src={baseImageUrl}
                alt="Retinal Scan"
                className="max-h-[440px] max-w-full w-auto object-contain select-none rounded-xl block shadow-2xl"
              />

              {/* Layer 3: Grad-CAM Saliency Heatmap Overlay */}
              {showGradcam && pred?.gradcam_url && (
                <img
                  src={pred.gradcam_url}
                  alt="Grad-CAM Saliency Heatmap"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none mix-blend-screen transition-opacity duration-150 rounded-xl"
                  style={{ opacity: gradcamOpacity }}
                />
              )}

              {/* Layer 4: Lesion Segmentation Mask Overlay */}
              {showLesions && lesions?.mask_url && (
                <img
                  src={lesions.mask_url}
                  alt="Lesion Segmentation Overlay"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none transition-opacity duration-150 rounded-xl"
                  style={{ opacity: 0.95 }}
                />
              )}
            </div>
          </div>

          {/* Diagnostic Layer Engine (4 Working Layers + Smooth Heatmap Opacity Slider) */}
          <LayerControls
            lang={lang}
            activeBaseLayer={activeBaseLayer}
            setActiveBaseLayer={setActiveBaseLayer}
            showGradcam={showGradcam}
            setShowGradcam={setShowGradcam}
            showLesions={showLesions}
            setShowLesions={setShowLesions}
            gradcamOpacity={gradcamOpacity}
            setGradcamOpacity={setGradcamOpacity}
            zoom={zoom}
            setZoom={setZoom}
            resetView={resetView}
            hasLesions={Boolean(lesions && (lesions.microaneurysm_count > 0 || lesions.hemorrhage_count > 0 || lesions.hard_exudate_count > 0 || lesions.soft_exudate_count > 0))}
          />
        </div>

        {/* Right Column: Clean Cards with Zero Text Clipping (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">

          {/* Bayesian Deep Learning Clinical Safety Warning */}
          {isDoctorReviewRequired && (
            <div className="bg-[#ff8a3d]/15 border-2 border-[#ff8a3d]/60 rounded-2xl p-4 shadow-xl text-amber-100 space-y-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#ff8a3d]/20 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center space-x-2 text-[#ff8a3d] font-bold text-xs uppercase tracking-wide">
                <AlertTriangle className="w-4 h-4 text-[#ff8a3d] shrink-0 animate-pulse" />
                <span>Bayesian Clinical Safety Gate Triggered</span>
                <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#ff8a3d]/20 text-[#ff8a3d] border border-[#ff8a3d]/40 font-bold">
                  Entropy: {uncertaintyScore.toFixed(3)} &gt; 0.50
                </span>
              </div>
              <p className="text-[11px] text-amber-100/90 leading-relaxed font-medium">
                High predictive entropy detected. <b>Auto-approval blocked.</b> Mandatory clinical validation required by an ophthalmologist.
              </p>
              {pred?.safety_rationale && pred.safety_rationale.length > 0 && (
                <ul className="text-[10px] font-mono text-[#ffb020] list-disc list-inside space-y-0.5 pt-1 border-t border-[#ff8a3d]/20">
                  {pred.safety_rationale.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* CARD 1: ICDR Diagnostic Grading */}
          <div className="glass-panel p-5 shadow-xl rounded-2xl border border-[rgba(70,170,255,0.2)] space-y-3.5">
            <div className="flex items-center justify-between border-b border-[rgba(70,170,255,0.15)] pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#9ab0c9]">
                  {t.diagnosisTitle}
                </span>
                <div className="mt-1">
                  <SeverityBadge grade={currentGrade} gradeName={pred?.grade_name} size="lg" />
                </div>
              </div>
              <div className="text-right">
                <UrgencyBadge urgency={screening.referral_urgency} />
                <div className="text-xs text-[#35b6ff] font-mono font-bold mt-1.5 flex items-center justify-end space-x-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#35b6ff]" />
                  <span>{Math.round((pred?.confidence ?? 0) * 100)}% {t.confidence}</span>
                </div>
              </div>
            </div>

            {/* Doctor Review Verification Status */}
            {doctor && (
              <div className="p-3 bg-[#35b6ff]/10 border border-[#35b6ff]/30 rounded-xl text-xs space-y-1">
                <div className="flex items-center space-x-1.5 text-[#35b6ff] font-bold">
                  <ShieldCheck className="w-4 h-4 text-[#35b6ff]" />
                  <span>Clinician Verified by Dr. {doctor.doctor_name}</span>
                </div>
                {doctor.was_overridden && (
                  <p className="text-[#ffb020] text-[11px] font-semibold">
                    ⚠️ Grade was modified by doctor from Grade {pred?.predicted_grade} to Grade {doctor.confirmed_grade}.
                  </p>
                )}
                {doctor.clinical_notes && (
                  <p className="text-[#eaf3ff] text-[11px] italic">
                    "{doctor.clinical_notes}"
                  </p>
                )}
              </div>
            )}
          </div>

          {/* CARD 2: Suspected Microvascular Candidates (4 Columns with FULL LABELS without word cutoffs) */}
          <div className="glass-panel p-5 shadow-xl rounded-2xl border border-[rgba(70,170,255,0.2)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white tracking-wide">
                Suspected Microvascular Candidates
              </span>
              <span className="text-[10px] font-mono text-[#35b6ff] bg-[#35b6ff]/10 px-2 py-0.5 rounded border border-[#35b6ff]/30">
                Morphological CV
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Column 1: Microaneurysms */}
              <div className="p-3 rounded-xl bg-[#081222]/90 border border-[rgba(70,170,255,0.2)] text-center flex flex-col justify-center">
                <div className="text-lg font-black text-[#35b6ff] font-mono">
                  {lesions?.microaneurysm_count ?? 0}
                </div>
                <div className="text-[10px] sm:text-[11px] font-semibold text-[#9ab0c9] mt-1 leading-tight">
                  Microaneurysms
                </div>
              </div>

              {/* Column 2: Hemorrhages */}
              <div className="p-3 rounded-xl bg-[#081222]/90 border border-[rgba(70,170,255,0.2)] text-center flex flex-col justify-center">
                <div className="text-lg font-black text-[#ff4d6d] font-mono">
                  {lesions?.hemorrhage_count ?? 0}
                </div>
                <div className="text-[10px] sm:text-[11px] font-semibold text-[#9ab0c9] mt-1 leading-tight">
                  Hemorrhages
                </div>
              </div>

              {/* Column 3: Hard Exudates */}
              <div className="p-3 rounded-xl bg-[#081222]/90 border border-[rgba(70,170,255,0.2)] text-center flex flex-col justify-center">
                <div className="text-lg font-black text-[#ffb020] font-mono">
                  {lesions?.hard_exudate_count ?? 0}
                </div>
                <div className="text-[10px] sm:text-[11px] font-semibold text-[#9ab0c9] mt-1 leading-tight">
                  Hard Exudates
                </div>
              </div>

              {/* Column 4: Soft Exudates */}
              <div className="p-3 rounded-xl bg-[#081222]/90 border border-[rgba(70,170,255,0.2)] text-center flex flex-col justify-center">
                <div className="text-lg font-black text-[#ffd166] font-mono">
                  {lesions?.soft_exudate_count ?? 0}
                </div>
                <div className="text-[10px] sm:text-[11px] font-semibold text-[#9ab0c9] mt-1 leading-tight">
                  Soft Exudates
                </div>
              </div>
            </div>
          </div>

          {/* CARD 3: Model Checkpoint & Safety Gate (Clean 2x2 Grid + Status Badge) */}
          <div className="glass-panel p-5 shadow-xl rounded-2xl border border-[rgba(70,170,255,0.2)] space-y-3.5">
            <div className="flex items-center justify-between border-b border-[rgba(70,170,255,0.15)] pb-2.5">
              <div className="flex items-center space-x-2 text-xs font-bold text-white">
                <Microscope className="w-4 h-4 text-[#35b6ff]" />
                <span>{pred?.model_status || 'VERIFIED_TRAINED_CHECKPOINT'}</span>
              </div>
              <div className="flex items-center space-x-1 text-[11px] text-[#9ab0c9] font-mono">
                <Clock className="w-3.5 h-3.5 text-[#35b6ff]" />
                <span>{pred?.inference_time_ms ?? 0}ms</span>
              </div>
            </div>

            <p className="text-[11px] text-[#9ab0c9] font-mono">
              Backbone: <span className="text-white font-semibold">{pred?.model_provenance || 'EfficientNet-B0 (APTOS/EyePACS)'}</span>
            </p>

            {/* Clean 2x2 Grid */}
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-[#04070d]/80 border border-[rgba(70,170,255,0.15)]">
                <span className="text-[10px] text-[#9ab0c9] block font-medium">Monte Carlo Entropy</span>
                <b className="text-white font-mono text-xs">{uncertaintyScore.toFixed(3)}</b>
              </div>
              <div className="p-2.5 rounded-xl bg-[#04070d]/80 border border-[rgba(70,170,255,0.15)]">
                <span className="text-[10px] text-[#9ab0c9] block font-medium">Epistemic Uncertainty</span>
                <b className="text-[#35b6ff] font-mono text-xs">{(pred?.epistemic_uncertainty ?? 0).toFixed(3)}</b>
              </div>
              <div className="p-2.5 rounded-xl bg-[#04070d]/80 border border-[rgba(70,170,255,0.15)]">
                <span className="text-[10px] text-[#9ab0c9] block font-medium">Aleatoric Uncertainty</span>
                <b className="text-[#ff8a3d] font-mono text-xs">{(pred?.aleatoric_uncertainty ?? 0).toFixed(3)}</b>
              </div>
              <div className="p-2.5 rounded-xl bg-[#04070d]/80 border border-[rgba(70,170,255,0.15)]">
                <span className="text-[10px] text-[#9ab0c9] block font-medium">Calibrated Temperature</span>
                <b className="text-[#3dff9a] font-mono text-xs">{(pred?.temperature ?? 1.5).toFixed(2)}</b>
              </div>
            </div>

            {/* Clinical Safety Approval Status Badge */}
            <div className="pt-2 border-t border-[rgba(70,170,255,0.15)] flex items-center justify-between">
              <span className="text-[11px] text-[#9ab0c9] font-semibold">Approval Status:</span>
              {isDoctorReviewRequired ? (
                <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-[#ff8a3d]/20 text-[#ff8a3d] border border-[#ff8a3d]/50 shadow-[0_0_10px_rgba(255,138,61,0.2)]">
                  ⚠️ MANUAL REVIEW REQUIRED
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-[#3dff9a]/20 text-[#3dff9a] border border-[#3dff9a]/50 shadow-[0_0_10px_rgba(61,255,154,0.2)]">
                  ✓ AUTO-APPROVED (SAFE)
                </span>
              )}
            </div>
          </div>

          {/* 5-Class Probability Distribution */}
          {pred?.class_probabilities && (
            <ProbabilityChart
              lang={lang}
              probabilities={pred.class_probabilities}
              predictedGrade={pred.predicted_grade}
            />
          )}

          {/* Clinical Decision Support Disclaimer */}
          <div className="p-3.5 glass-panel rounded-2xl border border-[rgba(70,170,255,0.15)] flex items-start space-x-2 text-[11px] text-[#9ab0c9]">
            <Info className="w-4 h-4 text-[#35b6ff] shrink-0 mt-0.5" />
            <span>{t.researchDisclaimer}</span>
          </div>

        </div>
      </div>
    </div>
  );
};
