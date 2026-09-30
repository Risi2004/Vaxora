import React, { useEffect, useState } from 'react';

const FALLBACK_VACCINES = [
  'Pfizer-BioNTech Bivalent',
  'Moderna Spikevax',
  'Influenza Quadrivalent',
  'Hepatitis B Recombinant',
  'MMR (Measles, Mumps, Rubella)',
  'Tdap (Tetanus, Diphtheria, Pertussis)',
];

const DOSE_OPTIONS = [
  'Dose 1 (Primary)',
  'Dose 2 (Primary)',
  'Booster Dose (3)',
  'Annual Booster',
];

export default function WalkInRegistrationModal({
  isOpen,
  onClose,
  onAddPatient,
  vaccines = [],
  booths = [],
}) {
  const vaccineOptions = vaccines.length > 0 ? vaccines : FALLBACK_VACCINES;
  const boothOptions = booths.length > 0
    ? booths
    : [{ id: 'default', label: 'Unassigned booth' }];

  const [formData, setFormData] = useState({
    patientName: '',
    nic: '',
    gender: 'Male',
    age: '',
    vaccine: vaccineOptions[0] || '',
    dose: DOSE_OPTIONS[0],
    assignedBooth: boothOptions[0]?.label || '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setFormData((prev) => ({
      ...prev,
      vaccine: vaccineOptions.includes(prev.vaccine) ? prev.vaccine : (vaccineOptions[0] || ''),
      assignedBooth: boothOptions.some((b) => b.label === prev.assignedBooth)
        ? prev.assignedBooth
        : (boothOptions[0]?.label || ''),
    }));
  }, [isOpen, vaccineOptions.join('|'), boothOptions.map((b) => b.label).join('|')]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.patientName || !formData.nic || submitting) return;

    setSubmitting(true);
    setError('');
    try {
      await onAddPatient({
        patientName: formData.patientName.trim(),
        patientNic: formData.nic.trim(),
        vaccineName: formData.vaccine,
        dose: formData.dose,
        boothLabel: formData.assignedBooth,
        age: formData.age ? Number(formData.age) : null,
        gender: formData.gender,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to register walk-in patient.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="hospital-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Register Walk-In Patient</h3>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div
                role="alert"
                style={{
                  marginBottom: '12px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid #ef4444',
                  color: '#b91c1c',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}
              >
                {error}
              </div>
            )}

            <div className="modal-form-group">
              <label className="modal-label">Full Name *</label>
              <input
                type="text"
                name="patientName"
                value={formData.patientName}
                onChange={handleChange}
                placeholder="e.g. Kasun Chamara"
                required
                className="modal-input"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="modal-form-group">
                <label className="modal-label">NIC / National ID *</label>
                <input
                  type="text"
                  name="nic"
                  value={formData.nic}
                  onChange={handleChange}
                  placeholder="Registered Vaxora patient NIC"
                  required
                  className="modal-input"
                />
              </div>

              <div className="modal-form-group">
                <label className="modal-label">Age / Gender</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    placeholder="Age"
                    className="modal-input"
                  />
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="modal-select"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="modal-form-group">
              <label className="modal-label">Vaccine Formulation</label>
              <select
                name="vaccine"
                value={formData.vaccine}
                onChange={handleChange}
                className="modal-select"
              >
                {vaccineOptions.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="modal-form-group">
                <label className="modal-label">Dose Sequence</label>
                <select
                  name="dose"
                  value={formData.dose}
                  onChange={handleChange}
                  className="modal-select"
                >
                  {DOSE_OPTIONS.map((dose) => (
                    <option key={dose} value={dose}>{dose}</option>
                  ))}
                </select>
              </div>

              <div className="modal-form-group">
                <label className="modal-label">Assign to Booth</label>
                <select
                  name="assignedBooth"
                  value={formData.assignedBooth}
                  onChange={handleChange}
                  className="modal-select"
                >
                  {boothOptions.map((booth) => (
                    <option key={booth.id} value={booth.label}>{booth.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-modal-cancel" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-modal-submit" disabled={submitting}>
              {submitting ? 'Saving...' : '+ Enqueue Walk-In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
