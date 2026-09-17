import React, { useEffect, useState } from "react";
import { getUser } from "../../auth/services/authService";
import { patientVaccinationService } from "../services/patientVaccinationService";

export default function VaccinationHistoryTab() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [selectedCertificate, setSelectedCertificate] = useState(null);

  // Load current user + their profile ID from localStorage
  const currentUser = getUser() || {};
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
    <div className="doctor-patient-history-page">
      {loading && (
        <div style={{ padding: "40px", textAlign: "center", color: "#475569" }}>
          Loading your vaccination history…
        </div>
      )}

      {error && (
        <div
          className="appointment-alert-pill"
          role="alert"
          style={{ background: "#fee2e2", color: "#991b1b" }}
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
                <svg
                  className="patient-avatar-silhouette"
                  viewBox="0 0 100 100"
                  fill="none"
                >
                  <circle cx="50" cy="50" r="50" fill="#d8dce3" />
                  <circle cx="50" cy="38" r="18" fill="#5a5e66" />
                  <path
                    d="M20 86C20 68 34 60 50 60C66 60 80 68 80 86"
                    fill="#5a5e66"
                  />
                </svg>
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
          <div
            style={{
              display: "flex",
              gap: "16px",
              margin: "20px 0",
              flexWrap: "wrap",
            }}
          >
            <div style={statBoxStyle}>
              <span style={statValueStyle}>{timeline?.totalDoses ?? 0}</span>
              <span style={statLabelStyle}>Total Doses</span>
            </div>
            <div style={statBoxStyle}>
              <span style={statValueStyle}>
                {timeline?.distinctVaccines ?? 0}
              </span>
              <span style={statLabelStyle}>Distinct Vaccines</span>
            </div>
            <div style={statBoxStyle}>
              <span style={statValueStyle}>
                {timeline?.lastVaccinatedAt
                  ? formatDate(timeline.lastVaccinatedAt)
                  : "—"}
              </span>
              <span style={statLabelStyle}>Last Vaccination</span>
            </div>
          </div>

          {/* Vaccination History Table */}
          <div>
            <h3 className="patient-section-heading">Vaccination History</h3>
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
                          <span
                            style={{
                              cursor: "pointer",
                              textDecoration: "underline",
                              color: "#1d1854",
                              fontWeight: 700,
                            }}
                            title="Click to view digital certificate"
                            onClick={() => setSelectedCertificate(item)}
                          >
                            Completed 📜
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        style={{ padding: "20px", fontStyle: "italic" }}
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
                <span style={{ fontSize: "1.4rem" }}>🛡️</span>
                <h3
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 800,
                    color: "#1e1b4b",
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
                ✕
              </button>
            </div>

            <div
              style={{
                padding: "16px 20px",
                background: "#f8fafc",
                borderRadius: "12px",
                margin: "16px 0",
              }}
            >
              <p
                style={{ margin: "0 0 6px", fontWeight: 700, color: "#1e1b4b" }}
              >
                Vaccine: {selectedCertificate.vaccineName}
              </p>
              <p
                style={{
                  margin: "0 0 6px",
                  fontSize: "0.9rem",
                  color: "#475569",
                }}
              >
                Manufacturer: {selectedCertificate.manufacturer}
              </p>
              <p
                style={{
                  margin: "0 0 6px",
                  fontSize: "0.9rem",
                  color: "#475569",
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
                  fontSize: "0.9rem",
                  color: "#475569",
                }}
              >
                Administered At:{" "}
                {formatDate(selectedCertificate.administeredAt)}
              </p>
              <p
                style={{
                  margin: "0 0 6px",
                  fontSize: "0.9rem",
                  color: "#475569",
                }}
              >
                Administered By: {selectedCertificate.administeredByName}
              </p>
              {selectedCertificate.lotNumber && (
                <p
                  style={{
                    margin: "0 0 6px",
                    fontSize: "0.9rem",
                    color: "#475569",
                  }}
                >
                  Lot #: {selectedCertificate.lotNumber}
                </p>
              )}
              <p
                style={{
                  margin: "0",
                  fontSize: "0.85rem",
                  color: "#16a34a",
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
  );
}

const statBoxStyle = {
  flex: "1 1 200px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "10px",
  padding: "14px 18px",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};
const statValueStyle = {
  fontSize: "1.4rem",
  fontWeight: 800,
  color: "#1e1b4b",
};
const statLabelStyle = {
  fontSize: "0.8rem",
  color: "#64748b",
  letterSpacing: "0.5px",
};
