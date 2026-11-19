import {
  ScreeningDetail,
  ScreeningListItem,
  DoctorReview,
  SystemHealth,
  IqaResult,
  UserProfile,
  UserRole,
  UserProfileUpdateRequest,
  AuthSession
} from '../types';

export const BACKEND_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
export const API_BASE = BACKEND_URL ? `${BACKEND_URL}/api/v1` : '/api/v1';

// =====================================================================
// AUTHENTICATION STORAGE & JWT HELPERS
// =====================================================================

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem('netra_auth_token') || localStorage.getItem('token') || null;
  } catch {
    return null;
  }
}

export function getUserRole(): string | null {
  try {
    return localStorage.getItem('netra_user_role') || null;
  } catch {
    return null;
  }
}

export function getStoredUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem('netra_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setAuthSession(token: string, user: UserProfile, role: string) {
  try {
    localStorage.setItem('netra_auth_token', token);
    localStorage.setItem('token', token);
    localStorage.setItem('netra_user_role', role.toLowerCase());
    localStorage.setItem('netra_user', JSON.stringify(user));
  } catch (e) {
    console.error('Failed to save auth session:', e);
  }
}

export function clearAuthSession() {
  try {
    localStorage.removeItem('netra_auth_token');
    localStorage.removeItem('token');
    localStorage.removeItem('netra_user_role');
    localStorage.removeItem('netra_user');
  } catch (e) {
    console.error('Failed to clear auth session:', e);
  }
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// =====================================================================
// SCREENING INTAKE & INFERENCE APIS
// =====================================================================

export async function uploadAndAnalyzeScreening(formData: FormData): Promise<ScreeningDetail> {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE}/screenings/analyze`, {
    method: 'POST',
    headers,
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
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE}/screenings/${id}`, { headers });
  if (!res.ok) {
    throw new Error(`Screening not found: ${id}`);
  }
  return res.json();
}

export async function listScreenings(page = 1, limit = 20, urgency?: string): Promise<{ total: number; items: ScreeningListItem[] }> {
  const origin = BACKEND_URL || window.location.origin;
  const url = new URL(`${origin}/api/v1/screenings`);
  url.searchParams.append('page', page.toString());
  url.searchParams.append('limit', limit.toString());
  if (urgency) {
    url.searchParams.append('urgency', urgency);
  }
  const headers = getAuthHeaders();
  const res = await fetch(url.toString(), { headers });
  if (!res.ok) {
    throw new Error('Failed to fetch screenings');
  }
  return res.json();
}

export async function signOffScreening(
  recordId: string,
  clinicianNotes: string
): Promise<{ status: string; record_id: string; approval_status: string; clinician_notes: string; updated_at: string; screening: ScreeningDetail }> {
  const res = await fetch(`${API_BASE}/screenings/${recordId}/sign-off`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({ clinician_notes: clinicianNotes }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Clinician sign-off failed.');
  }
  return res.json();
}

export async function deleteScreening(recordId: string): Promise<{ status: string; record_id: string; message: string }> {
  const res = await fetch(`${API_BASE}/screenings/${recordId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to delete screening record.');
  }
  return res.json();
}

export async function listPostgresScreenings(
  page = 1,
  limit = 20,
  name?: string,
  icdrGrade?: number,
  urgency?: string
): Promise<{ total: number; page: number; limit: number; items: ScreeningListItem[] }> {
  const origin = BACKEND_URL || window.location.origin;
  const url = new URL(`${origin}/api/screenings`);
  url.searchParams.append('page', page.toString());
  url.searchParams.append('limit', limit.toString());
  if (name) {
    url.searchParams.append('name', name);
  }
  if (icdrGrade !== undefined && icdrGrade !== null) {
    url.searchParams.append('icdr_grade', icdrGrade.toString());
  }
  if (urgency) {
    url.searchParams.append('urgency', urgency);
  }
  const res = await fetch(url.toString(), { headers: getAuthHeaders() });
  if (!res.ok) {
    throw new Error('Failed to fetch screenings from database');
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
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
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
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) {
    throw new Error('Failed to fetch active learning stats');
  }
  return res.json();
}

export async function exportActiveLearningManifest(tag?: string): Promise<any> {
  const url = tag ? `${API_BASE}/active-learning/export?tag=${encodeURIComponent(tag)}` : `${API_BASE}/active-learning/export`;
  const res = await fetch(url, { headers: getAuthHeaders() });
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

// =====================================================================
// AUTHENTICATION & RBAC APIS
// =====================================================================

export async function loginUser(
  identifier: string,
  password: string,
  role?: string
): Promise<AuthSession> {
  const payload: any = { password };
  if (identifier.includes('@')) {
    payload.email = identifier.trim();
  } else {
    payload.username = identifier.trim();
    payload.email = identifier.trim();
  }
  if (role) {
    payload.role = role.toLowerCase();
  }

  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Login failed. Please check credentials.');
  }

  const data = await res.json();
  const token = data.access_token || data.token;
  const userRole = (data.role || (data.user && data.user.role) || role || 'user').toLowerCase();
  const user = data.user || {
    id: data.id || '1',
    full_name: data.full_name || identifier,
    email: data.email || identifier,
    role: userRole === 'doctor' ? 'Doctor' : 'User'
  };

  setAuthSession(token, user, userRole);
  return {
    token,
    access_token: token,
    role: userRole,
    full_name: data.full_name || user.full_name,
    user
  };
}

export async function registerUser(data: {
  full_name: string;
  email: string;
  password: string;
  role: string;
  license_id?: string;
  license_number?: string;
  username?: string;
}): Promise<AuthSession> {
  const payload = {
    ...data,
    role: data.role.toLowerCase()
  };

  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Registration failed.');
  }

  const resData = await res.json();
  const token = resData.access_token || resData.token;
  const userRole = (resData.role || (resData.user && resData.user.role) || data.role || 'user').toLowerCase();
  const user = resData.user || {
    id: resData.id || '1',
    full_name: data.full_name,
    email: data.email,
    role: userRole === 'doctor' ? 'Doctor' : 'User',
    license_id: data.license_id
  };

  setAuthSession(token, user, userRole);
  return {
    token,
    access_token: token,
    role: userRole,
    full_name: resData.full_name || data.full_name,
    user
  };
}

export async function updateUserProfile(data: UserProfileUpdateRequest, token: string): Promise<AuthSession> {
  const res = await fetch(`${API_BASE}/auth/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update profile.');
  }
  const resData = await res.json();
  const user = resData.user;
  const role = resData.role || user.role;
  setAuthSession(resData.token || resData.access_token, user, role);
  return resData;
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const token = getAuthToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      if (res.status === 401) {
        clearAuthSession();
      }
      return null;
    }
    return res.json();
  } catch {
    return null;
  }
}

export async function demoSwitchRole(role: string): Promise<AuthSession> {
  const res = await fetch(`${API_BASE}/auth/demo-switch?role=${encodeURIComponent(role)}`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Demo switch failed');
  }
  const resData = await res.json();
  const token = resData.access_token || resData.token;
  const user = resData.user;
  const userRole = (resData.role || user.role).toLowerCase();
  setAuthSession(token, user, userRole);
  return {
    token,
    access_token: token,
    role: userRole,
    full_name: resData.full_name || user.full_name,
    user
  };
}
