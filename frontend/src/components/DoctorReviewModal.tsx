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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#04070d]/85 backdrop-blur-xl pop-in overflow-y-auto">
      <div className="bg-[#081222] border border-[rgba(70,170,255,0.35)] rounded-2xl w-full max-w-4xl shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[rgba(70,170,255,0.15)] bg-[#04070d]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#35b6ff]/20 text-[#35b6ff] flex items-center justify-center border border-[#35b6ff]/30 shadow-[0_0_12px_rgba(53,182,255,0.2)]">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-heading font-bold text-base text-white">
                  Ophthalmologist Clinical Verification & Sign-Off
                </h3>
                <span className="hidden sm:inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#35b6ff]/10 text-[#35b6ff] border border-[#35b6ff]/30">
                  <Database className="w-3 h-3 mr-1" />
                  {datasetTag}
                </span>
              </div>
              <p className="text-xs text-[#9ab0c9]">
                NETRA X • Clinical Active Learning & Verification Loop
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Patient Metadata Bar */}
        <div className="bg-[#04070d]/70 border-b border-[rgba(70,170,255,0.15)] px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3">
            <span className="font-bold text-white text-sm">{p.full_name}</span>
            <span className="text-[#9ab0c9]">({p.age}y / {p.gender})</span>
            <span className="px-2.5 py-0.5 rounded-full bg-[#081222] text-[#35b6ff] border border-[#35b6ff]/30 font-mono text-[11px] font-bold">
              {screening.eye_side === 'RIGHT' ? 'OD (Right Eye)' : 'OS (Left Eye)'}
            </span>
            <span className="text-[#9ab0c9]">{p.diabetes_history}</span>
          </div>
          <div className="text-slate-500 font-mono text-[11px]">
            ID: {screening.id.slice(0, 14)}
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3 bg-rose-950/60 border border-rose-500/50 text-rose-200 rounded-xl flex items-center space-x-2 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Two-Column Diagnostic & Decision Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

            {/* Left Column: Visual Saliency & AI Diagnostic Evidence (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              {/* Retinal & Grad-CAM Image Canvas */}
              <div className="bg-[#020408] border border-[rgba(70,170,255,0.3)] rounded-2xl overflow-hidden relative flex items-center justify-center min-h-[220px] max-h-[260px]">
                <img
                  src={baseImageUrl}
                  alt="Fundus"
                  className="max-h-[240px] w-auto object-contain select-none rounded-xl"
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
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border flex items-center space-x-1 backdrop-blur-md transition ${
                      showGradcam
                        ? 'bg-[#35b6ff]/30 border-[#35b6ff] text-white shadow-[0_0_10px_rgba(53,182,255,0.4)]'
                        : 'bg-[#04070d]/80 border-slate-700 text-slate-400'
                    }`}
                  >
                    <Layers className="w-3 h-3" />
                    <span>{showGradcam ? 'Grad-CAM On' : 'Grad-CAM Off'}</span>
                  </button>
                </div>
              </div>

              {/* AI Prediction Summary Card */}
              <div className="bg-[#04070d]/90 border border-[rgba(70,170,255,0.2)] rounded-2xl p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-[rgba(70,170,255,0.15)] pb-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#9ab0c9]">
                      AI Model Prediction
                    </span>
                    <div className="mt-1">
                      <SeverityBadge grade={aiGrade} gradeName={pred?.grade_name} size="sm" />
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[#9ab0c9]">Confidence</span>
                    <div className="text-[#35b6ff] font-mono font-bold text-sm">
                      {Math.round((pred?.confidence ?? 0) * 100)}%
                    </div>
                  </div>
                </div>

                {/* Uncertainty Score & Safety Gating */}
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="text-[#9ab0c9]">Predictive Entropy:</span>
                  <span className="font-mono text-white font-bold">
                    {(pred?.uncertainty_score ?? pred?.entropy ?? 0).toFixed(3)}
                  </span>
                </div>

                {(screening.requires_manual_doctor_review || pred?.requires_manual_doctor_review) && (
                  <div className="p-2.5 rounded-xl bg-[#ff8a3d]/15 border border-[#ff8a3d]/40 text-[11px] text-[#ff8a3d] flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-[#ff8a3d] shrink-0 mt-0.5 animate-pulse" />
                    <span>
                      High uncertainty detected. <b>Doctor review required</b> before final sign-off.
                    </span>
                  </div>
                )}

                {/* Lesion Summary Quantification */}
                <div className="pt-2 border-t border-[rgba(70,170,255,0.15)]">
                  <span className="text-[10px] font-semibold text-[#9ab0c9] block mb-1">
                    Suspected Lesion Counts:
                  </span>
                  <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
                    <div className="p-1.5 rounded-xl bg-[#081222] border border-[rgba(70,170,255,0.15)]">
                      <div className="font-bold text-[#35b6ff]">{lesions?.microaneurysm_count ?? 0}</div>
                      <div className="text-[#9ab0c9] text-[8px]">MA</div>
                    </div>
                    <div className="p-1.5 rounded-xl bg-[#081222] border border-[rgba(70,170,255,0.15)]">
                      <div className="font-bold text-[#ff4d6d]">{lesions?.hemorrhage_count ?? 0}</div>
                      <div className="text-[#9ab0c9] text-[8px]">HEM</div>
                    </div>
                    <div className="p-1.5 rounded-xl bg-[#081222] border border-[rgba(70,170,255,0.15)]">
                      <div className="font-bold text-[#ffb020]">{lesions?.hard_exudate_count ?? 0}</div>
                      <div className="text-[#9ab0c9] text-[8px]">HARD</div>
                    </div>
                    <div className="p-1.5 rounded-xl bg-[#081222] border border-[rgba(70,170,255,0.15)]">
                      <div className="font-bold text-[#ffd166]">{lesions?.soft_exudate_count ?? 0}</div>
                      <div className="text-[#9ab0c9] text-[8px]">SOFT</div>
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
                  className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                    !isOverridden
                      ? 'bg-[#3dff9a]/20 border-[#3dff9a] text-[#3dff9a] shadow-[0_0_12px_rgba(61,255,154,0.3)]'
                      : 'bg-[#04070d] border-[rgba(70,170,255,0.15)] text-[#9ab0c9] hover:text-white'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm AI Grade ({aiGrade})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!isOverridden) {
                      setSelectedGrade(aiGrade === 0 ? 1 : 0);
                    }
                  }}
                  className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                    isOverridden
                      ? 'bg-[#ff8a3d]/20 border-[#ff8a3d] text-[#ff8a3d] shadow-[0_0_12px_rgba(255,138,61,0.3)]'
                      : 'bg-[#04070d] border-[rgba(70,170,255,0.15)] text-[#9ab0c9] hover:text-white'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Override Grade</span>
                </button>
              </div>

              {/* Override Notice if active */}
              {isOverridden && (
                <div className="p-3 rounded-xl bg-[#ff8a3d]/15 border border-[#ff8a3d]/50 text-amber-200 text-xs flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-[#ff8a3d] shrink-0" />
                  <span>
                    <b>Override Active:</b> AI suggested <b>Grade {aiGrade}</b> ➔ Doctor signs off <b>Grade {selectedGrade}</b>.
                    Tagged for Active Learning fine-tuning.
                  </span>
                </div>
              )}

              {/* 5-Grade Selector Cards */}
              <div>
                <label className="block text-xs font-bold text-[#eaf3ff] mb-1.5">
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
                        className={`p-3 rounded-xl border text-left transition relative ${
                          isSelected
                            ? 'bg-[#35b6ff]/20 border-[#35b6ff] text-white shadow-[0_0_14px_rgba(53,182,255,0.3)]'
                            : 'bg-[#04070d] border-[rgba(70,170,255,0.15)] text-slate-300 hover:border-[#35b6ff]/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs">{item.label}</span>
                          <div className="flex items-center space-x-1">
                            {isAi && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#35b6ff]/20 text-[#35b6ff] border border-[#35b6ff]/40">
                                AI
                              </span>
                            )}
                            {isSelected && <Check className="w-4 h-4 text-[#35b6ff]" />}
                          </div>
                        </div>
                        <p className="text-[10px] text-[#9ab0c9] mt-0.5 leading-tight">
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
                  <label className="block font-semibold text-[#9ab0c9] mb-1">
                    Reviewing Doctor Name
                  </label>
                  <input
                    type="text"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-[#04070d] border border-[rgba(70,170,255,0.25)] rounded-xl text-white focus:outline-none focus:border-[#35b6ff]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#9ab0c9] mb-1">
                    MCI Registration / License #
                  </label>
                  <input
                    type="text"
                    value={doctorLicense}
                    onChange={(e) => setDoctorLicense(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-[#04070d] border border-[rgba(70,170,255,0.25)] rounded-xl text-white focus:outline-none focus:border-[#35b6ff] font-mono"
                  />
                </div>
              </div>

              {/* Specialist Referral Recommendation */}
              <div className="text-xs space-y-1.5">
                <label className="block font-semibold text-[#9ab0c9]">
                  Referral Recommendation & Clinical Protocol
                </label>
                <input
                  type="text"
                  value={referralAdvice}
                  onChange={(e) => setReferralAdvice(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#04070d] border border-[rgba(70,170,255,0.25)] rounded-xl text-white focus:outline-none focus:border-[#35b6ff]"
                />
                <div className="flex flex-wrap gap-1 pt-1">
                  {presetReferrals.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setReferralAdvice(preset)}
                      className="text-[10px] px-2.5 py-1 bg-[#04070d] hover:bg-[#35b6ff]/20 border border-[rgba(70,170,255,0.2)] rounded-lg text-slate-300 transition"
                    >
                      {preset.split('(')[0].trim()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clinical Observations Notes */}
              <div className="text-xs">
                <label className="block font-semibold text-[#9ab0c9] mb-1">
                  Clinical Observations & Diagnostic Notes
                </label>
                <textarea
                  rows={3}
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  placeholder="Record quadrant distribution, macular observations, or laser photocoagulation recommendation..."
                  className="w-full px-3.5 py-2.5 bg-[#04070d] border border-[rgba(70,170,255,0.25)] rounded-xl text-white focus:outline-none focus:border-[#35b6ff] resize-none text-xs"
                />
              </div>

              {/* Active Learning Dataset Tagging Badge */}
              <div className="p-3 bg-[#04070d] border border-[rgba(70,170,255,0.2)] rounded-xl text-xs flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Database className="w-4 h-4 text-[#35b6ff]" />
                  <span className="text-slate-300 font-semibold">Active Learning Tag:</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={datasetTag}
                    onChange={(e) => setDatasetTag(e.target.value)}
                    className="px-2.5 py-1 bg-[#081222] border border-[#35b6ff]/40 rounded-lg text-[11px] font-mono text-[#35b6ff] focus:outline-none focus:border-[#35b6ff]"
                  />
                  <span className="text-[10px] text-[#9ab0c9] font-mono">v1 &rarr; v1.1 loop</span>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-[rgba(70,170,255,0.15)] bg-[#04070d] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-[#9ab0c9] text-[11px] flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#35b6ff]" />
            <span>
              Sign-off will update clinical triage and sync record to Indore Active Learning Hub.
            </span>
          </div>

          <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-[#081222] hover:bg-slate-800 text-slate-300 font-bold transition border border-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl btn-cyan-glow text-[#04070d] font-heading font-black transition flex items-center space-x-2"
            >
              <UserCheck className="w-4 h-4" />
              <span>{isSubmitting ? 'Recording Sign-Off...' : 'Sign-Off & Submit'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
