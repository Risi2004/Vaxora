import { getToken, getUser } from '../../auth/services/authService';

const getAgentApiBase = () => {
  const envUrl = import.meta.env.VITE_AGENT_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return 'http://localhost:8001';
};

const AGENT_API_BASE = getAgentApiBase();

export const agentService = {
  /**
   * Check if the Agent service is healthy and reachable
   */
  async checkHealth() {
    try {
      const res = await fetch(`${AGENT_API_BASE}/api/agent/health`);
      if (!res.ok) return { online: false };
      const data = await res.json();
      return { online: true, ...data };
    } catch {
      return { online: false };
    }
  },

  /**
   * Send messages to a specialized agent (BookingAgent by default).
   * Pass targetAgent: "StaffSchedulingAgent" for hospital scheduling chat.
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
          id: user.id || user.userId,
          hospitalName: user.hospitalName || user.name,
        }
      : null;

    const payload = {
      messages,
      targetAgent: targetAgent || undefined,
      patientInfo: contextInfo || defaultPatientInfo,
    };

    const response = await fetch(`${AGENT_API_BASE}/api/agent/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Agent service failed' }));
      throw new Error(err.detail || 'Failed to communicate with Agent');
    }

    return await response.json();
  },
};

export default agentService;
