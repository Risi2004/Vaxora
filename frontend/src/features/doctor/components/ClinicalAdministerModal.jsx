import React, { useState } from 'react';

export default function ClinicalAdministerModal({ isOpen, onClose, patient, onCertify }) {
  if (!isOpen || !patient) return null;

  const [formData, setFormData] = useState({
    lotNumber: 'HB-8821',
    injectionSite: 'Left Deltoid',
    route: 'Intramuscular (IM)',
    dosage: '1.0 mL (Adult Formulation)',
    notes: 'Pre-screening completed. Patient informed of minor localized injection site tenderness.',
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
        <div className="doctor-modal-header">
          <div>
            <h3 className="doctor-modal-title">Clinical Administration &amp; Certification</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)' }}>
              Record administration &amp; issue national vaccination digital pass
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
              background: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              borderRadius: '12px',
              padding: '14px 18px',
              marginBottom: '18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span className="doctor-token-pill">{patient.token}</span>
                <span style={{ fontWeight: 800, color: '#1e1b4b', fontSize: '1.05rem', marginLeft: '10px' }}>
                  {patient.name}
                </span>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '3px' }}>
                  NIC: {patient.nic} • Age: {patient.age} yrs ({patient.gender})
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.78rem', color: '#166534', fontWeight: 700, background: '#dcfce7', padding: '3px 8px', borderRadius: '6px' }}>
                  {patient.vaccine}
                </span>
                <div style={{ fontSize: '0.78rem', color: '#15803d', marginTop: '4px' }}>
                  {patient.dose}
                </div>
              </div>
            </div>

            {/* Vaccine Lot & Dosage */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="doctor-form-group">
                <label className="doctor-form-label">Vaccine Lot / Batch #</label>
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
                <label className="doctor-form-label">Dosage &amp; Volume</label>
                <input
                  type="text"
                  className="doctor-form-input"
                  value={formData.dosage}
                  onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                  required
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
            <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', padding: '12px 14px', margin: '14px 0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', fontWeight: 600, color: '#065f46', cursor: 'pointer', marginBottom: '8px' }}>
                <input
                  type="checkbox"
                  checked={formData.consentConfirmed}
                  onChange={(e) => setFormData({ ...formData, consentConfirmed: e.target.checked })}
                />
                Informed patient consent confirmed &amp; no acute fever/contraindications
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', fontWeight: 600, color: '#065f46', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.vitalsConfirmed}
                  onChange={(e) => setFormData({ ...formData, vitalsConfirmed: e.target.checked })}
                />
                Pre-administration vitals verified (BP, pulse, temp within normal range)
              </label>
            </div>

            {/* Doctor Clinical Notes */}
            <div className="doctor-form-group">
              <label className="doctor-form-label">Clinical Observations &amp; Advice</label>
              <textarea
                className="doctor-form-textarea"
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Enter any specific clinical remarks, guidance, or observation notes..."
              />
            </div>
          </div>

          <div className="doctor-modal-footer">
            <button type="button" className="doctor-btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="doctor-btn-submit">
              💉 Certify &amp; Transfer to Observation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
