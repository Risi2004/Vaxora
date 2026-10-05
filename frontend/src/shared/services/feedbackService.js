// Vaxora Feedback Service
// Thin client for /api/feedback endpoints.

const getApiBase = () => {
  const envUrl =
    import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === "string" && envUrl.trim()) {
    const trimmed = envUrl.trim().replace(/\/+$/, "");
    return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
  }
  return "/api";
};

const API_BASE = getApiBase();

const getToken = () => localStorage.getItem("vaxora_token");

async function apiRequest(endpoint, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };

  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get("content-type");
  const isJson = contentType && contentType.includes("application/json");
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    let message = "Request failed";
    if (typeof data === "object" && data !== null) {
      message = data.message || data.title || message;
    } else if (typeof data === "string" && data) {
      message = data;
    }
    throw new Error(message);
  }

  return data;
}

export const feedbackService = {
  /** Submit new feedback. */
  async submit(payload) {
    return apiRequest("/feedback", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /** Current user's own feedback history. */
  async getMine() {
    return apiRequest("/feedback/my", { method: "GET" });
  },

  /** Edit a feedback submission (owner only, before resolution). */
  async update(id, payload) {
    return apiRequest(`/feedback/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  /** Public random showcase for landing page (no auth needed). */
  async getPublicRandom(count = 5) {
    return apiRequest(`/feedback/public/random?count=${count}`, {
      method: "GET",
    });
  },

  /** Admin — list every submission. */
  async getAll() {
    return apiRequest("/feedback", { method: "GET" });
  },

  /** Admin — resolve or reply. */
  async resolve(id, payload) {
    return apiRequest(`/feedback/${id}/resolution`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
};

export default feedbackService;
