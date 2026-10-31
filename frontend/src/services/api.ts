import { ScreeningDetail, ScreeningListItem, DoctorReview, SystemHealth, IqaResult } from '../types';

const API_BASE = '/api/v1';

export async function uploadAndAnalyzeScreening(formData: FormData): Promise<ScreeningDetail> {
  const res = await fetch(`${API_BASE}/screenings/analyze`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Server error: ${res.status}`);
  }
  return res.json();
}

export async function precheckIqa(file: File): Promise<IqaResult> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/screenings/iqa-check`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    throw new Error('IQA check failed');
  }
  return res.json();
}

export async function getScreeningDetail(id: string): Promise<ScreeningDetail> {
  const res = await fetch(`${API_BASE}/screenings/${id}`);
  if (!res.ok) {
    throw new Error(`Screening not found: ${id}`);
  }
  return res.json();
}

export async function listScreenings(page = 1, limit = 20, urgency?: string): Promise<{ total: number; items: ScreeningListItem[] }> {
  const url = new URL(`${window.location.origin}${API_BASE}/screenings`);
  url.searchParams.append('page', page.toString());
  url.searchParams.append('limit', limit.toString());
  if (urgency) {
    url.searchParams.append('urgency', urgency);
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error('Failed to fetch screenings');
  }
  return res.json();
}

export async function submitDoctorReview(
  screeningId: string,
  review: {
    doctor_name: string;
    doctor_license?: string;
    confirmed_grade: number;
    referral_recommendation?: string;
    clinical_notes?: string;
    dataset_tag?: string;
  }
): Promise<DoctorReview> {
  const res = await fetch(`${API_BASE}/screenings/${screeningId}/doctor-review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(review),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to submit review');
  }
  return res.json();
}

export async function getActiveLearningStats(tag?: string): Promise<any> {
  const url = tag ? `${API_BASE}/active-learning/stats?tag=${encodeURIComponent(tag)}` : `${API_BASE}/active-learning/stats`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch active learning stats');
  }
  return res.json();
}

export async function exportActiveLearningManifest(tag?: string): Promise<any> {
  const url = tag ? `${API_BASE}/active-learning/export?tag=${encodeURIComponent(tag)}` : `${API_BASE}/active-learning/export`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to export active learning manifest');
  }
  return res.json();
}

export async function getSystemHealth(): Promise<SystemHealth> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) {
    throw new Error('Health check failed');
  }
  return res.json();
}
