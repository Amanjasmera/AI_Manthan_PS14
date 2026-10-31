import React, { useState } from 'react';
import { 
  X, Check, Stethoscope, AlertTriangle, UserCheck, Eye, Layers, 
  Sparkles, CheckCircle2, ShieldAlert, FileText, Database, ArrowRight
} from 'lucide-react';
import { ScreeningDetail } from '../types';
import { Language, translations } from '../utils/language';
import { submitDoctorReview } from '../services/api';
import { SeverityBadge } from './SeverityBadge';

interface DoctorReviewModalProps {
  screening: ScreeningDetail;
  lang: Language;
  onClose: () => void;
  onSuccess: (updatedScreening: ScreeningDetail) => void;
}

const DEFAULT_ACTIVE_TAG = 'Indore_Hub_Active_v1.1';

export const DoctorReviewModal: React.FC<DoctorReviewModalProps> = ({
  screening,
  lang,
  onClose,
  onSuccess,
}) => {
  const t = translations[lang];

  const aiGrade = screening.prediction?.predicted_grade ?? 0;
  const currentConfirmedGrade = screening.doctor_review
    ? screening.doctor_review.confirmed_grade
    : aiGrade;

  const [doctorName, setDoctorName] = useState(
    screening.doctor_review?.doctor_name || 'Dr. Sunita Kulkarni, MD'
  );
  const [doctorLicense, setDoctorLicense] = useState(
    screening.doctor_review?.doctor_license || 'MCI-OPH-8842'
  );
  const [selectedGrade, setSelectedGrade] = useState<number>(currentConfirmedGrade);
  const [referralAdvice, setReferralAdvice] = useState(
    screening.doctor_review?.referral_recommendation ||
      'Refer to vitreoretinal specialist for dilated biomicroscopy & OCT.'
  );
  const [clinicalNotes, setClinicalNotes] = useState(
    screening.doctor_review?.clinical_notes ||
      'Confirmed presence of multiple microaneurysms and hard exudates in temporal quadrant.'
  );
  const [datasetTag, setDatasetTag] = useState(DEFAULT_ACTIVE_TAG);
  const [showGradcam, setShowGradcam] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOverridden = selectedGrade !== aiGrade;
  const p = screening.patient;
  const pred = screening.prediction;
  const lesions = screening.lesions;
  const baseImageUrl = screening.preprocessed_image_url || screening.raw_image_url;

  const handleConfirmAi = () => {
    setSelectedGrade(aiGrade);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await submitDoctorReview(screening.id, {
        doctor_name: doctorName,
        doctor_license: doctorLicense,
        confirmed_grade: selectedGrade,
        referral_recommendation: referralAdvice,
        clinical_notes: clinicalNotes,
        dataset_tag: datasetTag,
      });

      // Fetch the updated screening record from backend
      const res = await fetch(`/api/v1/screenings/${screening.id}`);
      const updated = await res.json();
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record doctor review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const grades = [
    { grade: 0, label: 'Grade 0: No DR', desc: 'No microvascular abnormalities or exudates' },
    { grade: 1, label: 'Grade 1: Mild NPDR', desc: 'Microaneurysms only' },
    { grade: 2, label: 'Grade 2: Moderate NPDR', desc: 'More than microaneurysms, less than severe' },
    { grade: 3, label: 'Grade 3: Severe NPDR', desc: '4-2-1 rule: hemorrhages in 4 quadrants or IRMA' },
    { grade: 4, label: 'Grade 4: Proliferative DR', desc: 'Neovascularization or vitreous/preretinal hemorrhage' },
  ];

  const presetReferrals = [
    'Annual routine community diabetic screening (12 months)',
    'Refer to vitreoretinal specialist for dilated biomicroscopy & OCT (3-6 months)',
    'Urgent vitreoretinal referral for OCT and anti-VEGF / laser evaluation (< 1 month)',
    'Emergency vitreoretinal surgical referral (within 24-48 hours)',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white">
                  Ophthalmologist Clinical Verification & Sign-Off
                </h3>
                <span className="hidden sm:inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  <Database className="w-3 h-3 mr-1" />
                  {datasetTag}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Phase 4: Active Learning & Clinical Feedback Loop (Indore Hub)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Patient Metadata Bar */}
        <div className="bg-slate-950/70 border-b border-slate-800/80 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3">
            <span className="font-bold text-white text-sm">{p.full_name}</span>
            <span className="text-slate-400">({p.age}y / {p.gender})</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono text-[11px]">
              {screening.eye_side === 'RIGHT' ? 'OD (Right Eye)' : 'OS (Left Eye)'}
            </span>
            <span className="text-slate-400">{p.diabetes_history}</span>
          </div>
          <div className="text-slate-500 font-mono text-[11px]">
            ID: {screening.id.slice(0, 14)}
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/40 text-rose-300 rounded-xl flex items-center space-x-2 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Two-Column Diagnostic & Decision Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

            {/* Left Column: Visual Saliency & AI Diagnostic Evidence (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              {/* Retinal & Grad-CAM Image Canvas */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden relative flex items-center justify-center min-h-[220px] max-h-[260px]">
                <img
                  src={baseImageUrl}
                  alt="Fundus"
                  className="max-h-[240px] w-auto object-contain select-none"
                />
                {showGradcam && pred?.gradcam_url && (
                  <img
                    src={pred.gradcam_url}
                    alt="Grad-CAM"
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none mix-blend-screen opacity-70"
                  />
                )}
                <div className="absolute top-2 right-2">
                  <button
                    type="button"
                    onClick={() => setShowGradcam(!showGradcam)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-semibold border flex items-center space-x-1 backdrop-blur-sm transition ${
                      showGradcam
                        ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200'
                        : 'bg-slate-900/80 border-slate-700 text-slate-400'
                    }`}
                  >
                    <Layers className="w-3 h-3" />
                    <span>{showGradcam ? 'Grad-CAM On' : 'Grad-CAM Off'}</span>
                  </button>
                </div>
              </div>

              {/* AI Prediction Summary Card */}
              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      AI Model Prediction
                    </span>
                    <div className="mt-1">
                      <SeverityBadge grade={aiGrade} gradeName={pred?.grade_name} size="sm" />
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400">Model Confidence</span>
                    <div className="text-cyan-400 font-mono font-bold text-sm">
                      {Math.round((pred?.confidence ?? 0) * 100)}%
                    </div>
                  </div>
                </div>

                {/* Uncertainty Score & Safety Gating */}
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="text-slate-400">Predictive Entropy:</span>
                  <span className="font-mono text-white font-semibold">
                    {(pred?.uncertainty_score ?? pred?.entropy ?? 0).toFixed(3)}
                  </span>
                </div>

                {(screening.requires_manual_doctor_review || pred?.requires_manual_doctor_review) && (
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 flex items-start space-x-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      High uncertainty (Entropy &gt; 0.50). <b>Human sign-off required</b> before patient release.
                    </span>
                  </div>
                )}

                {/* Lesion Summary Quantification */}
                <div className="pt-2 border-t border-slate-900">
                  <span className="text-[10px] font-semibold text-slate-400 block mb-1">
                    Suspected Lesion Counts:
                  </span>
                  <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
                    <div className="p-1 rounded bg-slate-900 border border-slate-800">
                      <div className="font-bold text-cyan-400">{lesions?.microaneurysm_count ?? 0}</div>
                      <div className="text-slate-500 text-[8px]">MA</div>
                    </div>
                    <div className="p-1 rounded bg-slate-900 border border-slate-800">
                      <div className="font-bold text-rose-400">{lesions?.hemorrhage_count ?? 0}</div>
                      <div className="text-slate-500 text-[8px]">HEM</div>
                    </div>
                    <div className="p-1 rounded bg-slate-900 border border-slate-800">
                      <div className="font-bold text-yellow-400">{lesions?.hard_exudate_count ?? 0}</div>
                      <div className="text-slate-500 text-[8px]">HARD</div>
                    </div>
                    <div className="p-1 rounded bg-slate-900 border border-slate-800">
                      <div className="font-bold text-amber-200">{lesions?.soft_exudate_count ?? 0}</div>
                      <div className="text-slate-500 text-[8px]">SOFT</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Clinician Sign-Off Controls (7 cols) */}
            <div className="lg:col-span-7 space-y-4">

              {/* Action Mode Selector: Confirm vs Override */}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleConfirmAi}
                  className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                    !isOverridden
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm AI Grade ({aiGrade})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    // Default to next grade or mild if overriding from 0
                    if (!isOverridden) {
                      setSelectedGrade(aiGrade === 0 ? 1 : 0);
                    }
                  }}
                  className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                    isOverridden
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Override Grade</span>
                </button>
              </div>

              {/* Override Notice if active */}
              {isOverridden && (
                <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    <b>Override Active:</b> AI suggested <b>Grade {aiGrade}</b> ➔ Doctor confirms <b>Grade {selectedGrade}</b>.
                    Will be prioritized for active learning fine-tuning.
                  </span>
                </div>
              )}

              {/* 5-Grade Selector Cards */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Confirmed ICDR Diabetic Retinopathy Grade:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {grades.map((item) => {
                    const isSelected = selectedGrade === item.grade;
                    const isAi = aiGrade === item.grade;
                    return (
                      <button
                        key={item.grade}
                        type="button"
                        onClick={() => setSelectedGrade(item.grade)}
                        className={`p-2.5 rounded-xl border text-left transition relative ${
                          isSelected
                            ? 'bg-cyan-500/20 border-cyan-400 text-white shadow'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs">{item.label}</span>
                          <div className="flex items-center space-x-1">
                            {isAi && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] bg-brand-500/20 text-brand-300 border border-brand-500/30">
                                AI
                              </span>
                            )}
                            {isSelected && <Check className="w-4 h-4 text-cyan-400" />}
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                          {item.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Doctor Credentials */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-400 mb-1">
                    Reviewing Doctor Name
                  </label>
                  <input
                    type="text"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-400 mb-1">
                    MCI Registration / License
                  </label>
                  <input
                    type="text"
                    value={doctorLicense}
                    onChange={(e) => setDoctorLicense(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              {/* Specialist Referral Recommendation */}
              <div className="text-xs space-y-1.5">
                <label className="block font-medium text-slate-400">
                  Referral Recommendation & Clinical Protocol
                </label>
                <input
                  type="text"
                  value={referralAdvice}
                  onChange={(e) => setReferralAdvice(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                />
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {presetReferrals.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setReferralAdvice(preset)}
                      className="text-[10px] px-2 py-0.5 bg-slate-800/80 hover:bg-slate-800 rounded text-slate-300 transition"
                    >
                      {preset.split('(')[0].trim()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clinical Observations Notes */}
              <div className="text-xs">
                <label className="block font-medium text-slate-400 mb-1">
                  Clinical Observations & Diagnostic Notes
                </label>
                <textarea
                  rows={3}
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  placeholder="Record quadrant distribution, macular edema observations, or laser photocoagulation recommendation..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-cyan-500 resize-none text-xs"
                />
              </div>

              {/* Active Learning Dataset Tagging Badge */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Database className="w-4 h-4 text-cyan-400" />
                  <span className="text-slate-300 font-medium">Active Learning Dataset:</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={datasetTag}
                    onChange={(e) => setDatasetTag(e.target.value)}
                    className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-[11px] font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                  />
                  <span className="text-[10px] text-slate-400 font-mono">v1 &rarr; v1.1 fine-tune</span>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-400 text-[11px] flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              Sign-off will update clinical triage, regenerate bilingual PDF, and sync to Indore Active Learning Hub.
            </span>
          </div>

          <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold transition shadow-lg shadow-cyan-500/20 flex items-center space-x-1.5"
            >
              <UserCheck className="w-4 h-4" />
              <span>{isSubmitting ? 'Recording Sign-Off...' : 'Sign-Off & Submit Review'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
