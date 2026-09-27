// Vaxora AI Agent + Draft Execution Service

const getApiBase = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    const trimmed = envUrl.trim().replace(/\/+$/, '');
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
  }
  return '/api';
};

const API_BASE = getApiBase();

const getAgentBase = () => {
  const envUrl = import.meta.env.VITE_AGENT_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  // When running against deployed backend, proxy through ASP.NET Core gateway
  if (API_BASE && API_BASE !== '/api') {
    return API_BASE.replace(/\/api$/, '');
  }
  return 'http://localhost:8001';
};

const AGENT_BASE = getAgentBase();
const getToken = () => localStorage.getItem('vaxora_token');


async function agentRequest(endpoint, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}), 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${AGENT_BASE}${endpoint}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.detail || data.message || 'AI agent request failed');
  }
  return data;
}

export const aiAgentService = {
  /**
   * Run an agent with a natural-language objective.
   * @param {string} objective - e.g. "Scan for expiring batches"
   * @param {object} patientInfo - { name, role, email } of the current user
   */
  async run(objective, patientInfo = null) {
    return await agentRequest('/api/agent/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: objective }],
        patientInfo,
      }),
    });
  },

  async health() {
    return await agentRequest('/api/agent/health', { method: 'GET' });
  },
};

export const inventoryDraftService = {
  /**
   * Execute an approved agent draft via the .NET backend.
   * @param {string} workflowId - from the agent response
   * @param {string} draftType - "purchase_order" | "expiry_memo"
   * @param {object} payload - shape depends on draftType
   */
  async execute(workflowId, draftType, payload) {
    const token = getToken();
    const res = await fetch(`${API_BASE}/Inventory/agent/execute-draft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ workflowId, draftType, payload }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Failed to execute draft');
    return data;
  },

  async getWorkflows(limit = 20) {
    const token = getToken();
    const res = await fetch(`${API_BASE}/Inventory/agent/workflows?limit=${limit}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const data = await res.json().catch(() => []);
    if (!res.ok) throw new Error('Failed to fetch workflows');
    return data;
  },

};

export default aiAgentService;