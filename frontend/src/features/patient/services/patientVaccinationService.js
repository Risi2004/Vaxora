// Vaxora Patient Vaccination Service
// Thin client for /api/patient-vaccinations endpoints.

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

export const patientVaccinationService = {
  /**
   * Fetch the full vaccination timeline for a patient profile.
   * @param {string} patientProfileId - UUID from user.profileDetails.id
   */
  async getTimeline(patientProfileId) {
    if (!patientProfileId) {
      throw new Error("Missing patient profile ID.");
    }
    return await apiRequest(
      `/patient-vaccinations/patients/${patientProfileId}/timeline`,
      {
        method: "GET",
      },
    );
  },
};

export default patientVaccinationService;
