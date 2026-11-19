import React, { useState, useEffect, useRef } from 'react';
import { 
  Stethoscope, AlertTriangle, Clock, CheckCircle2, Eye, Phone, Mail, 
  MessageSquare, ExternalLink, Search, Filter, RefreshCw, Send, Check, 
  FileText, ShieldCheck, Sparkles, User, AlertCircle, ArrowRight,
  ZoomIn, ZoomOut, RotateCcw, Camera, Video, Plus, Trash2, Copy,
  Upload, Play, Square, Laptop, Key, Compass
} from 'lucide-react';
import { 
  DoctorStats, DoctorQueueItem, DoctorReviewActionPayload, UserProfile,
  ClinicDevice
} from '../types';
import { 
  getDoctorStats, getDoctorQueue, submitDoctorPortalReview, getUserRole, getStoredUser,
  getDoctorDevices, registerDoctorDevice, deleteDoctorDevice, captureDeviceEyeImage
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

  // Zoom & Pan state for interactive retinal inspection
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Doctor Review Form state & Clinical Decision Mode
  const [decisionMode, setDecisionMode] = useState<'agree' | 'override'>('agree');
  const [confirmedGrade, setConfirmedGrade] = useState<number>(0);
  const [actionStatus, setActionStatus] = useState<string>('REVIEWED');
  const [doctorSuggestion, setDoctorSuggestion] = useState<string>('');
  const [clinicContact, setClinicContact] = useState<string>('+91 9988776655 (District Eye Hospital Helpline)');
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  // Top Level Doctor Portal Tab: 'queue' vs 'machine-capture'
  const [portalTab, setPortalTab] = useState<'queue' | 'machine-capture'>('queue');

  // Clinic Devices State
  const [devices, setDevices] = useState<ClinicDevice[]>([]);
  const [devicesLoading, setDevicesLoading] = useState<boolean>(false);
  const [isAddDeviceModalOpen, setIsAddDeviceModalOpen] = useState<boolean>(false);
  const [newDeviceName, setNewDeviceName] = useState<string>('');
  const [newDeviceModel, setNewDeviceModel] = useState<string>('Topcon TRC-NW400 Retinal Camera');
  const [newDeviceConn, setNewDeviceConn] = useState<string>('USB_LIVE_CAMERA');
  const [addingDevice, setAddingDevice] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Live Camera Capture Studio State
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedPreviewUrl, setCapturedPreviewUrl] = useState<string | null>(null);

  // Live Retinal Patient Demographics
  const [capturePatientName, setCapturePatientName] = useState<string>('Walk-in Patient');
  const [capturePatientAge, setCapturePatientAge] = useState<number>(55);
  const [capturePatientGender, setCapturePatientGender] = useState<string>('Male');
  const [captureEyeSide, setCaptureEyeSide] = useState<'Right Eye (OD)' | 'Left Eye (OS)'>('Right Eye (OD)');
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | ''>('');
  const [isAnalyzingCapture, setIsAnalyzingCapture] = useState<boolean>(false);
  const [captureError, setCaptureError] = useState<string | null>(null);

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
      const isOverridden = Boolean(
        selectedCase.ai_overridden || 
        (selectedCase.doctor_final_grade != null && selectedCase.doctor_final_grade !== selectedCase.icdr_grade)
      );
      setDecisionMode(isOverridden ? 'override' : 'agree');
      setConfirmedGrade(selectedCase.doctor_final_grade ?? selectedCase.icdr_grade);
      setActionStatus(selectedCase.icdr_grade >= 3 ? 'URGENT_FOLLOWUP' : 'REVIEWED');
      setDoctorSuggestion(selectedCase.doctor_suggestion || '');
      if (selectedCase.doctor_contact_info) {
        setClinicContact(selectedCase.doctor_contact_info);
      }
      setSubmitSuccess(false);
      // Reset zoom and pan for new case inspection
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setIsDragging(false);
    }
  }, [selectedCase?.record_id]);

  // Zoom & Pan inspection handlers
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.5, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.5, 1));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);
  const handleMouseLeave = () => setIsDragging(false);

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
      const finalGrade = decisionMode === 'override' ? confirmedGrade : selectedCase.icdr_grade;
      const payload: DoctorReviewActionPayload = {
        doctor_suggestion: doctorSuggestion.trim(),
        review_status: actionStatus,
        doctor_contact_info: clinicContact.trim() || undefined,
        confirmed_grade: finalGrade,
        doctor_final_grade: finalGrade,
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

  // Devices & Hardware Lifecycle
  const loadDevices = async () => {
    try {
      setDevicesLoading(true);
      const list = await getDoctorDevices();
      setDevices(list);
      if (list.length > 0 && selectedDeviceId === '') {
        setSelectedDeviceId(list[0].id);
      }
    } catch (err: any) {
      console.warn('Could not load clinic devices:', err);
    } finally {
      setDevicesLoading(false);
    }
  };

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeviceName.trim()) return;
    try {
      setAddingDevice(true);
      const created = await registerDoctorDevice({
        device_name: newDeviceName.trim(),
        device_model: newDeviceModel.trim() || 'USB Retinal Adapter',
        connection_type: newDeviceConn
      });
      setDevices(prev => [created, ...prev]);
      setSelectedDeviceId(created.id);
      setIsAddDeviceModalOpen(false);
      setNewDeviceName('');
    } catch (err: any) {
      alert(err.message || 'Failed to register machine.');
    } finally {
      setAddingDevice(false);
    }
  };

  const handleDeleteDevice = async (id: number) => {
    if (!confirm('Are you sure you want to remove this imaging machine?')) return;
    try {
      await deleteDoctorDevice(id);
      setDevices(prev => prev.filter(d => d.id !== id));
      if (selectedDeviceId === id) {
        setSelectedDeviceId('');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to remove device.');
    }
  };

  const handleCopyApiKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const enumerateCameras = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        setStreamError('Live camera API not supported on this browser.');
        return;
      }
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = allDevices.filter(d => d.kind === 'videoinput');
      setVideoDevices(videoInputs);
      if (videoInputs.length > 0 && !selectedCameraId) {
        setSelectedCameraId(videoInputs[0].deviceId);
      }
    } catch (err: any) {
      console.warn('Could not enumerate cameras:', err);
    }
  };

  const startCamera = async (devId?: string) => {
    try {
      setStreamError(null);
      stopCamera();
      const targetId = devId || selectedCameraId;
      const constraints: MediaStreamConstraints = {
        video: targetId ? { deviceId: { exact: targetId }, width: { ideal: 1280 }, height: { ideal: 720 } } : { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsStreaming(true);
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setStreamError('Unable to access camera feed. Please check hardware connection or browser permissions.');
      setIsStreaming(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  };

  const captureFrame = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) {
        setCapturedBlob(blob);
        setCapturedPreviewUrl(URL.createObjectURL(blob));
      }
    }, 'image/jpeg', 0.95);
  };

  const retakeFrame = () => {
    setCapturedBlob(null);
    if (capturedPreviewUrl) {
      URL.revokeObjectURL(capturedPreviewUrl);
      setCapturedPreviewUrl(null);
    }
    setCaptureError(null);
  };

  const handleFallbackFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCapturedBlob(file);
      setCapturedPreviewUrl(URL.createObjectURL(file));
      setCaptureError(null);
    }
  };

  const handleAnalyzeCapture = async () => {
    if (!capturedBlob) return;
    try {
      setIsAnalyzingCapture(true);
      setCaptureError(null);

      const formData = new FormData();
      formData.append('file', capturedBlob, 'captured_retina.jpg');
      formData.append('patient_name', capturePatientName.trim() || 'Walk-in Patient');
      formData.append('patient_age', String(capturePatientAge || 50));
      formData.append('patient_gender', capturePatientGender);
      formData.append('eye_side', captureEyeSide);
      if (selectedDeviceId !== '') {
        formData.append('device_id', String(selectedDeviceId));
      }

      await captureDeviceEyeImage(formData);
      stopCamera();
      retakeFrame();
      await loadStats();
      await loadQueue();
      setPortalTab('queue');
      setStatusFilter('PENDING_REVIEW');
    } catch (err: any) {
      setCaptureError(err.message || 'AI Retinal Analysis failed. Please try again.');
    } finally {
      setIsAnalyzingCapture(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

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

      {/* Top Doctor Portal Section Switcher */}
      <div className="flex items-center space-x-3 p-1.5 bg-slate-900/90 rounded-2xl border border-white/10 w-fit">
        <button
          type="button"
          onClick={() => {
            stopCamera();
            setPortalTab('queue');
          }}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            portalTab === 'queue'
              ? 'bg-teal-500 text-slate-950 shadow-[0_0_15px_rgba(20,184,166,0.4)]'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Review Queue & Triage</span>
          {stats.pending_reviews > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-slate-950/20 text-slate-950">
              {stats.pending_reviews}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setPortalTab('machine-capture');
            loadDevices();
            enumerateCameras();
          }}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            portalTab === 'machine-capture'
              ? 'bg-sky-500 text-slate-950 shadow-[0_0_15px_rgba(56,189,248,0.4)]'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>Machine & Live Capture</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-400/30">
            Direct Fundus Cam
          </span>
        </button>
      </div>

      {portalTab === 'queue' && (
        <div className="space-y-6">

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

              {/* Retinal Fundus & Heatmap Visualizer with Interactive Zoom & Pan */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                    <div className="flex items-center space-x-2">
                      <span>Clinical Inspection</span>
                      <span className="font-mono text-[10px] text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/20">
                        {Math.round(zoom * 100)}%
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      {/* Zoom controls */}
                      <div className="flex items-center space-x-0.5 bg-slate-900 p-0.5 rounded-lg border border-white/10 text-slate-300">
                        <button
                          type="button"
                          onClick={handleZoomIn}
                          disabled={zoom >= 3}
                          className="p-1 rounded hover:bg-slate-800 hover:text-white disabled:opacity-40 transition"
                          title="Zoom In (up to 3x)"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={handleZoomOut}
                          disabled={zoom <= 1}
                          className="p-1 rounded hover:bg-slate-800 hover:text-white disabled:opacity-40 transition"
                          title="Zoom Out"
                        >
                          <ZoomOut className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={handleResetZoom}
                          disabled={zoom === 1 && pan.x === 0 && pan.y === 0}
                          className="p-1 rounded hover:bg-slate-800 hover:text-white disabled:opacity-40 transition"
                          title="Reset Zoom & Pan (1:1)"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Layer Switcher */}
                      <div className="flex items-center space-x-0.5 bg-slate-900 p-0.5 rounded-lg border border-white/10">
                        <button
                          type="button"
                          onClick={() => setViewLayer('normal')}
                          className={`px-2 py-1 rounded text-[11px] transition ${
                            viewLayer === 'normal' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Normal
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewLayer('heatmap')}
                          className={`px-2 py-1 rounded text-[11px] transition ${
                            viewLayer === 'heatmap' ? 'bg-rose-500 text-white font-bold' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Grad-CAM
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Interactive Viewport */}
                  <div 
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseLeave}
                    className={`relative aspect-square rounded-2xl overflow-hidden bg-black border border-white/10 flex items-center justify-center select-none ${
                      zoom > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
                    }`}
                  >
                    {viewLayer === 'normal' && selectedCase.raw_image_url ? (
                      <img
                        src={selectedCase.raw_image_url}
                        alt="Retinal Fundus"
                        draggable={false}
                        style={{
                          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                          transition: isDragging ? 'none' : 'transform 0.15s ease-out'
                        }}
                        className="w-full h-full object-contain pointer-events-none"
                      />
                    ) : selectedCase.heatmap_image_url ? (
                      <img
                        src={selectedCase.heatmap_image_url}
                        alt="Grad-CAM Saliency"
                        draggable={false}
                        style={{
                          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                          transition: isDragging ? 'none' : 'transform 0.15s ease-out'
                        }}
                        className="w-full h-full object-contain pointer-events-none"
                      />
                    ) : (
                      <div className="text-slate-500 text-xs">No image asset available</div>
                    )}

                    {zoom > 1 && (
                      <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/75 backdrop-blur-md text-[10px] text-slate-300 font-mono border border-white/10 pointer-events-none">
                        Drag to pan across retina
                      </div>
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

              {/* VERIFIED DIGITAL SIGN-OFF STAMP (Displayed if already reviewed or just submitted) */}
              {(selectedCase.reviewed_by_doctor_name || selectedCase.review_status === 'REVIEWED' || selectedCase.review_status === 'URGENT_FOLLOWUP' || submitSuccess) && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/50 via-teal-950/40 to-slate-900 border-2 border-emerald-500/50 text-white shadow-xl space-y-3 animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-500/20 pb-2.5">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center space-x-1.5">
                          <span>✓ CLINICALLY VERIFIED & SIGNED</span>
                        </div>
                        <div className="text-xs text-slate-300 font-semibold">
                          Certified Ophthalmologist Tele-Review
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {(selectedCase.ai_overridden || (decisionMode === 'override' && confirmedGrade !== selectedCase.icdr_grade)) ? (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-[0_0_10px_rgba(251,191,36,0.2)]">
                          ⚡ Clinician Overridden: Grade {selectedCase.doctor_final_grade ?? confirmedGrade}
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shadow-[0_0_10px_rgba(52,211,153,0.2)]">
                          ✓ AI Agreed: Grade {selectedCase.doctor_final_grade ?? selectedCase.icdr_grade}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Reviewing Clinician:</span>
                      <span className="font-bold text-white">
                        {selectedCase.reviewed_by_doctor_name || currentUser?.full_name || 'Dr. Amit Roy, MS'}
                      </span>
                      {currentUser?.license_id && (
                        <span className="text-[10px] text-slate-400 block font-mono">
                          License: {currentUser.license_id}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Final Confirmed Grade:</span>
                      <span className="font-bold text-white">
                        Grade {selectedCase.doctor_final_grade ?? confirmedGrade}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Signed At:</span>
                      <span className="text-slate-300 font-mono text-[11px]">
                        {selectedCase.reviewed_at ? new Date(selectedCase.reviewed_at).toLocaleString() : new Date().toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Doctor Review & Suggestion Form */}
              <form onSubmit={handleReviewSubmit} className="p-5 rounded-2xl bg-slate-900/80 border border-teal-500/30 space-y-5">
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

                {/* Clinical Grading Decision (Agree with AI vs Override Grade) */}
                <div className="p-4 rounded-xl bg-slate-950 border border-white/10 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-slate-300 block">
                        Clinical Grading Decision
                      </span>
                      <span className="text-[11px] text-slate-400">
                        AI Prediction: <span className="text-sky-300 font-bold font-mono">Grade {selectedCase.icdr_grade} — {selectedCase.stage_label}</span>
                      </span>
                    </div>

                    {decisionMode === 'override' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 self-start sm:self-auto">
                        ⚡ Clinician Overridden: Grade {confirmedGrade}
                      </span>
                    )}
                  </div>

                  {/* Toggle Selector */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setDecisionMode('agree');
                        setConfirmedGrade(selectedCase.icdr_grade);
                      }}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                        decisionMode === 'agree'
                          ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                          : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Agree with AI (Grade {selectedCase.icdr_grade})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDecisionMode('override');
                      }}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                        decisionMode === 'override'
                          ? 'bg-amber-500/20 border-amber-400 text-white shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                          : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Override Grade</span>
                    </button>
                  </div>

                  {/* If Override, show Dropdown for Grade 0 to Grade 4 */}
                  {decisionMode === 'override' && (
                    <div className="pt-2 animate-fade-in">
                      <label className="block text-[11px] font-medium text-amber-300 mb-1">
                        Select Overridden Clinical Grade:
                      </label>
                      <select
                        value={confirmedGrade}
                        onChange={(e) => setConfirmedGrade(parseInt(e.target.value, 10))}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-amber-500/40 text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-400 font-semibold"
                      >
                        <option value={0}>Grade 0 — Normal Eye (No DR)</option>
                        <option value={1}>Grade 1 — Mild Non-Proliferative DR</option>
                        <option value={2}>Grade 2 — Moderate Non-Proliferative DR</option>
                        <option value={3}>Grade 3 — Severe Non-Proliferative DR</option>
                        <option value={4}>Grade 4 — Proliferative DR (PDR)</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Review Status Selector */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Final Referral Status
                  </label>
                  <select
                    value={actionStatus}
                    onChange={(e) => setActionStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="REVIEWED">REVIEWED (Standard Clinical Sign-Off)</option>
                    <option value="URGENT_FOLLOWUP">URGENT_FOLLOWUP (Immediate Specialist Referral)</option>
                    <option value="PENDING_REVIEW">PENDING_REVIEW (Awaiting Retake or Further Data)</option>
                  </select>
                </div>

                {/* 1-Click Quick Action Templates */}
                <div className="space-y-1.5">
                  <span className="text-[11px] text-slate-400 font-medium">1-Click Quick Action Templates:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    
                    {/* Template 1: Urgent Referral */}
                    <button
                      type="button"
                      onClick={() => {
                        setActionStatus('URGENT_FOLLOWUP');
                        setDoctorSuggestion("High-risk retinal changes detected. Please visit an ophthalmologist within 72 hours for dilation and further treatment.");
                      }}
                      className="p-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-500/30 text-rose-200 text-left transition-all active:scale-95 space-y-1"
                    >
                      <div className="text-xs font-bold flex items-center space-x-1 text-rose-300">
                        <span>🚨 Urgent Referral (&lt;72h)</span>
                      </div>
                      <p className="text-[10px] text-rose-300/80 line-clamp-2">
                        High-risk retinal changes detected. Visit ophthalmologist within 72h.
                      </p>
                    </button>

                    {/* Template 2: Routine Follow-up */}
                    <button
                      type="button"
                      onClick={() => {
                        setActionStatus('REVIEWED');
                        setDoctorSuggestion("No immediate threat detected. Maintain good blood sugar control and repeat retinal screening in 6 months.");
                      }}
                      className="p-2.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-200 text-left transition-all active:scale-95 space-y-1"
                    >
                      <div className="text-xs font-bold flex items-center space-x-1 text-emerald-300">
                        <span>✅ Routine Follow-up (6 Months)</span>
                      </div>
                      <p className="text-[10px] text-emerald-300/80 line-clamp-2">
                        No immediate threat. Maintain sugar control & repeat in 6 months.
                      </p>
                    </button>

                    {/* Template 3: Retake Scan Needed */}
                    <button
                      type="button"
                      onClick={() => {
                        setActionStatus('PENDING_REVIEW');
                        setDoctorSuggestion("Image clarity is insufficient for final diagnosis. Please retake the fundus photo in better lighting.");
                      }}
                      className="p-2.5 rounded-xl bg-amber-950/60 hover:bg-amber-900 border border-amber-500/30 text-amber-200 text-left transition-all active:scale-95 space-y-1"
                    >
                      <div className="text-xs font-bold flex items-center space-x-1 text-amber-300">
                        <span>📷 Retake Scan Needed</span>
                      </div>
                      <p className="text-[10px] text-amber-300/80 line-clamp-2">
                        Image clarity insufficient. Retake fundus photo in better lighting.
                      </p>
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
                    className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50 active:scale-95"
                  >
                    <Send className="w-4 h-4" />
                    <span>{submittingReview ? 'Submitting Sign-Off...' : 'Submit Review & Digital Sign-Off'}</span>
                  </button>
                </div>
              </form>

            </div>
          )}
        </div>

      </div>
      </div>
      )}

      {/* =====================================================================
          VIEW 2: DIRECT MACHINE & LIVE CAMERA CAPTURE STUDIO
          ===================================================================== */}
      {portalTab === 'machine-capture' && (
        <div className="space-y-6 animate-fade-in">
          {/* Top Subheader */}
          <div className="p-5 rounded-2xl bg-[#0F172A] border border-sky-500/20 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-400/30 shadow-[0_0_15px_rgba(56,189,248,0.25)]">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white font-heading">
                  Direct Machine & Live Retinal Capture Studio
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Connect USB Fundus Cameras, capture live retinal frames, or receive network camera pushes for instant AI grading.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2.5">
              <button
                type="button"
                onClick={() => setIsAddDeviceModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-sky-500/20 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Register Machine</span>
              </button>
            </div>
          </div>

          {/* 2-Column Studio Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT COLUMN (4 Cols): Connected Machines Manager */}
            <div className="lg:col-span-4 bg-[#0F172A] border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center space-x-2">
                  <Laptop className="w-4 h-4 text-sky-400" />
                  <h3 className="text-sm font-bold text-white font-heading">
                    Registered Machines ({devices.length})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={loadDevices}
                  className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
                  title="Refresh device list"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${devicesLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Device List */}
              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {devicesLoading && devices.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400">Loading registered machines...</div>
                ) : devices.length === 0 ? (
                  <div className="text-center py-8 space-y-3 p-4 rounded-xl bg-slate-900/60 border border-dashed border-white/10">
                    <Camera className="w-8 h-8 text-slate-500 mx-auto" />
                    <div className="text-xs text-slate-300 font-medium">No Machines Registered</div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Register your clinic fundus camera or USB adapter to enable direct hardware capture.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsAddDeviceModalOpen(true)}
                      className="px-3.5 py-1.5 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-semibold hover:bg-sky-500/30 transition-colors"
                    >
                      + Add Machine
                    </button>
                  </div>
                ) : (
                  devices.map((device) => {
                    const isSelected = selectedDeviceId === device.id;
                    return (
                      <div
                        key={device.id}
                        className={`p-3.5 rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-sky-950/40 border-sky-400/60 shadow-[0_0_15px_rgba(56,189,248,0.15)]'
                            : 'bg-slate-900/60 border-white/5 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="text-xs font-bold text-white">{device.device_name}</h4>
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                {device.status}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">{device.device_model}</p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteDevice(device.id)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                            title="Delete Device"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px]">
                          <span className="text-slate-400 font-mono">
                            {device.connection_type === 'USB_LIVE_CAMERA' ? '🔌 USB Direct Feed' : '🌐 Network API Push'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedDeviceId(device.id)}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                              isSelected ? 'bg-sky-500 text-slate-950 font-bold' : 'text-sky-400 hover:text-sky-300'
                            }`}
                          >
                            {isSelected ? 'Active Target' : 'Select'}
                          </button>
                        </div>

                        {/* Copyable API key */}
                        <div className="mt-2 flex items-center justify-between bg-slate-950 px-2 py-1 rounded border border-white/5 text-[10px] font-mono text-slate-400">
                          <span className="truncate max-w-[170px]">{device.device_api_key}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyApiKey(device.device_api_key)}
                            className="text-sky-400 hover:text-sky-300 ml-1 shrink-0"
                            title="Copy API Key"
                          >
                            {copiedKey === device.device_api_key ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Integration Info Box */}
              <div className="p-3.5 rounded-xl bg-sky-950/20 border border-sky-500/20 text-[11px] text-slate-300 space-y-1.5">
                <div className="font-semibold text-sky-400 flex items-center space-x-1.5">
                  <Key className="w-3.5 h-3.5" />
                  <span>Machine Push Integration</span>
                </div>
                <p className="text-slate-400 leading-relaxed text-[10px]">
                  To push fundus captures directly from an automated imaging device, include the <code className="text-sky-300">X-Device-Key</code> header with your machine's secret key to <code className="text-sky-300">POST /api/v1/doctor/device-capture</code>.
                </p>
              </div>
            </div>

            {/* RIGHT COLUMN (8 Cols): Live Retinal Capture Studio */}
            <div className="lg:col-span-8 bg-[#0F172A] border border-white/10 rounded-2xl p-5 shadow-xl space-y-5">
              
              {/* Camera Selector Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-900 border border-white/5">
                <div className="flex items-center space-x-2 text-xs">
                  <Video className="w-4 h-4 text-sky-400 shrink-0" />
                  <span className="text-slate-300 font-medium">Video Source:</span>
                  <select
                    value={selectedCameraId}
                    onChange={(e) => {
                      setSelectedCameraId(e.target.value);
                      if (isStreaming) {
                        startCamera(e.target.value);
                      }
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-sky-500 max-w-[220px]"
                  >
                    {videoDevices.length === 0 ? (
                      <option value="">Default Video Camera</option>
                    ) : (
                      videoDevices.map((d, idx) => (
                        <option key={d.deviceId || idx} value={d.deviceId}>
                          {d.label || `Camera ${idx + 1}`}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  {!isStreaming ? (
                    <button
                      type="button"
                      onClick={() => startCamera()}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 transition-colors shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Start Stream</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-3.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-semibold text-xs flex items-center space-x-1.5 transition-colors"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>Stop Stream</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Viewfinder Window */}
              <div className="relative aspect-video max-h-[440px] w-full rounded-2xl overflow-hidden bg-slate-950 border-2 border-dashed border-sky-500/30 flex items-center justify-center shadow-2xl">
                
                {/* Case 1: Frozen Captured Frame */}
                {capturedPreviewUrl ? (
                  <div className="relative w-full h-full flex items-center justify-center bg-black">
                    <img
                      src={capturedPreviewUrl}
                      alt="Captured retina"
                      className="max-h-full max-w-full object-contain"
                    />
                    <div className="absolute top-4 left-4 bg-emerald-500/90 text-slate-950 font-black text-xs px-3 py-1 rounded-full shadow-lg flex items-center space-x-1.5">
                      <Check className="w-3.5 h-3.5" />
                      <span>Frame Captured</span>
                    </div>
                  </div>
                ) : isStreaming ? (
                  /* Case 2: Live Video Stream with Retinal HUD Alignment Guide */
                  <div className="relative w-full h-full flex items-center justify-center">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />

                    {/* Retinal Alignment Overlay Guide */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-56 h-56 sm:w-72 sm:h-72 rounded-full border-2 border-dashed border-sky-400/60 shadow-[0_0_30px_rgba(56,189,248,0.3)] animate-pulse flex items-center justify-center">
                        <div className="w-20 h-20 rounded-full border border-sky-300/40" />
                      </div>
                      {/* Crosshairs */}
                      <div className="absolute w-full h-[1px] bg-sky-400/20" />
                      <div className="absolute h-full w-[1px] bg-sky-400/20" />
                      
                      <div className="absolute bottom-6 bg-slate-900/80 backdrop-blur-md px-3.5 py-1 rounded-full text-[11px] font-mono text-sky-300 border border-sky-500/30">
                        Align pupil & retina within focal circle
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Case 3: Offline / No Active Stream */
                  <div className="p-8 text-center space-y-4 max-w-md">
                    <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 mx-auto flex items-center justify-center">
                      <Eye className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Live Retinal Camera Ready</h4>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Click "Start Stream" above to connect your USB fundus adapter or webcam, or select a test retinal image from disk.
                      </p>
                    </div>

                    {streamError && (
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                        {streamError}
                      </div>
                    )}

                    <div>
                      <label className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs text-slate-300 hover:text-white cursor-pointer transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Load Test Fundus Image File</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFallbackFileSelect}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {/* Analyzing Overlay */}
                {isAnalyzingCapture && (
                  <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center space-y-3 z-30">
                    <div className="w-10 h-10 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                    <div className="text-sm font-bold text-white font-heading">
                      Running AI Retinal Screening...
                    </div>
                    <p className="text-xs text-slate-400">
                      Image Quality Assessment (IQA) & 5-Stage ICDR Neural Classification
                    </p>
                  </div>
                )}
              </div>

              {/* Error Banner */}
              {captureError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{captureError}</span>
                </div>
              )}

              {/* Patient Intake Fields for this Capture */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-4">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                  Patient & Scan Identification
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-slate-400 mb-1">Patient Name</label>
                    <input
                      type="text"
                      value={capturePatientName}
                      onChange={(e) => setCapturePatientName(e.target.value)}
                      placeholder="Patient Full Name"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Age</label>
                    <input
                      type="number"
                      value={capturePatientAge}
                      onChange={(e) => setCapturePatientAge(parseInt(e.target.value, 10) || 50)}
                      min={1}
                      max={120}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Eye Evaluated</label>
                    <select
                      value={captureEyeSide}
                      onChange={(e) => setCaptureEyeSide(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                    >
                      <option value="Right Eye (OD)">Right Eye (OD)</option>
                      <option value="Left Eye (OS)">Left Eye (OS)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Capture & Run Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="flex items-center space-x-2">
                  {isStreaming && !capturedPreviewUrl && (
                    <button
                      type="button"
                      onClick={captureFrame}
                      className="px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs sm:text-sm flex items-center space-x-2 shadow-lg shadow-sky-500/25 transition-all active:scale-95"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Capture Eye Frame</span>
                    </button>
                  )}

                  {capturedPreviewUrl && (
                    <button
                      type="button"
                      onClick={retakeFrame}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center space-x-1.5 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Retake Frame</span>
                    </button>
                  )}
                </div>

                {capturedPreviewUrl && (
                  <button
                    type="button"
                    onClick={handleAnalyzeCapture}
                    disabled={isAnalyzingCapture}
                    className="w-full sm:w-auto px-7 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-lg shadow-amber-400/25 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4 text-slate-950" />
                    <span>Run AI Screening & Analyze →</span>
                  </button>
                )}
              </div>

            </div>

          </div>

        </div>
      )}

      {/* =====================================================================
          ADD NEW MACHINE MODAL
          ===================================================================== */}
      {isAddDeviceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0F172A] border border-sky-500/30 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
                  <Camera className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white font-heading">
                  Register Retinal Imaging Device
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddDeviceModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddDevice} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Device Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  placeholder="e.g. Clinic Room 1 Fundus Cam"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Machine Model / Hardware Type
                </label>
                <input
                  type="text"
                  value={newDeviceModel}
                  onChange={(e) => setNewDeviceModel(e.target.value)}
                  placeholder="e.g. Topcon TRC-NW400 / USB Retinal Adapter"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Connection Mode
                </label>
                <select
                  value={newDeviceConn}
                  onChange={(e) => setNewDeviceConn(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option value="USB_LIVE_CAMERA">USB Live Viewfinder Feed</option>
                  <option value="NETWORK_API_PUSH">Network Machine API Push (X-Device-Key)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddDeviceModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingDevice || !newDeviceName.trim()}
                  className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-all disabled:opacity-50 shadow-md shadow-sky-500/20"
                >
                  {addingDevice ? 'Registering...' : 'Register Machine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};


