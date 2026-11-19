import React, { useState } from 'react';
import { UserCheck, Phone, Mail, MessageSquare, AlertCircle, X, CheckCircle2, Loader2 } from 'lucide-react';
import { ScreeningDetail, ReviewRequestPayload } from '../types';
import { requestDoctorReview } from '../services/api';

interface RequestReviewModalProps {
  screening: ScreeningDetail;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: any) => void;
}

export const RequestReviewModal: React.FC<RequestReviewModalProps> = ({
  screening,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [phone, setPhone] = useState(screening.patient_phone || '');
  const [email, setEmail] = useState(screening.patient_email || '');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() && !email.trim()) {
      setError('Please provide at least a contact phone number or email address.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const payload: ReviewRequestPayload = {
        patient_phone: phone.trim() || undefined,
        patient_email: email.trim() || undefined,
        notes: notes.trim() || undefined
      };

      const res = await requestDoctorReview(screening.id, payload);
      onSuccess(res.screening || res);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit review request.');
    } finally {
      setSubmitting(false);
    }
  };

  const patientName = screening.patient?.full_name || 'Patient';
  const gradeLabel = screening.prediction?.grade_name || screening.status || 'Screened Eye';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#0F172A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Send to Doctor for Review</h3>
              <p className="text-xs text-slate-400">विशेषज्ञ डॉक्टर समीक्षा का अनुरोध करें</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Patient Context Pill */}
        <div className="px-6 py-3 bg-slate-950/40 border-b border-white/5 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-400">Patient: </span>
            <span className="text-white font-medium">{patientName}</span>
            {screening.patient?.age && (
              <span className="text-slate-400"> ({screening.patient.age}y, {screening.patient.gender})</span>
            )}
          </div>
          <div className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 font-medium">
            {gradeLabel}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              WhatsApp / Phone Number <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                required
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Doctor will contact or send guidance to this mobile number.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Email Address (Optional)
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="patient@example.com"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Symptoms / Note for Specialist (Optional)
            </label>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="e.g. Floaters observed, vision blurry in dim light, diabetic for 7 years..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all resize-none"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-semibold shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submit for Doctor Review</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

