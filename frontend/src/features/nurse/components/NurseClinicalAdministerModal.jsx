import React, { useState } from 'react';

export default function NurseClinicalAdministerModal({ isOpen, onClose, patient, onCertify }) {
  if (!isOpen || !patient) return null;

  const [formData, setFormData] = useState({
    lotNumber: 'HB-8821',
    injectionSite: 'Left Deltoid',
    route: 'Intramuscular (IM)',
    dosage: patient.dose || '1.0 mL (Physician Prescribed)',
    notes: 'Pre-vaccination triage completed. Patient afebrile. Prescribed dose verified by nurse.',
    consentConfirmed: true,
    vitalsConfirmed: true,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.consentConfirmed || !formData.vitalsConfirmed) {
      alert('Please confirm informed consent and pre-vaccination vitals checklist.');
      return;
    }
    onCertify({
      ...patient,
      administrationDetails: formData,
      administeredAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
    onClose();
  };

  return (
    <div className="doctor-modal-overlay" onClick={onClose}>
      <div className="doctor-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="doctor-modal-header" style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' }}>
          <div>
            <h3 className="doctor-modal-title">Clinical Administration &amp; Verification</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'rgba(255,255,255,0.9)' }}>
              Nurse Immunization Record • National Vaccine Registry
            </p>
          </div>
          <button type="button" className="doctor-modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="doctor-modal-body">
            {/* Patient Spotlight Box */}
            <div style={{
              background: '#f0f9ff',
              border: '1.5px solid #bae6fd',
              borderRadius: '12px',
              padding: '14px 18px',
              marginBottom: '18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span className="doctor-token-pill">{patient.token}</span>
                <span style={{ fontWeight: 800, color: '#0c4a6e', fontSize: '1.05rem', marginLeft: '10px' }}>
                  {patient.name}
                </span>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '3px' }}>
                  NIC: {patient.nic} • Age: {patient.age} yrs ({patient.gender})
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.78rem', color: '#0369a1', fontWeight: 700, background: '#e0f2fe', padding: '3px 8px', borderRadius: '6px' }}>
                  {patient.vaccine}
                </span>
                <div style={{ fontSize: '0.78rem', color: '#0284c7', marginTop: '4px', fontWeight: 600 }}>
                  Prescribed: {patient.dose}
                </div>
              </div>
            </div>

            {/* Vaccine Lot & Dosage */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="doctor-form-group">
                <label className="doctor-form-label">Cold-Box Lot / Batch #</label>
                <select
                  className="doctor-form-select"
                  value={formData.lotNumber}
                  onChange={(e) => setFormData({ ...formData, lotNumber: e.target.value })}
                >
                  <option value="HB-8821">Lot #HB-8821 (Exp: Nov 2027)</option>
                  <option value="PF-9082">Lot #PF-9082 (Exp: Oct 2027)</option>
                  <option value="MD-4419">Lot #MD-4419 (Exp: Aug 2027)</option>
                  <option value="INF-7012">Lot #INF-7012 (Exp: May 2027)</option>
                </select>
              </div>

              <div className="doctor-form-group">
                <label className="doctor-form-label">Prescribed Dosage (Doctor Approved)</label>
                <input
                  type="text"
                  className="doctor-form-input readonly-dosage-input"
                  value={formData.dosage}
                  readOnly
                  title="Prescribed by physician"
                />
              </div>
            </div>

            {/* Injection Site & Route */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="doctor-form-group">
                <label className="doctor-form-label">Injection Anatomical Site</label>
                <select
                  className="doctor-form-select"
                  value={formData.injectionSite}
                  onChange={(e) => setFormData({ ...formData, injectionSite: e.target.value })}
                >
                  <option value="Left Deltoid">Left Deltoid (Upper Arm)</option>
                  <option value="Right Deltoid">Right Deltoid (Upper Arm)</option>
                  <option value="Left Anterolateral Thigh">Left Anterolateral Thigh</option>
                  <option value="Right Anterolateral Thigh">Right Anterolateral Thigh</option>
                </select>
              </div>

              <div className="doctor-form-group">
                <label className="doctor-form-label">Administration Route</label>
                <select
                  className="doctor-form-select"
                  value={formData.route}
                  onChange={(e) => setFormData({ ...formData, route: e.target.value })}
                >
                  <option value="Intramuscular (IM)">Intramuscular (IM)</option>
                  <option value="Subcutaneous (SC)">Subcutaneous (SC)</option>
                  <option value="Intradermal (ID)">Intradermal (ID)</option>
                  <option value="Oral (PO)">Oral (PO)</option>
                </select>
              </div>
            </div>

            {/* Pre-Screening Checkboxes */}
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px 14px', margin: '14px 0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', fontWeight: 600, color: '#166534', cursor: 'pointer', marginBottom: '8px' }}>
                <input
                  type="checkbox"
                  checked={formData.consentConfirmed}
                  onChange={(e) => setFormData({ ...formData, consentConfirmed: e.target.checked })}
                />
                Informed patient consent verified &amp; physician order confirmed
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', fontWeight: 600, color: '#166534', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.vitalsConfirmed}
                  onChange={(e) => setFormData({ ...formData, vitalsConfirmed: e.target.checked })}
                />
                Pre-administration vitals checked (BP, Temp, Pulse stable)
              </label>
            </div>

            {/* Nurse Notes */}
            <div className="doctor-form-group">
              <label className="doctor-form-label">Nurse Observation Notes</label>
              <textarea
                className="doctor-form-textarea"
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Enter nursing observations, site reaction checks, or care instructions..."
              />
            </div>
          </div>

          <div className="doctor-modal-footer">
            <button type="button" className="doctor-btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="doctor-btn-submit" style={{ background: '#0284c7' }}>
              💉 Confirm Dose &amp; Transfer to Observation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
