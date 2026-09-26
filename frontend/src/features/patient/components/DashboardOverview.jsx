import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authService, getUser } from "../../auth";
import { agentService } from "../services/agentService";
import { appointmentService } from "../services/appointmentService";
import { patientVaccinationService } from "../services/patientVaccinationService";
import CarePlanModal from "./CarePlanModal";

// ---------- Date helpers ----------
const formatLongDate = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
};

const formatShortDate = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
};

const daysAgo = (iso) => {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diff < 0) return `in ${Math.abs(diff)} days`;
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 30) return `${diff} days ago`;
  if (diff < 365) return `${Math.floor(diff / 30)} months ago`;
  return `${Math.floor(diff / 365)} years ago`;
};

const daysUntil = (iso) => {
  if (!iso) return "";
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return `in ${diff} days`;
};

export default function DashboardOverview({ onNavigateTab, onOpenBookModal }) {
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(() => {
    const cached =
      typeof authService?.getUser === "function"
        ? authService.getUser()
        : getUser
          ? getUser()
          : null;
    return cached?.name || cached?.profileDetails?.fullName || "";
  });

  // ---------- Care plan state ----------
  const [carePlanOpen, setCarePlanOpen] = useState(false);
  const [carePlanLoading, setCarePlanLoading] = useState(false);
  const [carePlanError, setCarePlanError] = useState(null);
  const [carePlanResult, setCarePlanResult] = useState(null);

  // ---------- Dashboard data state ----------
  const [nextAppointment, setNextAppointment] = useState(null);
  const [recentVaccines, setRecentVaccines] = useState([]);
  const [vaccinationStats, setVaccinationStats] = useState({
    totalDoses: 0,
    distinctVaccines: 0,
    lastVaccinatedAt: null,
  });
  const [dashboardLoading, setDashboardLoading] = useState(true);

  // ---------- Fetch latest profile (existing behaviour) ----------
  useEffect(() => {
    const fetchLatestProfile = async () => {
      try {
        if (typeof authService?.getMe === "function") {
          const fresh = await authService.getMe();
          const name = fresh?.name || fresh?.profileDetails?.fullName;
          if (name) setDisplayName(name);
        }
      } catch (err) {
        console.warn("Could not fetch latest user profile:", err);
      }
    };
    fetchLatestProfile();
  }, []);

  // ---------- Load real dashboard data ----------
  useEffect(() => {
    let cancelled = false;

    const loadDashboardData = async () => {
      const user = getUser();
      const patientProfileId =
        user?.profileDetails?.id || user?.profileId || user?.patientProfileId;

      try {
        setDashboardLoading(true);

        // 1. Appointments (next confirmed upcoming)
        try {
          const appointments =
            await appointmentService.getPatientAppointments();
          if (!cancelled && Array.isArray(appointments)) {
            const todayStr = new Date().toISOString().split("T")[0];
            const upcoming = appointments
              .filter((a) => {
                const status = String(a.status || a.Status || "").toLowerCase();
                const date = a.appointmentDate || a.date || a.Date;
                return status !== "cancelled" && date >= todayStr;
              })
              .sort(
                (a, b) =>
                  new Date(a.appointmentDate || a.date) -
                  new Date(b.appointmentDate || b.date),
              );
            setNextAppointment(upcoming[0] || null);
          }
        } catch (err) {
          console.warn("Could not load appointments for dashboard:", err);
        }

        // 2. Vaccination timeline
        if (patientProfileId) {
          try {
            const timeline =
              await patientVaccinationService.getTimeline(patientProfileId);
            if (!cancelled && timeline) {
              setVaccinationStats({
                totalDoses: timeline.totalDoses ?? 0,
                distinctVaccines: timeline.distinctVaccines ?? 0,
                lastVaccinatedAt: timeline.lastVaccinatedAt || null,
              });
              const records = Array.isArray(timeline.records)
                ? timeline.records
                : [];
              setRecentVaccines(records.slice(0, 4));
            }
          } catch (err) {
            console.warn("Could not load vaccination timeline:", err);
          }
        }
      } finally {
        if (!cancelled) setDashboardLoading(false);
      }
    };

    loadDashboardData();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---------- Care plan trigger ----------
  const handleGenerateCarePlan = async () => {
    const user = getUser();
    const patientProfileId =
      user?.profileDetails?.id || user?.profileId || user?.patientProfileId;

    if (!patientProfileId) {
      setCarePlanError(
        "Your patient profile could not be found. Please contact support.",
      );
      setCarePlanOpen(true);
      return;
    }

    setCarePlanOpen(true);
    setCarePlanLoading(true);
    setCarePlanError(null);
    setCarePlanResult(null);

    try {
      const result = await agentService.patientCarePlan(patientProfileId);
      setCarePlanResult(result);
      if (!result?.success) {
        setCarePlanError(
          result?.error || "The AI assistant could not generate a care plan.",
        );
      }
    } catch (err) {
      setCarePlanError(err.message || "Failed to generate care plan.");
    } finally {
      setCarePlanLoading(false);
    }
  };

  // ---------- Derived values for stat cards ----------
  const nextApptDate = nextAppointment
    ? nextAppointment.appointmentDate || nextAppointment.date
    : null;
  const nextApptVaccine = nextAppointment
    ? nextAppointment.vaccineName || nextAppointment.vaccine || "Appointment"
    : null;

  return (
    <div className="dashboard-overview-tab">
      {/* ---------- 1. Welcome Banner ---------- */}
      <div className="patient-welcome-banner">
        <div className="welcome-text-group">
          <h1>Welcome back{displayName ? `, ${displayName}` : ""}! 👋</h1>
          <p className="welcome-subtitle">
            {nextAppointment
              ? `Your next vaccination is scheduled for ${formatShortDate(nextApptDate)}.`
              : "Your Vaxora immunization pass is cryptographically verified and up-to-date. No upcoming appointments scheduled."}
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn-banner-action"
            style={{
              background: "rgba(255,255,255,0.15)",
              color: "#ffffff",
              borderColor: "rgba(255,255,255,0.4)",
            }}
            onClick={handleGenerateCarePlan}
          >
            ✨ Generate AI Care Plan
          </button>
          <button
            type="button"
            className="btn-banner-action"
            onClick={() =>
              onOpenBookModal
                ? onOpenBookModal()
                : navigate("/patient/appointments")
            }
          >
            + Book Vaccination
          </button>
        </div>
      </div>

      {/* ---------- 2. Stat Metric Cards (all real data) ---------- */}
      <div className="patient-stats-grid">
        {/* Card 1 — Upcoming Dose */}
        <div className="patient-stat-card">
          <div className="stat-card-icon-box icon-blue">📅</div>
          <div className="stat-card-info">
            <span className="stat-card-label">Upcoming Dose</span>
            <span className="stat-card-value">
              {dashboardLoading
                ? "…"
                : nextAppointment
                  ? formatShortDate(nextApptDate)
                  : "None"}
            </span>
            <span className="stat-card-note">
              {dashboardLoading
                ? "Loading"
                : nextAppointment
                  ? nextApptVaccine
                  : "No upcoming appointment"}
            </span>
          </div>
        </div>

        {/* Card 2 — Doses Received */}
        <div className="patient-stat-card">
          <div className="stat-card-icon-box icon-green">💉</div>
          <div className="stat-card-info">
            <span className="stat-card-label">Doses Received</span>
            <span className="stat-card-value">
              {dashboardLoading
                ? "…"
                : `${vaccinationStats.totalDoses} Completed`}
            </span>
            <span className="stat-card-note">
              {vaccinationStats.totalDoses > 0
                ? "Recorded in registry"
                : "No doses on file"}
            </span>
          </div>
        </div>

        {/* Card 3 — Distinct Vaccines */}
        <div className="patient-stat-card">
          <div className="stat-card-icon-box icon-purple">🛡️</div>
          <div className="stat-card-info">
            <span className="stat-card-label">Distinct Vaccines</span>
            <span className="stat-card-value">
              {dashboardLoading ? "…" : vaccinationStats.distinctVaccines}
            </span>
            <span className="stat-card-note">
              {vaccinationStats.distinctVaccines > 0
                ? "Verified in registry"
                : "None yet"}
            </span>
          </div>
        </div>

        {/* Card 4 — Last Vaccination */}
        <div className="patient-stat-card">
          <div className="stat-card-icon-box icon-amber">⏰</div>
          <div className="stat-card-info">
            <span className="stat-card-label">Last Vaccination</span>
            <span className="stat-card-value">
              {dashboardLoading
                ? "…"
                : vaccinationStats.lastVaccinatedAt
                  ? formatShortDate(vaccinationStats.lastVaccinatedAt)
                  : "—"}
            </span>
            <span className="stat-card-note">
              {vaccinationStats.lastVaccinatedAt
                ? daysAgo(vaccinationStats.lastVaccinatedAt)
                : "No record"}
            </span>
          </div>
        </div>
      </div>

      {/* ---------- 3. Main Dashboard Columns ---------- */}
      <div className="dashboard-columns-grid">
        {/* -------- Left column -------- */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Next Confirmed Appointment (now dynamic) */}
          <div className="patient-panel-card">
            <div className="panel-header-row">
              <h2 className="panel-title">Next Confirmed Appointment</h2>
              <button
                type="button"
                className="panel-link-btn"
                onClick={() => onNavigateTab("appointments")}
              >
                View all →
              </button>
            </div>

            {dashboardLoading ? (
              <div
                style={{
                  padding: "32px",
                  textAlign: "center",
                  color: "#64748b",
                }}
              >
                Loading your next appointment…
              </div>
            ) : !nextAppointment ? (
              <div
                style={{
                  padding: "32px",
                  textAlign: "center",
                  color: "#64748b",
                  background: "#f8fafc",
                  borderRadius: "12px",
                  border: "1.5px dashed #cbd5e1",
                }}
              >
                <p style={{ margin: "0 0 12px", fontSize: "0.95rem" }}>
                  You have no upcoming appointments.
                </p>
                <button
                  type="button"
                  className="btn-outline-action"
                  style={{
                    background: "#19469d",
                    color: "#ffffff",
                    borderColor: "#19469d",
                  }}
                  onClick={() =>
                    onOpenBookModal
                      ? onOpenBookModal()
                      : navigate("/patient/appointments")
                  }
                >
                  + Book an Appointment
                </button>
              </div>
            ) : (
              <div className="spotlight-appointment">
                <div className="appointment-meta-top">
                  <span className="vaccine-badge-pill">{nextApptVaccine}</span>
                  <span className="status-badge-confirmed">
                    ●{" "}
                    {String(
                      nextAppointment.status || "Confirmed",
                    ).toUpperCase()}
                  </span>
                </div>

                <div className="appointment-main-details">
                  <h3>
                    {nextAppointment.hospitalName ||
                      nextAppointment.location ||
                      "Hospital"}
                  </h3>
                  <div className="appointment-hospital-line">
                    <span>
                      📍{" "}
                      {nextAppointment.hospitalAddress ||
                        nextAppointment.district ||
                        "See appointment details"}
                    </span>
                  </div>
                </div>

                <div className="appointment-date-time-bar">
                  <span>🗓️ {formatLongDate(nextApptDate)}</span>
                  <span>
                    ⏰ {nextAppointment.timeSlot || nextAppointment.time || "—"}
                  </span>
                  {nextAppointment.doctorName && (
                    <span>👨‍⚕️ Dr. {nextAppointment.doctorName}</span>
                  )}
                </div>

                <div className="appointment-actions-row">
                  <button
                    type="button"
                    className="btn-outline-action"
                    onClick={() => navigate("/patient/appointments")}
                  >
                    Manage / Reschedule
                  </button>
                  <button
                    type="button"
                    className="btn-outline-action"
                    style={{
                      background: "#19469d",
                      color: "#ffffff",
                      borderColor: "#19469d",
                    }}
                    onClick={() =>
                      alert(
                        `Appointment on ${formatShortDate(nextApptDate)} — a slip has been sent to your registered email.`,
                      )
                    }
                  >
                    Download Appointment Slip
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Travel advisory (static info — unchanged) */}
          <div
            className="patient-panel-card"
            style={{ background: "#f8fafc", border: "1.5px dashed #cbd5e1" }}
          >
            <div
              style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}
            >
              <div
                style={{
                  fontSize: "1.8rem",
                  background: "#eff6ff",
                  padding: "10px",
                  borderRadius: "12px",
                }}
              >
                ✈️
              </div>
              <div>
                <h4
                  style={{
                    fontSize: "1.05rem",
                    fontWeight: 800,
                    color: "#1e1b4b",
                    marginBottom: "4px",
                  }}
                >
                  International Travel Immunization Advisory
                </h4>
                <p
                  style={{
                    fontSize: "0.88rem",
                    color: "#475569",
                    lineHeight: 1.5,
                  }}
                >
                  Planning international travel in 2026? Ensure your Yellow
                  Fever and Meningococcal vaccine certificates are renewed at
                  least 14 days before departure.
                </p>
                <button
                  type="button"
                  className="panel-link-btn"
                  style={{ marginTop: "8px", display: "inline-block" }}
                  onClick={() => navigate("/patient/vaccination-history")}
                >
                  Check Vaccination Certifications →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* -------- Right column: Immunization Tracker (real data) -------- */}
        <div className="patient-panel-card">
          <div className="panel-header-row">
            <h2 className="panel-title">Immunization Tracker</h2>
            <button
              type="button"
              className="panel-link-btn"
              onClick={() => navigate("/patient/vaccination-history")}
            >
              Full History →
            </button>
          </div>

          <div className="schedule-checklist">
            {dashboardLoading ? (
              <div
                style={{
                  padding: "24px",
                  textAlign: "center",
                  color: "#64748b",
                }}
              >
                Loading your vaccinations…
              </div>
            ) : recentVaccines.length === 0 ? (
              <div
                style={{
                  padding: "24px",
                  textAlign: "center",
                  color: "#64748b",
                  fontStyle: "italic",
                }}
              >
                No vaccination records on file yet.
              </div>
            ) : (
              recentVaccines.map((rec, idx) => (
                <div key={rec.id || idx} className="schedule-item">
                  <div className="schedule-left">
                    <div className="schedule-icon-circle">✅</div>
                    <div>
                      <div className="schedule-name">
                        {rec.vaccineName || "Vaccine"}
                      </div>
                      <div className="schedule-target">
                        Dose {rec.doseNumber || 1} •{" "}
                        {rec.administeredByName || "—"}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span className="schedule-status-tag status-completed">
                      Completed
                    </span>
                    <div
                      style={{
                        fontSize: "0.78rem",
                        color: "#64748b",
                        marginTop: "4px",
                        fontWeight: 600,
                      }}
                    >
                      {formatShortDate(rec.administeredAt)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div
            style={{
              marginTop: "24px",
              paddingTop: "16px",
              borderTop: "1px solid #f1f5f9",
              textAlign: "center",
            }}
          >
            <button
              type="button"
              className="btn-outline-action"
              style={{
                width: "100%",
                borderColor: "#19469d",
                color: "#19469d",
              }}
              onClick={() => navigate("/patient/appointments")}
            >
              + Schedule Recommended Dose
            </button>
          </div>
        </div>
      </div>

      {/* ---------- 4. Care Plan Modal ---------- */}
      <CarePlanModal
        isOpen={carePlanOpen}
        loading={carePlanLoading}
        error={carePlanError}
        result={carePlanResult}
        onClose={() => {
          if (carePlanLoading) return;
          setCarePlanOpen(false);
          setCarePlanError(null);
          setCarePlanResult(null);
        }}
      />
    </div>
  );
}
