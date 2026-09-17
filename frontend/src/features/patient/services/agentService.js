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
   * Send messages to the Booking Agent
   */
  async sendMessage(messages) {
    const token = getToken();
    const user = getUser();

    const headers = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const payload = {
      messages,
      patientInfo: user ? {
        name: user.name || user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        email: user.email,
        nic: user.nic || user.nationalId,
        id: user.id || user.userId
      } : null
    };

    const response = await fetch(`${AGENT_API_BASE}/api/agent/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Agent service failed' }));
      throw new Error(err.detail || 'Failed to communicate with Booking Agent');
    }

    return await response.json();
  }
};

export default agentService;
