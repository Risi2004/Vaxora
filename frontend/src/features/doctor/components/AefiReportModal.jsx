import React, { useState } from 'react';

export default function AefiReportModal({ isOpen, onClose, onSubmitReport }) {
  if (!isOpen) return null;

  const [aefiData, setAefiData] = useState({
    patientToken: 'T-102',
    patientName: 'Nadeeka Priyadarshani',
    vaccineName: 'Influenza (Quadrivalent)',
    reactionType: 'Mild Urticaria & Localized Erythema',
    severity: 'Mild',
    timeElapsed: '8 minutes post-vaccination',
    treatmentGiven: 'Oral Cetirizine 10mg administered. Patient resting comfortably in observation unit.',
    notifyMOH: true,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmitReport(aefiData);
    onClose();
  };

  return (
    <div className="doctor-modal-overlay" onClick={onClose}>
      <div className="doctor-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="doctor-modal-header" style={{ background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)' }}>
          <div>
            <h3 className="doctor-modal-title">⚠️ Report Adverse Event (AEFI)</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'rgba(255,255,255,0.9)' }}>
              National Immunization Safety &amp; Epidemiological Surveillance
            </p>
          </div>
          <button type="button" className="doctor-modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="doctor-modal-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="doctor-form-group">
                <label className="doctor-form-label">Patient Token / ID</label>
                <input
                  type="text"
                  className="doctor-form-input"
                  value={aefiData.patientToken}
                  onChange={(e) => setAefiData({ ...aefiData, patientToken: e.target.value })}
                  required
                />
              </div>

              <div className="doctor-form-group">
                <label className="doctor-form-label">Patient Full Name</label>
                <input
                  type="text"
                  className="doctor-form-input"
                  value={aefiData.patientName}
                  onChange={(e) => setAefiData({ ...aefiData, patientName: e.target.value })}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="doctor-form-group">
                <label className="doctor-form-label">Suspected Vaccine</label>
                <input
                  type="text"
                  className="doctor-form-input"
                  value={aefiData.vaccineName}
                  onChange={(e) => setAefiData({ ...aefiData, vaccineName: e.target.value })}
                  required
                />
              </div>

              <div className="doctor-form-group">
                <label className="doctor-form-label">Severity Level</label>
                <select
                  className="doctor-form-select"
                  value={aefiData.severity}
                  onChange={(e) => setAefiData({ ...aefiData, severity: e.target.value })}
                >
                  <option value="Mild">Mild (Rash, Local swelling, Dizziness)</option>
                  <option value="Moderate">Moderate (Extensive hives, Pyrexia, Syncope)</option>
                  <option value="Severe">Severe (Anaphylaxis, Respiratory Distress)</option>
                </select>
              </div>
            </div>

            <div className="doctor-form-group">
              <label className="doctor-form-label">Symptoms &amp; Clinical Signs</label>
              <input
                type="text"
                className="doctor-form-input"
                value={aefiData.reactionType}
                onChange={(e) => setAefiData({ ...aefiData, reactionType: e.target.value })}
                required
              />
            </div>

            <div className="doctor-form-group">
              <label className="doctor-form-label">Immediate Clinical Action &amp; Treatment Given</label>
              <textarea
                className="doctor-form-textarea"
                rows={3}
                value={aefiData.treatmentGiven}
                onChange={(e) => setAefiData({ ...aefiData, treatmentGiven: e.target.value })}
                required
              />
            </div>

            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 14px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', fontWeight: 600, color: '#991b1b', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={aefiData.notifyMOH}
                  onChange={(e) => setAefiData({ ...aefiData, notifyMOH: e.target.checked })}
                />
                Automatically notify Ministry of Health (MOH) Surveillance Unit
              </label>
            </div>
          </div>

          <div className="doctor-modal-footer">
            <button type="button" className="doctor-btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="doctor-btn-submit danger">
              ⚠️ Log AEFI &amp; Dispatch Alert
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
