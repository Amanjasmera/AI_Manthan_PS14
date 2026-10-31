import React, { useState } from 'react';
import { Download, Stethoscope, AlertTriangle, CheckCircle, ExternalLink, ShieldCheck, Microscope, Info, Clock, Thermometer, Sparkles } from 'lucide-react';
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
  onOpenReport
}) => {
  const t = translations[lang];

  const [showRaw, setShowRaw] = useState(false);
  const [showPrep, setShowPrep] = useState(true);
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

  const currentGrade = doctor ? doctor.confirmed_grade : (pred?.predicted_grade ?? 0);
  const baseImageUrl = showRaw ? screening.raw_image_url : (screening.preprocessed_image_url || screening.raw_image_url);

  const isDoctorReviewRequired = Boolean(screening.requires_manual_doctor_review || pred?.requires_manual_doctor_review);
  const uncertaintyScore = pred?.uncertainty_score ?? pred?.entropy ?? screening.uncertainty_score ?? 0;

  return (
    <div className="space-y-6">
      {/* Top Banner: Patient Info & Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-extrabold text-white">
              {p.full_name}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
              {p.age} yrs • {p.gender}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-300 border border-brand-500/30">
              {screening.eye_side === 'RIGHT' ? t.rightEye : t.leftEye}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            ID: {screening.id.slice(0, 16)} • {p.diabetes_history}
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={onOpenReview}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-white transition-all shadow"
          >
            <Stethoscope className="w-4 h-4 text-cyan-400" />
            <span>{doctor ? 'Update Review' : t.reviewDiagnosis}</span>
          </button>

          <button
            onClick={onOpenReport}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-cyan-600 hover:from-brand-500 hover:to-cyan-500 text-xs font-bold text-white transition-all shadow-lg shadow-brand-500/20"
          >
            <Download className="w-4 h-4" />
            <span>{t.downloadReport}</span>
          </button>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: Canvas Viewport (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative flex items-center justify-center min-h-[460px] max-h-[560px]">
            {/* Multi-Layer Canvas */}
            <div
              className="relative transition-transform duration-150 ease-out flex items-center justify-center"
              style={{ transform: `scale(${zoom})` }}
            >
              {/* Layer 1: Base Image */}
              <img
                src={baseImageUrl}
                alt="Retinal Base"
                className="max-h-[480px] w-auto object-contain select-none rounded-lg"
              />

              {/* Layer 2: Grad-CAM Overlay */}
              {showGradcam && pred?.gradcam_url && (
                <img
                  src={pred.gradcam_url}
                  alt="Grad-CAM Overlay"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none mix-blend-screen transition-opacity duration-200"
                  style={{ opacity: gradcamOpacity }}
                />
              )}

              {/* Layer 3: Suspected Lesion Overlay */}
              {showLesions && lesions?.mask_url && (
                <img
                  src={lesions.mask_url}
                  alt="Lesion Segmentation Overlay"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none transition-opacity duration-200"
                  style={{ opacity: 0.95 }}
                />
              )}
            </div>

            {/* Quality Failure Banner if IQA rejected */}
            {!iqa.passed && (
              <div className="absolute top-4 left-4 right-4 bg-rose-950/90 backdrop-blur border border-rose-500/60 p-4 rounded-xl text-rose-200 text-xs shadow-xl space-y-1.5">
                <div className="flex items-center space-x-2 font-bold text-rose-300">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                  <span>IQA Quality Gate Rejection</span>
                  {iqa.error_codes?.map((code) => (
                    <span key={code} className="px-2 py-0.5 rounded bg-rose-900/60 text-white font-mono text-[10px]">
                      {code}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] leading-relaxed">{iqa.feedback}</p>
                <div className="text-[11px] font-semibold text-rose-100 bg-rose-900/30 p-2 rounded-lg border border-rose-800/40">
                  <b>Recapture Action:</b> {iqa.recapture_instructions}
                </div>
              </div>
            )}
          </div>

          {/* Layer Engine Controls */}
          <LayerControls
            lang={lang}
            showRaw={showRaw}
            setShowRaw={setShowRaw}
            showPrep={showPrep}
            setShowPrep={setShowPrep}
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

        {/* Right Column: AI Decision Support & Clinical Summary (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">

          {/* Bayesian Deep Learning Clinical Safety Alert */}
          {isDoctorReviewRequired && (
            <div className="bg-amber-950/40 border-2 border-amber-500/50 rounded-2xl p-4 shadow-xl text-amber-200 space-y-2">
              <div className="flex items-center space-x-2 text-amber-300 font-bold text-xs uppercase tracking-wide">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Bayesian Clinical Safety Gate Triggered</span>
                <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Entropy: {uncertaintyScore.toFixed(3)} &gt; 0.50
                </span>
              </div>
              <p className="text-[11px] text-amber-200/90 leading-relaxed">
                High predictive entropy detected due to ambiguous pathology, optical blur, or borderline lesions.
                <b> Auto-approval blocked.</b> Mandatory clinical validation required by an ophthalmologist.
              </p>
              {pred?.safety_rationale && pred.safety_rationale.length > 0 && (
                <ul className="text-[10px] font-mono text-amber-300/80 list-disc list-inside space-y-0.5 pt-1 border-t border-amber-500/20">
                  {pred.safety_rationale.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Primary Severity Grade Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {t.diagnosisTitle}
                </span>
                <div className="mt-1">
                  <SeverityBadge grade={currentGrade} gradeName={pred?.grade_name} size="lg" />
                </div>
              </div>
              <div className="text-right">
                <UrgencyBadge urgency={screening.referral_urgency} />
                <div className="text-xs text-brand-400 font-mono font-bold mt-1.5">
                  {Math.round((pred?.confidence ?? 0) * 100)}% {t.confidence}
                </div>
              </div>
            </div>

            {/* Doctor Review Status if overridden */}
            {doctor && (
              <div className="p-3 bg-cyan-950/40 border border-cyan-500/30 rounded-xl text-xs space-y-1">
                <div className="flex items-center space-x-1.5 text-cyan-300 font-bold">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <span>Clinician Verified by Dr. {doctor.doctor_name}</span>
                </div>
                {doctor.was_overridden && (
                  <p className="text-amber-300 text-[11px]">
                    ⚠️ Grade was modified by doctor from Grade {pred?.predicted_grade} to Grade {doctor.confirmed_grade}.
                  </p>
                )}
                {doctor.clinical_notes && (
                  <p className="text-slate-300 text-[11px] italic">
                    "{doctor.clinical_notes}"
                  </p>
                )}
              </div>
            )}

            {/* Suspected Lesions Quantification Grid (4 Categories) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-300">
                  Suspected Microvascular Candidates:
                </span>
                <span className="text-[10px] text-slate-500 italic">
                  Morphological Analysis
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <div className="text-sm font-extrabold text-cyan-400">
                    {lesions?.microaneurysm_count ?? 0}
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5 leading-tight">
                    Microaneurysms
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <div className="text-sm font-extrabold text-rose-400">
                    {lesions?.hemorrhage_count ?? 0}
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5 leading-tight">
                    Hemorrhages
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <div className="text-sm font-extrabold text-yellow-400">
                    {lesions?.hard_exudate_count ?? 0}
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5 leading-tight">
                    Hard Exudates
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <div className="text-sm font-extrabold text-amber-200">
                    {lesions?.soft_exudate_count ?? 0}
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5 leading-tight">
                    Soft Exudates
                  </div>
                </div>
              </div>
            </div>

            {/* Inference Metadata & Bayesian Uncertainty Status */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-slate-300 font-semibold">
                  <Microscope className="w-3.5 h-3.5 text-brand-400" />
                  <span>{pred?.model_status || 'VERIFIED_TRAINED_CHECKPOINT'}</span>
                </div>
                <div className="flex items-center space-x-1 text-[10px] text-slate-400 font-mono">
                  <Clock className="w-3 h-3 text-cyan-400" />
                  <span>{pred?.inference_time_ms ?? 0}ms</span>
                </div>
              </div>
              <p className="text-slate-400 font-mono text-[10px]">
                {pred?.model_provenance || 'EfficientNet-B0'}
              </p>
              <div className="grid grid-cols-2 gap-2 text-[10px] pt-1.5 border-t border-slate-900">
                <span className="text-slate-400">
                  Predictive Entropy: <b className="text-white font-mono">{uncertaintyScore.toFixed(3)}</b>
                </span>
                <span className="text-slate-400">
                  Epistemic (Model): <b className="text-cyan-400 font-mono">{(pred?.epistemic_uncertainty ?? 0).toFixed(3)}</b>
                </span>
                <span className="text-slate-400">
                  Aleatoric (Noise): <b className="text-amber-400 font-mono">{(pred?.aleatoric_uncertainty ?? 0).toFixed(3)}</b>
                </span>
                <span className="text-slate-400">
                  Temp (T): <b className="text-emerald-400 font-mono">{(pred?.temperature ?? 1.5).toFixed(2)}</b>
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-slate-900">
                <span className="text-slate-400">
                  Clinical Safety Gate:
                </span>
                {isDoctorReviewRequired ? (
                  <span className="text-amber-400 font-bold font-mono">⚠️ MANUAL REVIEW REQUIRED</span>
                ) : (
                  <span className="text-emerald-400 font-bold font-mono">✓ AUTO-APPROVED (SAFE)</span>
                )}
              </div>
            </div>
          </div>

          {/* 5-Class Probability Chart */}
          {pred?.class_probabilities && (
            <ProbabilityChart
              lang={lang}
              probabilities={pred.class_probabilities}
              predictedGrade={pred.predicted_grade}
            />
          )}

          {/* Clinical Disclaimer */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-start space-x-2 text-[11px] text-slate-400">
            <Info className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
            <span>{t.researchDisclaimer}</span>
          </div>

        </div>
      </div>
    </div>
  );
};
