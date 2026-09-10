// Vaxora Authentication & Verification Service

const API_BASE = '/api';

/**
 * Helper to retrieve stored auth token
 */
export const getToken = () => localStorage.getItem('vaxora_token');

/**
 * Helper to retrieve stored refresh token
 */
export const getRefreshToken = () => localStorage.getItem('vaxora_refresh_token');

/**
 * Helper to retrieve stored user object
 */
export const getUser = () => {
  try {
    const raw = localStorage.getItem('vaxora_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/**
 * Save auth session
 */
export const setSession = (token, refreshToken, user) => {
  if (token) localStorage.setItem('vaxora_token', token);
  if (refreshToken) localStorage.setItem('vaxora_refresh_token', refreshToken);
  if (user) localStorage.setItem('vaxora_user', JSON.stringify(user));
};

/**
 * Clear auth session
 */
export const clearAuth = () => {
  localStorage.removeItem('vaxora_token');
  localStorage.removeItem('vaxora_refresh_token');
  localStorage.removeItem('vaxora_user');
};

/**
 * Generic API request wrapper with auth header & error handling
 */
async function apiRequest(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    ...(options.headers || {}),
  };

  // Only set Content-Type to application/json if not sending FormData
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
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
      if (data.message) {
        errorMessage = data.message;
      } else if (data.errors && typeof data.errors === 'object') {
        const fieldErrors = Object.values(data.errors).flat();
        if (fieldErrors.length > 0) {
          errorMessage = fieldErrors.join(' ');
        } else if (data.title) {
          errorMessage = data.title;
        }
      } else if (data.title) {
        errorMessage = data.title;
      }
    } else if (typeof data === 'string' && data) {
      try {
        const parsed = JSON.parse(data);
        if (parsed.message) errorMessage = parsed.message;
        else if (parsed.errors) errorMessage = Object.values(parsed.errors).flat().join(' ');
        else if (parsed.title) errorMessage = parsed.title;
        else errorMessage = data;
      } catch {
        errorMessage = data;
      }
    }
    throw new Error(errorMessage);
  }

  return data;
}

export const authService = {
  // 1. Login
  async login(email, password) {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (data.token) {
      setSession(data.token, data.refreshToken, data.user);
    }
    return data;
  },

  // 2. Patient Signup
  async signupPatient(payload) {
    const data = await apiRequest('/auth/signup/patient', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (data.token) {
      setSession(data.token, data.refreshToken, data.user);
    }
    return data;
  },

  // 3. Doctor Signup (Multipart form-data)
  async signupDoctor(formData) {
    const data = await apiRequest('/auth/signup/doctor', {
      method: 'POST',
      body: formData,
    });
    if (data.token) {
      setSession(data.token, data.refreshToken, data.user);
    }
    return data;
  },

  // 4. Nurse Signup (Multipart form-data)
  async signupNurse(formData) {
    const data = await apiRequest('/auth/signup/nurse', {
      method: 'POST',
      body: formData,
    });
    if (data.token) {
      setSession(data.token, data.refreshToken, data.user);
    }
    return data;
  },

  // 5. Hospital Signup (Multipart form-data)
  async signupHospital(formData) {
    const data = await apiRequest('/auth/signup/hospital', {
      method: 'POST',
      body: formData,
    });
    if (data.token) {
      setSession(data.token, data.refreshToken, data.user);
    }
    return data;
  },

  // 6. Get Current User Profile
  async getMe() {
    const user = await apiRequest('/auth/me', {
      method: 'GET',
    });
    if (user) {
      const current = getUser() || {};
      localStorage.setItem('vaxora_user', JSON.stringify({ ...current, ...user }));
    }
    return user;
  },

  // 7. Refresh Token
  async refreshToken() {
    const refreshToken = getRefreshToken();
    if (!refreshToken) throw new Error('No refresh token available');

    const data = await apiRequest('/auth/refresh-token', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });

    if (data.token) {
      setSession(data.token, data.refreshToken, data.user);
    }
    return data;
  },

  // 8. Logout
  async logout() {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch (err) {
      console.warn('Logout API error:', err);
    } finally {
      clearAuth();
    }
  },

  // 9. Forgot Password
  async forgotPassword(email) {
    return await apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  // 10. Reset Password
  async resetPassword(email, resetToken, newPassword) {
    return await apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, resetToken, newPassword }),
    });
  },

  // 11. Change Password
  async changePassword(currentPassword, newPassword) {
    return await apiRequest('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  // ================= ADMIN VERIFICATION APIS =================
  async getPendingVerifications() {
    return await apiRequest('/admin/verification/pending', {
      method: 'GET',
    });
  },

  async decideVerification(userId, decision, reason = '') {
    return await apiRequest(`/admin/verification/decide/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ decision, reason }),
    });
  },

  async updateUserStatus(userId, status) {
    return await apiRequest(`/admin/verification/status/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  async getAuditLogs(limit = 100) {
    return await apiRequest(`/admin/verification/audit-logs?limit=${limit}`, {
      method: 'GET',
    });
  }
};

export default authService;
