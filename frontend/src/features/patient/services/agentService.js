import { getToken, getUser } from '../../auth/services/authService';

/**
 * The Agentic AI service is internal. The browser talks to the ASP.NET API, which
 * authenticates the caller and forwards the request to the agent orchestrator.
 */
const getApiBase = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    const trimmed = envUrl.trim().replace(/\/+$/, '');
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
  }
  return '/api';
};

const API_BASE = getApiBase();

export const agentService = {
  /**
   * Check whether the agent subsystem is reachable through the API.
   */
  async checkHealth() {
    try {
      const res = await fetch(`${API_BASE}/agent/health`);
      if (!res.ok) return { online: false };
      const data = await res.json();
      return { online: Boolean(data.online), agents: data.agents || [] };
    } catch {
      return { online: false };
    }
  },

  /**
   * Send messages to a specialized agent (orchestrator routes when targetAgent is omitted).
   * Pass targetAgent: "StaffSchedulingAgent" for the hospital scheduling chat.
   */
  async sendMessage(messages, { targetAgent, contextInfo } = {}) {
    const token = getToken();
    const user = getUser();

    const headers = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const defaultPatientInfo = user
      ? {
          name:
            user.name ||
            user.fullName ||
            user.hospitalName ||
            `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          email: user.email,
          nic: user.nic || user.nationalId,
          hospitalName: user.hospitalName || user.name,
        }
      : null;

    // The API only accepts user/assistant turns, so strip UI-only fields before sending.
    const payload = {
      messages: (messages || [])
        .filter((m) => (m.role === 'user' || m.role === 'assistant') && String(m.content ?? '').trim())
        .map((m) => ({ role: m.role, content: String(m.content).slice(0, 4000) })),
      targetAgent: targetAgent || undefined,
      patientInfo: contextInfo || defaultPatientInfo,
    };

    const response = await fetch(`${API_BASE}/agent/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || err.detail || err.title || 'Failed to communicate with the AI assistant.');
    }

    return await response.json();
  },

  /**
   * Persist a human approve/reject decision against a stored agent workflow run.
   */
  async recordDecision(workflowId, { approved, note } = {}) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${API_BASE}/agent/workflows/${workflowId}/decision`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ approved: Boolean(approved), note: note || undefined }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || err.title || 'Failed to record workflow decision.');
    }

    return await response.json();
  },

  /**
   * Recent agent runs for the logged-in user (observability).
   */
  async getRecentWorkflows(limit = 20) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${API_BASE}/agent/workflows?limit=${limit}`, {
      headers,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || err.title || 'Failed to load agent workflows.');
    }

    return await response.json();
  },
};

export default agentService;
