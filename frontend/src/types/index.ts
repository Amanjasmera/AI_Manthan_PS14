export type EyeSide = 'LEFT' | 'RIGHT';

export type ReferralUrgency = 'ROUTINE' | 'NON_URGENT' | 'URGENT' | 'CRITICAL' | 'RETAKE';

export interface Patient {
  id: string | number;
  full_name: string;
  age: number;
  gender: string;
  diabetes_history: string;
  created_at?: string;
  symptoms?: string;
}

export interface IqaResult {
  passed: boolean;
  error_codes: string[];
  blur_score: number;
  illumination_score: number;
  contrast_score: number;
  fov_score?: number;
  feedback: string;
  recapture_instructions: string;
}

export interface Prediction {
  predicted_grade: number;
  grade_name: string;
  confidence: number;
  class_probabilities: Record<string, number>;
  entropy: number;
  uncertainty_score?: number;
  requires_manual_doctor_review?: boolean;
  epistemic_uncertainty?: number;
  aleatoric_uncertainty?: number;
  safety_rationale?: string[];
  confidence_interval?: Record<string, any> | null;
  inference_time_ms: number;
  temperature: number;
  gradcam_url?: string;
  model_status: string;
  model_provenance: string;
  is_verified_checkpoint: boolean;
}

export interface LesionSummary {
  microaneurysm_count: number;
  hemorrhage_count: number;
  hard_exudate_count: number;
  soft_exudate_count: number;
  mask_url?: string;
  classification_note: string;
  method: string;
  is_verified_model: boolean;
}

export interface DoctorReview {
  id: string;
  doctor_name: string;
  doctor_license?: string;
  confirmed_grade: number;
  was_overridden: boolean;
  referral_recommendation?: string;
  clinical_notes?: string;
  reviewed_at: string;
}

export interface ScreeningDetail {
  id: string;
  patient: Patient;
  eye_side: EyeSide;
  raw_image_url: string;
  preprocessed_image_url?: string;
  heatmap_image_url?: string;
  iqa: IqaResult;
  iqa_passed?: boolean;
  prediction?: Prediction;
  lesions?: LesionSummary;
  doctor_review?: DoctorReview;
  referral_urgency: ReferralUrgency;
  status: string;
  uncertainty_score?: number;
  requires_manual_doctor_review?: boolean;
  created_at: string;
  report_pdf_url?: string;
  billing_status?: string;
  systemic_risk?: string;
  next_screening_interval?: string;
  patient_phone?: string;
  patient_email?: string;
  review_requested?: boolean;
  review_status?: string;
  doctor_suggestion?: string;
  doctor_contact_info?: string;
  reviewed_at?: string;
  reviewed_by_doctor_name?: string;
  doctor_final_grade?: number | null;
  ai_overridden?: boolean;
  bilingual_explanation?: {
    en: string;
    hi: string;
  };
}

export interface ScreeningListItem {
  id: string;
  patient_name: string;
  age: number;
  gender: string;
  eye_side: EyeSide;
  iqa_passed: boolean;
  predicted_grade: number;
  grade_name: string;
  confidence: number;
  uncertainty_score?: number;
  requires_manual_doctor_review?: boolean;
  referral_urgency: ReferralUrgency;
  status: string;
  confirmed_grade?: number;
  created_at: string;
  patient_phone?: string;
  patient_email?: string;
  review_requested?: boolean;
  review_status?: string;
  doctor_suggestion?: string;
  doctor_contact_info?: string;
  reviewed_at?: string;
  reviewed_by_doctor_name?: string;
  doctor_final_grade?: number | null;
  ai_overridden?: boolean;
}

export interface SystemHealth {
  status: string;
  service: string;
  version: string;
  pytorch: {
    installed: boolean;
    version: string;
    device: string;
    backbone: string;
    weights_found: boolean;
    model_status: string;
    calibrated_temperature: number;
  };
  bayesian_deep_learning?: {
    mc_dropout_enabled: boolean;
    standards_reference: string;
    safe_entropy_threshold: number;
    epistemic_uncertainty_decomposition: boolean;
    aleatoric_uncertainty_decomposition: boolean;
    clinical_safety_gate: string;
  };
  datasets_supported: string[];
  compliance: string;
}

export type UserRole = 'User' | 'Doctor' | 'user' | 'doctor';

export interface UserProfile {
  id: string | number;
  username?: string;
  email: string;
  full_name: string;
  role: string;
  license_id?: string;
  license_number?: string;
}

export interface UserProfileUpdateRequest {
  full_name?: string;
  email?: string;
  password?: string;
  current_password?: string;
  new_password?: string;
  role?: string;
  license_id?: string;
  license_number?: string;
}

export interface AuthSession {
  token: string;
  access_token?: string;
  token_type?: string;
  role?: string;
  full_name?: string;
  user: UserProfile;
}

// Doctor Portal & Clinical Review Workflow Interfaces
export interface ReviewRequestPayload {
  patient_phone?: string;
  patient_email?: string;
  notes?: string;
}

export interface DoctorReviewActionPayload {
  doctor_suggestion: string;
  review_status: 'REVIEWED' | 'URGENT_FOLLOWUP' | string;
  doctor_contact_info?: string;
  confirmed_grade?: number;
  doctor_final_grade?: number;
}

export interface DoctorStats {
  pending_reviews: number;
  high_risk_cases: number;
  completed_reviews: number;
  total_screenings: number;
}

export interface DoctorQueuePatient {
  id?: number | null;
  name: string;
  age?: number | null;
  gender?: string | null;
  phone?: string | null;
  email?: string | null;
  diabetes_history?: string | null;
  symptoms?: string | null;
}

export interface DoctorQueueItem {
  id: string;
  record_id: string;
  patient: DoctorQueuePatient;
  patient_name: string;
  age?: number | null;
  gender?: string | null;
  eye_side: string;
  icdr_grade: number;
  stage_label: string;
  model_confidence: number;
  entropy: number;
  epistemic_uncertainty: number;
  aleatoric_uncertainty: number;
  hard_exudates: number;
  soft_exudates: number;
  raw_image_url?: string;
  heatmap_image_url?: string;
  review_requested: boolean;
  review_status: string; // 'NOT_REQUESTED' | 'PENDING_REVIEW' | 'REVIEWED' | 'URGENT_FOLLOWUP'
  doctor_suggestion?: string | null;
  doctor_contact_info?: string | null;
  reviewed_at?: string | null;
  reviewed_by_doctor_name?: string | null;
  doctor_final_grade?: number | null;
  ai_overridden?: boolean;
  created_at?: string | null;
  referral_urgency?: string;
  status?: string;
}
