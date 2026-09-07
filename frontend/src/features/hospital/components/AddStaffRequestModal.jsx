import React, { useState } from 'react';

export default function AddStaffRequestModal({ isOpen, onClose, onSendRequest }) {
  const [formData, setFormData] = useState({
    role: 'Doctor',
    identifierType: 'name', // 'name' | 'id'
    doctorName: '',
    vaxoraId: '',
    department: 'Immunization Clinic & OPD',
    message: 'Official invitation from National Healthcare General Hospital to join our medical immunization team.',
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.doctorName && !formData.vaxoraId) {
      alert('Please enter either a Doctor/Nurse Name or a Vaxora ID.');
      return;
    }

    const displayName =
      formData.doctorName ||
      (formData.role === 'Doctor' ? `Dr. (ID: ${formData.vaxoraId})` : `Nurse (ID: ${formData.vaxoraId})`);

    onSendRequest({
      id: Date.now(),
      name: displayName,
      role: formData.role,
      vaxoraId: formData.vaxoraId || `VX-${formData.role === 'Doctor' ? 'DOC' : 'NUR'}-${Math.floor(1000 + Math.random() * 9000)}`,
      specialty: formData.department,
      license: formData.role === 'Doctor' ? 'SLMC-Pending' : 'SLNC-Pending',
      booth: 'Unassigned (Pending)',
      status: 'Pending Request',
      administeredToday: 0,
      avatar: formData.role === 'Doctor' ? '👨‍⚕️' : '👩‍⚕️',
      dateSent: 'Just now',
    });

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="hospital-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ margin: 0 }}>Add New Staff</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '3px 0 0' }}>
              Send an affiliation request to a registered Doctor or Nurse
            </p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Staff Role Selection */}
            <div className="modal-form-group">
              <label className="modal-label">Staff Role *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  className={`hospital-nav-btn ${formData.role === 'Doctor' ? 'active' : ''}`}
                  onClick={() => setFormData((prev) => ({ ...prev, role: 'Doctor' }))}
                  style={{
                    justifyContent: 'center',
                    border: '1.5px solid #cbd5e1',
                    background: formData.role === 'Doctor' ? '#19469d' : '#ffffff',
                    color: formData.role === 'Doctor' ? '#ffffff' : '#1d1854',
                    padding: '9px',
                  }}
                >
                  👨‍⚕️ Doctor
                </button>
                <button
                  type="button"
                  className={`hospital-nav-btn ${formData.role === 'Nurse' ? 'active' : ''}`}
                  onClick={() => setFormData((prev) => ({ ...prev, role: 'Nurse' }))}
                  style={{
                    justifyContent: 'center',
                    border: '1.5px solid #cbd5e1',
                    background: formData.role === 'Nurse' ? '#19469d' : '#ffffff',
                    color: formData.role === 'Nurse' ? '#ffffff' : '#1d1854',
                    padding: '9px',
                  }}
                >
                  👩‍⚕️ Nurse
                </button>
              </div>
            </div>

            {/* Doctor/Nurse Name Field */}
            <div className="modal-form-group">
              <label className="modal-label">
                {formData.role} Name
              </label>
              <input
                type="text"
                name="doctorName"
                value={formData.doctorName}
                onChange={handleChange}
                placeholder={formData.role === 'Doctor' ? 'e.g. Dr. Kasun Chamara' : 'e.g. Nurse Menaka Silva'}
                className="modal-input"
              />
            </div>

            {/* Vaxora ID Field */}
            <div className="modal-form-group">
              <label className="modal-label">
                {formData.role} Vaxora ID
              </label>
              <input
                type="text"
                name="vaxoraId"
                value={formData.vaxoraId}
                onChange={handleChange}
                placeholder={formData.role === 'Doctor' ? 'e.g. VX-DOC-49210 or VD123456' : 'e.g. VX-NUR-88120 or VN123456'}
                className="modal-input"
              />
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Enter either the practitioner's official name or their unique Vaxora ID.
              </span>
            </div>

            {/* Department / Unit */}
            <div className="modal-form-group">
              <label className="modal-label">Assigned Department / Unit</label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="modal-select"
              >
                <option value="Immunization Clinic & OPD">Immunization Clinic &amp; OPD</option>
                <option value="Pediatric Care & Maternal Health">Pediatric Care &amp; Maternal Health</option>
                <option value="General Medicine">General Medicine</option>
                <option value="Infectious Diseases & Epidemiology">Infectious Diseases &amp; Epidemiology</option>
                <option value="Emergency & Fast Track">Emergency &amp; Fast Track</option>
              </select>
            </div>

            {/* Request Message */}
            <div className="modal-form-group">
              <label className="modal-label">Invitation Message (Optional)</label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows="2"
                className="modal-input"
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-modal-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-modal-submit" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>✉️</span> Send Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
