import React, { useEffect, useState } from 'react';

const emptyReport = {
  patientToken: '',
  patientName: '',
  vaccineName: '',
  reactionType: '',
  severity: 'Mild',
  timeElapsed: '',
  treatmentGiven: '',
  notifyDoctor: true,
  notifyMOH: true,
};

export default function NurseAefiReportModal({ isOpen, onClose, onSubmitReport, patient }) {
  const [aefiData, setAefiData] = useState(emptyReport);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Prefill identifiers from the patient in the chair; the nurse describes the event.
  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setSubmitting(false);
    setAefiData({
      ...emptyReport,
      patientToken: patient?.token || '',
      patientName: patient?.name || '',
      vaccineName: patient?.vaccine && patient.vaccine !== '—' ? patient.vaccine : '',
    });
  }, [isOpen, patient?.id, patient?.token, patient?.name, patient?.vaccine]);

  if (!isOpen) return null;

  const handleSeverityChange = (value) => {
    setAefiData((prev) => ({
      ...prev,
      severity: value,
      notifyMOH: value === 'Severe' ? true : prev.notifyMOH,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!patient?.id) {
      setError('Select an active patient before reporting AEFI.');
      return;
    }
    if (!String(aefiData.treatmentGiven || '').trim()) {
      setError('Immediate nursing action / emergency care is required.');
      return;
    }

    const payload = {
      ...aefiData,
      notifyMOH: aefiData.severity === 'Severe' ? true : aefiData.notifyMOH,
    };

    try {
      setSubmitting(true);
      await onSubmitReport(payload);
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to submit AEFI report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="doctor-modal-overlay" onClick={submitting ? undefined : onClose}>
      <div className="doctor-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="doctor-modal-header" style={{ background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)' }}>
          <div>
            <h3 className="doctor-modal-title">Report Adverse Event (AEFI)</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'rgba(255,255,255,0.9)' }}>
              Capture care, document on dose, alert physician &amp; MOH
            </p>
          </div>
          <button type="button" className="doctor-modal-close-btn" onClick={onClose} disabled={submitting}>
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
                  readOnly={Boolean(patient?.token)}
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
                  readOnly={Boolean(patient?.name)}
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
                  readOnly={Boolean(patient?.vaccine && patient.vaccine !== '—')}
                />
              </div>

              <div className="doctor-form-group">
                <label className="doctor-form-label">Severity Level</label>
                <select
                  className="doctor-form-select"
                  value={aefiData.severity}
                  onChange={(e) => handleSeverityChange(e.target.value)}
                  disabled={submitting}
                >
                  <option value="Mild">Mild (Rash, Local swelling, Dizziness)</option>
                  <option value="Moderate">Moderate (Extensive hives, Pyrexia, Syncope)</option>
                  <option value="Severe">Severe (Anaphylaxis, Respiratory Distress)</option>
                </select>
              </div>
            </div>

            <div className="doctor-form-group">
              <label className="doctor-form-label">Observed Symptoms &amp; Reactions</label>
              <input
                type="text"
                className="doctor-form-input"
                value={aefiData.reactionType}
                onChange={(e) => setAefiData({ ...aefiData, reactionType: e.target.value })}
                required
                disabled={submitting}
              />
            </div>

            <div className="doctor-form-group">
              <label className="doctor-form-label">Immediate Nursing Action &amp; Emergency Care</label>
              <textarea
                className="doctor-form-textarea"
                rows={3}
                value={aefiData.treatmentGiven}
                onChange={(e) => setAefiData({ ...aefiData, treatmentGiven: e.target.value })}
                required
                disabled={submitting}
                placeholder="e.g. Called physician, adrenaline prepared, airway supported…"
              />
            </div>

            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 14px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', fontWeight: 600, color: '#991b1b', cursor: 'pointer', marginBottom: '6px' }}>
                <input
                  type="checkbox"
                  checked={aefiData.notifyDoctor}
                  onChange={(e) => setAefiData({ ...aefiData, notifyDoctor: e.target.checked })}
                  disabled={submitting}
                />
                Urgent alert to attending physician
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', fontWeight: 600, color: '#991b1b', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={aefiData.severity === 'Severe' ? true : aefiData.notifyMOH}
                  onChange={(e) => setAefiData({ ...aefiData, notifyMOH: e.target.checked })}
                  disabled={submitting || aefiData.severity === 'Severe'}
                />
                Forward report to Ministry of Health (MOH) Surveillance Unit
                {aefiData.severity === 'Severe' ? ' (required for Severe)' : ''}
              </label>
            </div>

            {error ? (
              <p style={{ margin: '12px 0 0', color: '#b91c1c', fontSize: '0.85rem' }}>{error}</p>
            ) : null}
          </div>

          <div className="doctor-modal-footer">
            <button type="button" className="doctor-btn-cancel" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="submit"
              className="doctor-btn-submit danger"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              disabled={submitting || !patient?.id}
            >
              {submitting ? 'Saving…' : 'Dispatch Emergency AEFI Alert'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
