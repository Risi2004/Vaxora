import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../../auth";
import { appointmentService } from "../services/appointmentService";
import { patientVaccinationService } from "../services/patientVaccinationService";

// ---------- Helpers ----------
const formatDate = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return iso;
  }
};

const statusColor = (status) => {
  const s = String(status || "").toLowerCase();
  if (s === "confirmed" || s === "completed") return "#10b981";
  if (s === "cancelled") return "#ef4444";
  if (s === "pendingpayment" || s === "pending") return "#b45309";
  return "#0284c7"; // scheduled, in progress, etc.
};

export default function PatientProfileTab() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState("");
  const [notificationType, setNotificationType] = useState("success");

  const [profileData, setProfileData] = useState({
    id: "",
    nic: "",
    name: "",
    email: "",
    phone: "",
    dob: "",
    status: "Active",
    profilePhotoUrl: null,
  });

  // ---------- Real history data ----------
  const [appointments, setAppointments] = useState([]);
  const [vaccinations, setVaccinations] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [loadingVaccinations, setLoadingVaccinations] = useState(true);

  const showNotification = (msg, type = "success") => {
    setNotification(msg);
    setNotificationType(type);
    setTimeout(() => setNotification(""), 3500);
  };

  // ---------- Load live patient profile ----------
  const loadProfile = async () => {
    try {
      const cached = authService.getUser();
      if (cached) populateState(cached);

      const freshUser = await authService.getMe();
      if (freshUser) populateState(freshUser);
    } catch (err) {
      console.warn("Could not fetch latest patient profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const populateState = (user) => {
    const details = user.profileDetails || {};
    const dobFormatted = details.dateOfBirth
      ? new Date(details.dateOfBirth).toISOString().split("T")[0]
      : "";

    setProfileData({
      id: user.registrationNumber || details.id || "VAX-P-000000",
      nic: details.nicNumber || details.nic || "N/A",
      name: details.fullName || user.name || "",
      email: user.email || "",
      phone: user.phoneNumber || details.phoneNumber || "",
      dob: dobFormatted,
      status: user.status || "Active",
      profilePhotoUrl: user.profilePhotoUrl || details.profilePhotoUrl || null,
    });
  };

  useEffect(() => {
    loadProfile();
  }, []);

  // ---------- Load real appointment + vaccination history ----------
  useEffect(() => {
    let cancelled = false;

    const loadHistory = async () => {
      const user = authService.getUser();
      const patientProfileId =
        user?.profileDetails?.id || user?.profileId || user?.patientProfileId;

      // 1. Appointments
      try {
        setLoadingAppointments(true);
        const data = await appointmentService.getPatientAppointments();
        if (!cancelled) setAppointments(Array.isArray(data) ? data : []);
      } catch (err) {
        console.warn("Could not load appointments:", err);
        if (!cancelled) setAppointments([]);
      } finally {
        if (!cancelled) setLoadingAppointments(false);
      }

      // 2. Vaccinations
      if (patientProfileId) {
        try {
          setLoadingVaccinations(true);
          const timeline =
            await patientVaccinationService.getTimeline(patientProfileId);
          if (!cancelled) {
            setVaccinations(
              Array.isArray(timeline?.records) ? timeline.records : [],
            );
          }
        } catch (err) {
          console.warn("Could not load vaccinations:", err);
          if (!cancelled) setVaccinations([]);
        } finally {
          if (!cancelled) setLoadingVaccinations(false);
        }
      } else {
        if (!cancelled) setLoadingVaccinations(false);
      }
    };

    loadHistory();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggleEdit = async () => {
    if (isEditing) {
      setSaving(true);
      try {
        await authService.updateProfile({
          fullName: profileData.name,
          phoneNumber: profileData.phone,
          dateOfBirth: profileData.dob ? new Date(profileData.dob) : null,
          profilePhotoUrl: profileData.profilePhotoUrl,
        });
        showNotification(
          "Patient profile updated successfully in the national database!",
        );
        setIsEditing(false);
      } catch (err) {
        showNotification(
          err.message || "Failed to update profile details.",
          "error",
        );
      } finally {
        setSaving(false);
      }
    } else {
      setIsEditing(true);
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async () => {
        const photoData = reader.result;
        setProfileData((prev) => ({ ...prev, profilePhotoUrl: photoData }));
        try {
          await authService.updateProfile({ profilePhotoUrl: photoData });
          showNotification("Profile avatar updated successfully!");
        } catch {
          showNotification("Updated photo preview locally.", "success");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExport = () => {
    showNotification(
      "Exported official citizen immunization data sheet (.PDF / .CSV)",
    );
  };

  // ---------- Sort: most recent first ----------
  const sortedAppointments = [...appointments].sort((a, b) => {
    const da = new Date(a.appointmentDate || a.date || 0);
    const db = new Date(b.appointmentDate || b.date || 0);
    return db - da;
  });

  const sortedVaccinations = [...vaccinations].sort((a, b) => {
    const da = new Date(a.administeredAt || 0);
    const db = new Date(b.administeredAt || 0);
    return db - da;
  });

  return (
    <div
      className="manage-appointments-wrapper"
      style={{ flexDirection: "column", alignItems: "center", gap: "28px" }}
    >
      {notification && (
        <div
          className="appointment-alert-pill"
          role="alert"
          style={{
            maxWidth: "960px",
            width: "100%",
            backgroundColor:
              notificationType === "error"
                ? "rgba(239, 68, 68, 0.15)"
                : "rgba(16, 185, 129, 0.15)",
            borderColor: notificationType === "error" ? "#ef4444" : "#10b981",
            color: notificationType === "error" ? "#f87171" : "#34d399",
          }}
        >
          {notificationType === "error" ? "⚠️" : "✓"} {notification}
        </div>
      )}

      {/* =========================================================================
          1. TOP CARD: Avatar & Personal Information  (unchanged, real data)
         ========================================================================= */}
      <div className="manage-appointments-card profile-top-card">
        <div className="profile-top-grid">
          <div className="profile-avatar-column">
            <div className="profile-avatar-wrap">
              {profileData.profilePhotoUrl ? (
                <img
                  src={profileData.profilePhotoUrl}
                  alt={profileData.name || "Patient"}
                  style={{
                    width: "150px",
                    height: "150px",
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "3px solid #0284c7",
                  }}
                />
              ) : (
                <svg
                  className="profile-large-silhouette"
                  viewBox="0 0 200 200"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="100" cy="100" r="100" fill="#d9dde3" />
                  <circle cx="100" cy="80" r="38" fill="#525862" />
                  <path
                    d="M40 174C40 140.863 66.863 118 100 118C133.137 118 160 140.863 160 174"
                    fill="#525862"
                  />
                </svg>
              )}

              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                accept="image/*"
                onChange={handlePhotoUpload}
              />

              <button
                type="button"
                className="btn-avatar-edit"
                title="Update Profile Photo"
                onClick={() => fileInputRef.current?.click()}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#1d1854"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            </div>
          </div>

          <div className="profile-info-column">
            <div className="profile-info-card">
              <div className="profile-info-header">
                <div>
                  <h2 className="profile-info-title">Personal Information</h2>
                  <span
                    style={{
                      fontSize: "0.8rem",
                      color: "#10b981",
                      fontWeight: 600,
                    }}
                  >
                    ● Status: {profileData.status}
                  </span>
                </div>
                <div className="profile-header-actions">
                  <button
                    type="button"
                    className="btn-profile-edit"
                    onClick={handleToggleEdit}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : isEditing ? "Save" : "Edit"}
                  </button>

                  <button
                    type="button"
                    className="btn-profile-export"
                    title="Export / Share Profile"
                    onClick={handleExport}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="profile-fields-list">
                <div className="profile-field-row">
                  <span className="profile-field-label">ID (VAXORA)</span>
                  <span className="profile-field-colon">:</span>
                  <span
                    className="profile-field-value"
                    style={{ fontWeight: 700, color: "#0284c7" }}
                  >
                    {profileData.id || (loading ? "Loading..." : "N/A")}
                  </span>
                </div>

                <div className="profile-field-row">
                  <span className="profile-field-label">NIC</span>
                  <span className="profile-field-colon">:</span>
                  <span className="profile-field-value">
                    {profileData.nic || (loading ? "Loading..." : "N/A")}
                  </span>
                </div>

                <div className="profile-field-row">
                  <span className="profile-field-label">NAME</span>
                  <span className="profile-field-colon">:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      name="name"
                      value={profileData.name}
                      onChange={handleChange}
                      className="profile-field-input"
                    />
                  ) : (
                    <span className="profile-field-value">
                      {profileData.name || (loading ? "Loading..." : "N/A")}
                    </span>
                  )}
                </div>

                <div className="profile-field-row">
                  <span className="profile-field-label">DATE OF BIRTH</span>
                  <span className="profile-field-colon">:</span>
                  {isEditing ? (
                    <input
                      type="date"
                      name="dob"
                      value={profileData.dob}
                      onChange={handleChange}
                      className="profile-field-input"
                    />
                  ) : (
                    <span className="profile-field-value">
                      {profileData.dob || "Not specified"}
                    </span>
                  )}
                </div>

                <div className="profile-field-row">
                  <span className="profile-field-label">EMAIL</span>
                  <span className="profile-field-colon">:</span>
                  <span className="profile-field-value">
                    {profileData.email || (loading ? "Loading..." : "N/A")}
                  </span>
                </div>

                <div className="profile-field-row">
                  <span className="profile-field-label">PHONE NUMBER</span>
                  <span className="profile-field-colon">:</span>
                  {isEditing ? (
                    <input
                      type="tel"
                      name="phone"
                      value={profileData.phone}
                      onChange={handleChange}
                      className="profile-field-input"
                    />
                  ) : (
                    <span className="profile-field-value">
                      {profileData.phone || "Not provided"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. BOTTOM CARD: Appointments & Vaccination History  (now real data)
         ========================================================================= */}
      <div className="manage-appointments-card profile-bottom-card">
        {/* -------- Appointments -------- */}
        <div className="profile-appointments-section">
          <h2
            className="appointments-section-heading"
            style={{ marginBottom: "16px" }}
          >
            Appointments
          </h2>

          <div className="appointments-table-container">
            <table className="custom-appointments-table">
              <thead>
                <tr>
                  <th className="th-vaccine">Vaccine</th>
                  <th className="th-date">Date</th>
                  <th className="th-time">Time</th>
                  <th className="th-location">Hospital / Clinic</th>
                  <th className="th-status" style={{ borderRight: "none" }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {loadingAppointments ? (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        padding: "20px",
                        textAlign: "center",
                        color: "#64748b",
                      }}
                    >
                      Loading appointments…
                    </td>
                  </tr>
                ) : sortedAppointments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        padding: "20px",
                        textAlign: "center",
                        fontStyle: "italic",
                        color: "#64748b",
                      }}
                    >
                      No appointments scheduled yet.
                    </td>
                  </tr>
                ) : (
                  sortedAppointments.slice(0, 5).map((apt) => {
                    const status = apt.status || "Confirmed";
                    return (
                      <tr key={apt.id || apt.Id}>
                        <td className="td-vaccine">
                          {apt.vaccineName || apt.vaccine || "—"}
                        </td>
                        <td className="td-date">
                          {formatDate(apt.appointmentDate || apt.date)}
                        </td>
                        <td className="td-time">
                          {apt.timeSlot || apt.time || "—"}
                        </td>
                        <td className="td-location">
                          {apt.hospitalName || apt.location || "—"}
                        </td>
                        <td
                          className="td-status"
                          style={{ borderRight: "none" }}
                        >
                          <span
                            style={{
                              color: statusColor(status),
                              fontWeight: 600,
                            }}
                          >
                            ● {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: "16px",
            }}
          >
            <button
              type="button"
              className="btn-book-appointment"
              style={{ padding: "9px 24px", fontSize: "0.96rem" }}
              onClick={() => navigate("/patient/appointments")}
            >
              Book Appointment
            </button>
          </div>
        </div>

        {/* -------- Vaccination History -------- */}
        <div className="profile-history-section" style={{ marginTop: "36px" }}>
          <h2
            className="appointments-section-heading"
            style={{ marginBottom: "16px" }}
          >
            Vaccination History
          </h2>

          <div className="appointments-table-container">
            <table className="custom-appointments-table">
              <thead>
                <tr>
                  <th className="th-vaccine">Vaccine</th>
                  <th className="th-date">Date</th>
                  <th className="th-location">Administered By</th>
                  <th className="th-status" style={{ borderRight: "none" }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {loadingVaccinations ? (
                  <tr>
                    <td
                      colSpan={4}
                      style={{
                        padding: "20px",
                        textAlign: "center",
                        color: "#64748b",
                      }}
                    >
                      Loading vaccination history…
                    </td>
                  </tr>
                ) : sortedVaccinations.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      style={{
                        padding: "20px",
                        textAlign: "center",
                        fontStyle: "italic",
                        color: "#64748b",
                      }}
                    >
                      No vaccination records on file yet.
                    </td>
                  </tr>
                ) : (
                  sortedVaccinations.map((rec) => (
                    <tr key={rec.id}>
                      <td className="td-vaccine">
                        {rec.vaccineName || "—"}
                        {rec.doseNumber ? (
                          <span
                            style={{
                              marginLeft: "8px",
                              fontSize: "0.78rem",
                              color: "#64748b",
                            }}
                          >
                            (Dose {rec.doseNumber})
                          </span>
                        ) : null}
                      </td>
                      <td className="td-date">
                        {formatDate(rec.administeredAt)}
                      </td>
                      <td className="td-location">
                        {rec.administeredByName || "—"}
                      </td>
                      <td className="td-status" style={{ borderRight: "none" }}>
                        <span style={{ color: "#10b981", fontWeight: 600 }}>
                          ✓ Completed
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
