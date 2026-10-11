import { useEffect, useState } from "react";
import { authService, getUser, subscribeAuthUser } from "../../auth";
import { patientVaccinationService } from "../services/patientVaccinationService";
import { IconClock, IconClose, IconShield, IconSyringe } from "../../../shared/icons/AppIcons";
import PatientSubpageHeader from './PatientSubpageHeader';

export default function VaccinationHistoryTab() {
  const [currentUser, setCurrentUser] = useState(() => getUser() || {});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [selectedCertificate, setSelectedCertificate] = useState(null);

  useEffect(() => {
    const syncUser = () => setCurrentUser(getUser() || {});
    const unsubscribe = subscribeAuthUser(syncUser);
    authService.getMe().catch((err) => {
      console.warn("Could not refresh patient profile:", err);
    });
    return unsubscribe;
  }, []);

  // Load current user + their profile ID from localStorage
  const profile = currentUser.profileDetails || {};
  const patientProfileId = profile.id;
  const vaxoraId = currentUser.registrationNumber || "—";
  const displayName = (
    profile.fullName ||
    currentUser.name ||
    "—"
  ).toUpperCase();
  const nicNumber = profile.nicNumber || "—";
  const email = currentUser.email || "—";
  const phone = currentUser.phoneNumber || profile.phoneNumber || "—";
  const profilePhotoUrl = currentUser.profilePhotoUrl || profile.profilePhotoUrl;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!patientProfileId) {
        setLoading(false);
        setError(
          "Your patient profile could not be found. Please contact support.",
        );
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const data =
          await patientVaccinationService.getTimeline(patientProfileId);
        if (!cancelled) setTimeline(data);
      } catch (err) {
        if (!cancelled)
          setError(err.message || "Failed to load vaccination history.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [patientProfileId]);

  const formatDate = (iso) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString("en-GB", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  const records = timeline?.records || [];

  return (
    <div className="patient-subpage-page">
      <PatientSubpageHeader
        title="My vaccinations"
        subtitle="Review your immunization records and access your vaccination certificates."
      />
      <div className="doctor-patient-history-page">
      {loading && (
        <div style={{ padding: "40px", textAlign: "center", color: "var(--color-text-body)" }}>
          Loading your vaccination history…
        </div>
      )}

      {error && (
        <div
          className="appointment-alert-pill"
          role="alert"
          style={{ background: "var(--color-error-bg)", color: "var(--color-error)" }}
        >
          ⚠ {error}
        </div>
      )}

      {!loading && !error && (
        <section className="patient-details-card-container">
          {/* Personal Information Card */}
          <div className="patient-personal-info-box">
            <div className="patient-avatar-wrapper">
              <div className="patient-avatar-circle">
                {profilePhotoUrl ? (
                  <img src={profilePhotoUrl} alt={`${displayName} profile`} className="patient-avatar-silhouette" style={{ objectFit: "cover" }} />
                ) : <svg
                  className="patient-avatar-silhouette"
                  viewBox="0 0 100 100"
                  fill="none"
                >
                  <circle cx="50" cy="50" r="50" style={{ fill: "var(--color-soft-panel-deep)" }} />
                  <circle cx="50" cy="38" r="18" style={{ fill: "var(--color-text-muted)" }} />
                  <path
                    d="M20 86C20 68 34 60 50 60C66 60 80 68 80 86"
                    style={{ fill: "var(--color-text-muted)" }}
                  />
                </svg>}
              </div>
            </div>

            <div className="patient-info-content">
              <h2 className="patient-info-heading">Personal Information</h2>
              <div className="patient-info-grid">
                <div className="patient-info-row">
                  <span className="patient-info-label">ID</span>
                  <span className="patient-info-colon">:</span>
                  <span className="patient-info-val">{vaxoraId}</span>
                </div>
                <div className="patient-info-row">
                  <span className="patient-info-label">NIC</span>
                  <span className="patient-info-colon">:</span>
                  <span className="patient-info-val">{nicNumber}</span>
                </div>
                <div className="patient-info-row">
                  <span className="patient-info-label">NAME</span>
                  <span className="patient-info-colon">:</span>
                  <span className="patient-info-val">{displayName}</span>
                </div>
                <div className="patient-info-row">
                  <span className="patient-info-label">EMAIL</span>
                  <span className="patient-info-colon">:</span>
                  <span className="patient-info-val">{email}</span>
                </div>
                <div className="patient-info-row">
                  <span className="patient-info-label">PHONE NUMBER</span>
                  <span className="patient-info-colon">:</span>
                  <span className="patient-info-val">{phone}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Summary strip */}
          {/* Same stat cards as the patient home */}
          <div className="hospital-metrics-grid hospital-metrics-grid--3" style={{ margin: "20px 0" }}>
            <div className="hospital-stat-card">
              <div className="hospital-stat-icon stat-icon-green">
                <IconSyringe size={22} />
              </div>
              <div className="hospital-stat-info">
                <span className="hospital-stat-label">Total Doses</span>
                <span className="hospital-stat-value">{timeline?.totalDoses ?? 0}</span>
              </div>
            </div>
            <div className="hospital-stat-card">
              <div className="hospital-stat-icon stat-icon-teal">
                <IconShield size={22} />
              </div>
              <div className="hospital-stat-info">
                <span className="hospital-stat-label">Distinct Vaccines</span>
                <span className="hospital-stat-value">{timeline?.distinctVaccines ?? 0}</span>
              </div>
            </div>
            <div className="hospital-stat-card">
              <div className="hospital-stat-icon stat-icon-slate">
                <IconClock size={22} />
              </div>
              <div className="hospital-stat-info">
                <span className="hospital-stat-label">Last Vaccination</span>
                <span className="hospital-stat-value">
                  {timeline?.lastVaccinatedAt ? formatDate(timeline.lastVaccinatedAt) : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Vaccination History Table */}
          <div>
            <h3 className="patient-section-heading">Doses received</h3>
            <div className="patient-mockup-table-wrapper">
              <table className="patient-mockup-table">
                <thead>
                  <tr>
                    <th style={{ width: "28%" }}>Vaccine</th>
                    <th style={{ width: "16%" }}>Dose</th>
                    <th style={{ width: "20%" }}>Date</th>
                    <th style={{ width: "18%" }}>Administered By</th>
                    <th style={{ width: "18%" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {records.length > 0 ? (
                    records.map((item) => (
                      <tr key={item.id}>
                        <td>{item.vaccineName}</td>
                        <td>Dose {item.doseNumber}</td>
                        <td>{formatDate(item.administeredAt)}</td>
                        <td>{item.administeredByName}</td>
                        <td>
                          <button
                            type="button"
                            className="mockup-status-badge accepted"
                            style={{ cursor: "pointer" }}
                            title="View digital certificate"
                            onClick={() => setSelectedCertificate(item)}
                          >
                            Completed · Certificate
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="empty-table-cell"
                      >
                        No vaccination records on file yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Digital Certificate Modal */}
      {selectedCertificate && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedCertificate(null)}
        >
          <div
            className="modal-content-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header-row">
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <span style={{ display: "inline-flex", color: "var(--color-text-title)" }}><IconShield size={22} /></span>
                <h3
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 800,
                    color: "var(--color-text-title)",
                    margin: 0,
                  }}
                >
                  Vaccination Record
                </h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedCertificate(null)}
              >
                <IconClose size={16} />
              </button>
            </div>

            <div
              style={{
                padding: "16px 20px",
                background: "var(--color-bg)",
                borderRadius: "12px",
                margin: "16px 0",
              }}
            >
              <p
                style={{ margin: "0 0 6px", fontWeight: 700, color: "var(--color-text-title)" }}
              >
                Vaccine: {selectedCertificate.vaccineName}
              </p>
              <p
                style={{
                  margin: "0 0 6px",
                  fontSize: "0.875rem",
                  color: "var(--color-text-body)",
                }}
              >
                Manufacturer: {selectedCertificate.manufacturer}
              </p>
              <p
                style={{
                  margin: "0 0 6px",
                  fontSize: "0.875rem",
                  color: "var(--color-text-body)",
                }}
              >
                Dose: {selectedCertificate.doseNumber} • Route:{" "}
                {selectedCertificate.route}
                {selectedCertificate.site
                  ? ` • Site: ${selectedCertificate.site}`
                  : ""}
              </p>
              <p
                style={{
                  margin: "0 0 6px",
                  fontSize: "0.875rem",
                  color: "var(--color-text-body)",
                }}
              >
                Administered At:{" "}
                {formatDate(selectedCertificate.administeredAt)}
              </p>
              <p
                style={{
                  margin: "0 0 6px",
                  fontSize: "0.875rem",
                  color: "var(--color-text-body)",
                }}
              >
                Administered By: {selectedCertificate.administeredByName}
              </p>
              {selectedCertificate.lotNumber && (
                <p
                  style={{
                    margin: "0 0 6px",
                    fontSize: "0.875rem",
                    color: "var(--color-text-body)",
                  }}
                >
                  Lot #: {selectedCertificate.lotNumber}
                </p>
              )}
              <p
                style={{
                  margin: "0",
                  fontSize: "0.875rem",
                  color: "var(--color-success)",
                  fontWeight: 700,
                }}
              >
                Recorded in the National Immunization Registry (Vaxora)
              </p>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setSelectedCertificate(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

