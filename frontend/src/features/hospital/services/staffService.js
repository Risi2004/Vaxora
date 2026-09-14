import { getToken } from '../../auth/services/authService';

const getApiBase = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    const trimmed = envUrl.trim().replace(/\/+$/, '');
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
  }
  return '/api';
};

const API_BASE = getApiBase();

async function apiRequest(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    let errorMessage = 'Request failed';
    if (typeof data === 'object' && data !== null) {
      if (data.message) errorMessage = data.message;
      else if (data.title) errorMessage = data.title;
    } else if (typeof data === 'string' && data) {
      errorMessage = data;
    }
    throw new Error(errorMessage);
  }

  return data;
}

function buildQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      query.set(key, value);
    }
  });
  const qs = query.toString();
  return qs ? `?${qs}` : '';
}

export const staffService = {
  inviteStaff(registrationNumber) {
    return apiRequest('/staff/invite', {
      method: 'POST',
      body: JSON.stringify({ registrationNumber }),
    });
  },

  getHospitalStaff({ role, dutyStatus, search, status } = {}) {
    return apiRequest(`/staff/hospital${buildQuery({ role, dutyStatus, search, status })}`);
  },

  removeAffiliation(affiliationId) {
    return apiRequest(`/staff/affiliations/${affiliationId}`, {
      method: 'DELETE',
    });
  },

  updateDutyStatus(affiliationId, dutyStatus) {
    return apiRequest(`/staff/affiliations/${affiliationId}/duty`, {
      method: 'PUT',
      body: JSON.stringify({ dutyStatus }),
    });
  },

  getMyInvitations() {
    return apiRequest('/staff/invitations');
  },

  respondToInvitation(affiliationId, decision) {
    return apiRequest(`/staff/invitations/${affiliationId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ decision }),
    });
  },

  getMyAffiliations() {
    return apiRequest('/staff/my-affiliations');
  },

  getHospitalShifts({ from, to } = {}) {
    return apiRequest(`/staff/shifts/hospital${buildQuery({ from, to })}`);
  },

  createShift(payload) {
    return apiRequest('/staff/shifts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateShift(shiftId, payload) {
    return apiRequest(`/staff/shifts/${shiftId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  deleteShift(shiftId) {
    return apiRequest(`/staff/shifts/${shiftId}`, {
      method: 'DELETE',
    });
  },

  getMyShifts({ from, to } = {}) {
    return apiRequest(`/staff/shifts/mine${buildQuery({ from, to })}`);
  },
};

export default staffService;
