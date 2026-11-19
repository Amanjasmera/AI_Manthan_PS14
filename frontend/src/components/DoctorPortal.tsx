import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, AlertTriangle, Clock, CheckCircle2, Eye, Phone, Mail, 
  MessageSquare, ExternalLink, Search, Filter, RefreshCw, Send, Check, 
  FileText, ShieldCheck, Sparkles, User, AlertCircle, ArrowRight
} from 'lucide-react';
import { 
  DoctorStats, DoctorQueueItem, DoctorReviewActionPayload, UserProfile 
} from '../types';
import { 
  getDoctorStats, getDoctorQueue, submitDoctorPortalReview, getUserRole, getStoredUser 
} from '../services/api';

interface DoctorPortalProps {
  onNavigateHome?: () => void;
  onOpenLoginModal?: () => void;
}

export const DoctorPortal: React.FC<DoctorPortalProps> = ({
  onNavigateHome,
  onOpenLoginModal
}) => {
  const currentRole = (getUserRole() || '').toLowerCase();
  const currentUser: UserProfile | null = getStoredUser();
  const isDoctor = currentRole === 'doctor';

  // Statistics
  const [stats, setStats] = useState<DoctorStats>({
    pending_reviews: 0,
    high_risk_cases: 0,
    completed_reviews: 0,
    total_screenings: 0
  });

  // Review Queue state
  const [queue, setQueue] = useState<DoctorQueueItem[]>([]);
  const [selectedCase, setSelectedCase] = useState<DoctorQueueItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('PENDING_REVIEW');
  const [gradeFilter, setGradeFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Active view layer on selected case
  const [viewLayer, setViewLayer] = useState<'normal' | 'heatmap'>('heatmap');

  // Doctor Review Form state
  const [confirmedGrade, setConfirmedGrade] = useState<number>(0);
  const [actionStatus, setActionStatus] = useState<string>('REVIEWED');
  const [doctorSuggestion, setDoctorSuggestion] = useState<string>('');
  const [clinicContact, setClinicContact] = useState<string>('+91 9988776655 (District Eye Hospital Helpline)');
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  // Load KPI Stats and Queue
  const loadStats = async () => {
    if (!isDoctor) return;
    try {
      setStatsLoading(true);
      const data = await getDoctorStats();
      setStats(data);
    } catch (err: any) {
      console.warn('Could not load doctor stats:', err.message);
    } finally {
      setStatsLoading(false);
    }
  };

  const loadQueue = async () => {
    if (!isDoctor) return;
    try {
      setLoading(true);
      setError(null);
      const grade = gradeFilter !== 'ALL' ? parseInt(gradeFilter, 10) : undefined;
      const items = await getDoctorQueue(statusFilter, grade, searchTerm);
      setQueue(items);

      // Keep selection or pick first
      if (items.length > 0) {
        if (!selectedCase || !items.some(i => i.record_id === selectedCase.record_id)) {
          setSelectedCase(items[0]);
        } else {
          const updatedSelected = items.find(i => i.record_id === selectedCase.record_id);
          if (updatedSelected) setSelectedCase(updatedSelected);
        }
      } else {
        setSelectedCase(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch doctor review queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isDoctor) {
      loadStats();
      loadQueue();
    }
  }, [isDoctor, statusFilter, gradeFilter]);

  // Synchronize form when selected case changes
  useEffect(() => {
    if (selectedCase) {
      setConfirmedGrade(selectedCase.icdr_grade);
      setActionStatus(selectedCase.icdr_grade >= 3 ? 'URGENT_FOLLOWUP' : 'REVIEWED');
      setDoctorSuggestion(selectedCase.doctor_suggestion || '');
      if (selectedCase.doctor_contact_info) {
        setClinicContact(selectedCase.doctor_contact_info);
      }
      setSubmitSuccess(false);
    }
  }, [selectedCase?.record_id]);

  // Submit doctor review
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;
    if (!doctorSuggestion.trim()) {
      alert('Please provide clinical recommendations / prescription for this patient.');
      return;
    }

    try {
      setSubmittingReview(true);
      const payload: DoctorReviewActionPayload = {
        doctor_suggestion: doctorSuggestion.trim(),
        review_status: actionStatus,
        doctor_contact_info: clinicContact.trim() || undefined,
        confirmed_grade: confirmedGrade
      };

      const res = await submitDoctorPortalReview(selectedCase.record_id, payload);
      setSubmitSuccess(true);

      // Refresh list & stats
      await loadStats();
      await loadQueue();
    } catch (err: any) {
      alert(err.message || 'Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Quick suggestion templates
  const applyTemplate = (template: string) => {
    setDoctorSuggestion(template);
  };

  // 1. ROUTE GUARD: Not a Doctor
  if (!isDoctor) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-[#0F172A] border border-rose-500/30 text-center shadow-2xl space-y-5 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white font-heading">Access Denied — Doctors Only</h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              The Doctor Portal is restricted exclusively to certified ophthalmologists and licensed clinicians for signing off diagnostic reviews.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-900 border border-white/5 text-xs text-slate-300">
            Currently signed in as: <span className="font-semibold text-white">{currentUser?.full_name || 'Guest / Patient'}</span> ({currentUser?.role || 'user'})
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {onOpenLoginModal && (
              <button
                type="button"
                onClick={onOpenLoginModal}
                className="flex-1 py-3 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-teal-500/20"
              >
                Sign In as Doctor
              </button>
            )}
            {onNavigateHome && (
              <button
                type="button"
                onClick={onNavigateHome}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition-colors"
              >
                Return to Home
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      
      {/* Clinician Portal Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-black text-white font-heading tracking-tight">Doctor Portal</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  Clinician Mode
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Active Clinician: <span className="text-white font-semibold">{currentUser?.full_name || 'Dr. Amit Roy, MS'}</span> {currentUser?.license_id && `(${currentUser.license_id})`}
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => { loadStats(); loadQueue(); }}
          className="self-start md:self-auto flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs text-slate-300 hover:text-white transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Top KPI Summary Bar (4 Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Pending Reviews */}
        <div className="p-5 rounded-2xl bg-[#0F172A] border border-amber-500/20 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block mb-1 font-medium">Pending Reviews</span>
            <div className="text-2xl font-black text-amber-400 font-mono">
              {statsLoading ? '...' : stats.pending_reviews}
            </div>
            <span className="text-[10px] text-amber-300/80 mt-1 block">Awaiting sign-off</span>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 2: High Risk Cases */}
        <div className="p-5 rounded-2xl bg-[#0F172A] border border-rose-500/20 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block mb-1 font-medium">Urgent / High-Risk (Gr 3–4)</span>
            <div className="text-2xl font-black text-rose-400 font-mono">
              {statsLoading ? '...' : stats.high_risk_cases}
            </div>
            <span className="text-[10px] text-rose-300/80 mt-1 block">Severe / Proliferative</span>
          </div>
          <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 3: Completed Reviews */}
        <div className="p-5 rounded-2xl bg-[#0F172A] border border-teal-500/20 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block mb-1 font-medium">Completed Reviews</span>
            <div className="text-2xl font-black text-teal-400 font-mono">
              {statsLoading ? '...' : stats.completed_reviews}
            </div>
            <span className="text-[10px] text-teal-300/80 mt-1 block">Clinician verified</span>
          </div>
          <div className="p-3 rounded-xl bg-teal-500/10 text-teal-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 4: Total Screenings */}
        <div className="p-5 rounded-2xl bg-[#0F172A] border border-sky-500/20 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block mb-1 font-medium">Total Clinic Screenings</span>
            <div className="text-2xl font-black text-sky-400 font-mono">
              {statsLoading ? '...' : stats.total_screenings}
            </div>
            <span className="text-[10px] text-sky-300/80 mt-1 block">All registered patients</span>
          </div>
          <div className="p-3 rounded-xl bg-sky-500/10 text-sky-400">
            <Eye className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main 2-Column Clinical Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN (4 Cols): Review Queue List */}
        <div className="lg:col-span-4 bg-[#0F172A] border border-white/10 rounded-2xl p-4 shadow-xl space-y-4">
          
          {/* Filter Tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-900 rounded-xl border border-white/5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setStatusFilter('PENDING_REVIEW')}
              className={`py-2 px-2 rounded-lg transition-all text-center ${
                statusFilter === 'PENDING_REVIEW'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Pending ({stats.pending_reviews})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('HIGH_RISK')}
              className={`py-2 px-2 rounded-lg transition-all text-center ${
                statusFilter === 'HIGH_RISK'
                  ? 'bg-rose-500 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              High Risk ({stats.high_risk_cases})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('REVIEWED')}
              className={`py-2 px-2 rounded-lg transition-all text-center ${
                statusFilter === 'REVIEWED'
                  ? 'bg-teal-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Reviewed ({stats.completed_reviews})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`py-2 px-2 rounded-lg transition-all text-center ${
                statusFilter === 'ALL'
                  ? 'bg-sky-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Cases
            </button>
          </div>

          {/* Search & Severity Filter */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search patient, phone, record..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') loadQueue(); }}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-white/5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>Severity Grade:</span>
              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="bg-slate-900 text-xs text-white border border-white/10 rounded-lg px-2 py-1 focus:outline-none"
              >
                <option value="ALL">All Grades (0-4)</option>
                <option value="0">Grade 0 (Normal)</option>
                <option value="1">Grade 1 (Mild)</option>
                <option value="2">Grade 2 (Moderate)</option>
                <option value="3">Grade 3 (Severe)</option>
                <option value="4">Grade 4 (PDR)</option>
              </select>
            </div>
          </div>

          {/* Queue Items List */}
          <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
            {loading ? (
              <div className="text-center py-12 text-slate-400 text-xs space-y-2">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-teal-400" />
                <p>Loading clinical cases...</p>
              </div>
            ) : queue.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs space-y-2">
                <CheckCircle2 className="w-8 h-8 text-teal-400 mx-auto opacity-40" />
                <p className="font-medium text-slate-300">No cases in this queue.</p>
                <p className="text-[11px] text-slate-500">All matched patient screenings have been handled.</p>
              </div>
            ) : (
              queue.map((item) => {
                const isSelected = selectedCase?.record_id === item.record_id;
                const isUrgent = item.icdr_grade >= 3;
                const isPending = item.review_status === 'PENDING_REVIEW';
                const isCompleted = item.review_status === 'REVIEWED' || item.review_status === 'URGENT_FOLLOWUP';

                return (
                  <div
                    key={item.record_id}
                    onClick={() => setSelectedCase(item)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800/90 border-teal-500/80 shadow-[0_0_15px_rgba(20,184,166,0.2)]'
                        : 'bg-slate-900/60 border-white/5 hover:border-white/20 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-white text-xs flex items-center space-x-1.5">
                          <span>{item.patient_name}</span>
                          {item.age && (
                            <span className="text-slate-400 font-normal">({item.age}y, {item.gender})</span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
                          {item.eye_side}
                        </span>
                      </div>

                      {/* Grade Badge */}
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        item.icdr_grade === 0
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : item.icdr_grade <= 2
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
                      }`}>
                        Stage {item.icdr_grade}
                      </span>
                    </div>

                    <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                      {isPending ? (
                        <span className="flex items-center space-x-1 text-amber-400 font-medium">
                          <Clock className="w-3 h-3" />
                          <span>Review Requested</span>
                        </span>
                      ) : isCompleted ? (
                        <span className="flex items-center space-x-1 text-teal-400 font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{item.review_status === 'URGENT_FOLLOWUP' ? 'Urgent Followup' : 'Reviewed'}</span>
                        </span>
                      ) : (
                        <span className="text-slate-500">Scan Complete</span>
                      )}

                      {item.patient.phone && (
                        <span className="text-slate-400 font-mono text-[10px]">
                          📞 {item.patient.phone.slice(-5)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (8 Cols): Case Inspection & Action Workspace */}
        <div className="lg:col-span-8 bg-[#0F172A] border border-white/10 rounded-2xl p-6 shadow-xl space-y-6">
          {!selectedCase ? (
            <div className="min-h-[500px] flex flex-col items-center justify-center text-center p-8 text-slate-400 space-y-3">
              <Stethoscope className="w-12 h-12 text-slate-600" />
              <h3 className="text-base font-semibold text-white">No Case Selected</h3>
              <p className="text-xs max-w-sm text-slate-400 leading-relaxed">
                Select a patient case from the review queue on the left to inspect fundus imaging, AI diagnostics, and provide clinical sign-off.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Patient Banner & Direct Contact Actions */}
              <div className="p-4 rounded-xl bg-slate-900 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-lg font-bold text-white font-heading">{selectedCase.patient_name}</h2>
                    {selectedCase.age && (
                      <span className="text-xs text-slate-400">({selectedCase.age}y, {selectedCase.gender})</span>
                    )}
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[11px] font-mono text-teal-300">
                      {selectedCase.eye_side}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Diabetes History: <span className="text-slate-200">{selectedCase.patient.diabetes_history || 'Type 2 Diabetes'}</span>
                    {selectedCase.patient.symptoms && (
                      <> • Symptoms: <span className="text-slate-200">{selectedCase.patient.symptoms}</span></>
                    )}
                  </p>
                </div>

                {/* Direct Patient Contact Actions (Call, WhatsApp, Email) */}
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedCase.patient.phone ? (
                    <>
                      <a
                        href={`tel:${selectedCase.patient.phone.replace(/[^0-9+]/g, '')}`}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-semibold transition-colors"
                        title="Direct call patient"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Call</span>
                      </a>
                      <a
                        href={`https://wa.me/${selectedCase.patient.phone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(selectedCase.patient_name)},%20this%20is%20Dr.%20regarding%20your%20NETRA%20X%20retinal%20scan%20report.`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-colors"
                        title="Send WhatsApp message"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    </>
                  ) : (
                    <span className="text-[11px] text-slate-500 italic">No phone provided</span>
                  )}

                  {selectedCase.patient.email && (
                    <a
                      href={`mailto:${selectedCase.patient.email}?subject=Retinal%20Screening%20Evaluation%20-%20NETRA%20X&body=Dear%20${encodeURIComponent(selectedCase.patient_name)},%0A%0ARegarding%20your%20screening%20for%20${encodeURIComponent(selectedCase.eye_side)}:`}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs font-semibold transition-colors"
                      title="Send email"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Email</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Retinal Fundus & Heatmap Visualizer */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                    <span>Retinal Saliency Visualization</span>
                    <div className="flex items-center space-x-1 bg-slate-900 p-0.5 rounded-lg border border-white/5">
                      <button
                        type="button"
                        onClick={() => setViewLayer('normal')}
                        className={`px-2 py-1 rounded text-[11px] ${
                          viewLayer === 'normal' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400'
                        }`}
                      >
                        Normal
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewLayer('heatmap')}
                        className={`px-2 py-1 rounded text-[11px] ${
                          viewLayer === 'heatmap' ? 'bg-rose-500 text-white font-bold' : 'text-slate-400'
                        }`}
                      >
                        Grad-CAM
                      </button>
                    </div>
                  </div>

                  <div className="relative aspect-square rounded-2xl overflow-hidden bg-black border border-white/10 flex items-center justify-center">
                    {viewLayer === 'normal' && selectedCase.raw_image_url ? (
                      <img
                        src={selectedCase.raw_image_url}
                        alt="Retinal Fundus"
                        className="w-full h-full object-contain"
                      />
                    ) : selectedCase.heatmap_image_url ? (
                      <img
                        src={selectedCase.heatmap_image_url}
                        alt="Grad-CAM Saliency"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-slate-500 text-xs">No image asset available</div>
                    )}
                  </div>
                </div>

                {/* AI Biomarkers & Diagnostics Summary */}
                <div className="space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                      AI Diagnostic Metrics
                    </span>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-3 rounded-xl bg-slate-900 border border-white/5">
                        <span className="text-slate-400 text-[10px] block">Model Grade</span>
                        <span className="font-bold text-white text-sm">
                          Stage {selectedCase.icdr_grade}: {selectedCase.stage_label}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900 border border-white/5">
                        <span className="text-slate-400 text-[10px] block">Confidence</span>
                        <span className="font-bold text-teal-400 text-sm">
                          {(selectedCase.model_confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900 border border-white/5">
                        <span className="text-slate-400 text-[10px] block">Entropy / Uncertainty</span>
                        <span className="font-bold text-sky-400 text-sm">
                          {selectedCase.entropy.toFixed(3)}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900 border border-white/5">
                        <span className="text-slate-400 text-[10px] block">Referral Urgency</span>
                        <span className="font-bold text-amber-400 text-sm">
                          {selectedCase.referral_urgency || 'ROUTINE'}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900 border border-white/5 space-y-1.5">
                      <span className="text-slate-400 text-[10px] block font-semibold">Detected Lesion Biomarkers</span>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Hard Exudates:</span>
                          <span className="font-mono text-white font-bold">{selectedCase.hard_exudates}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Soft Exudates:</span>
                          <span className="font-mono text-white font-bold">{selectedCase.soft_exudates}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Submission Context */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-white/5 text-[11px] text-slate-400 space-y-1">
                    <div className="flex justify-between">
                      <span>Screening ID:</span>
                      <span className="font-mono text-slate-300">{selectedCase.record_id.slice(0, 14)}...</span>
                    </div>
                    {selectedCase.created_at && (
                      <div className="flex justify-between">
                        <span>Recorded At:</span>
                        <span className="text-slate-300">{new Date(selectedCase.created_at).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Doctor Review & Suggestion Form */}
              <form onSubmit={handleReviewSubmit} className="p-5 rounded-2xl bg-slate-900/80 border border-teal-500/30 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center space-x-2">
                    <Stethoscope className="w-5 h-5 text-teal-400" />
                    <h3 className="text-sm font-bold text-white">Doctor's Clinical Evaluation & Sign-Off</h3>
                  </div>
                  {submitSuccess && (
                    <span className="flex items-center space-x-1 text-emerald-400 text-xs font-semibold animate-fade-in">
                      <Check className="w-4 h-4" />
                      <span>Review Saved & Signed Off!</span>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Grade Override / Confirmation */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Confirm or Override Severity Grade
                    </label>
                    <select
                      value={confirmedGrade}
                      onChange={(e) => setConfirmedGrade(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                    >
                      <option value={0}>Grade 0 — Normal Eye (No DR)</option>
                      <option value={1}>Grade 1 — Mild Non-Proliferative DR</option>
                      <option value={2}>Grade 2 — Moderate Non-Proliferative DR</option>
                      <option value={3}>Grade 3 — Severe Non-Proliferative DR</option>
                      <option value={4}>Grade 4 — Proliferative DR (PDR)</option>
                    </select>
                  </div>

                  {/* Review Status */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Final Review Status
                    </label>
                    <select
                      value={actionStatus}
                      onChange={(e) => setActionStatus(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                    >
                      <option value="REVIEWED">REVIEWED (Standard Clinical Sign-Off)</option>
                      <option value="URGENT_FOLLOWUP">URGENT_FOLLOWUP (Immediate Specialist Referral)</option>
                    </select>
                  </div>
                </div>

                {/* Quick Templates */}
                <div className="space-y-1.5">
                  <span className="text-[11px] text-slate-400 font-medium">Quick Clinical Templates:</span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => applyTemplate('Normal retina confirmed. Continue routine annual screening. Maintain regular glycemic control.')}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] transition-colors"
                    >
                      + Normal Annual Followup
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTemplate('Mild non-proliferative changes observed. Schedule repeat dilated exam in 6 months. Strict control of HbA1c and blood pressure.')}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] transition-colors"
                    >
                      + Mild 6-Mo Review
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTemplate('Moderate NPDR with suspected early macular edema. Optical Coherence Tomography (OCT) recommended within 3 weeks.')}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] transition-colors"
                    >
                      + Moderate OCT Referral
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTemplate('Urgent vitreo-retinal evaluation required within 7 days. High risk of neovascularization or vitreous hemorrhage. Anti-VEGF / PRP workup advised.')}
                      className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-500/30 text-rose-300 text-[10px] transition-colors"
                    >
                      + Urgent Vitreo-Retinal Referral
                    </button>
                  </div>
                </div>

                {/* Suggestion Textarea */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Doctor's Suggestion & Clinical Prescription <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={doctorSuggestion}
                    onChange={(e) => setDoctorSuggestion(e.target.value)}
                    placeholder="Enter clinical advice, medication guidance, or specialist referral instructions..."
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500 leading-relaxed resize-none"
                    required
                  />
                </div>

                {/* Clinic / Doctor Contact Info */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Clinic / Doctor Helpline Contact (Displayed to patient)
                  </label>
                  <input
                    type="text"
                    value={clinicContact}
                    onChange={(e) => setClinicContact(e.target.value)}
                    placeholder="+91 9988776655 (District Eye Hospital Helpline)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>{submittingReview ? 'Submitting Sign-Off...' : 'Submit Review & Notify Patient'}</span>
                  </button>
                </div>
              </form>

            </div>
          )}
        </div>

      </div>

    </div>
  );
};
