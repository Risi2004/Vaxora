import React, { useState } from 'react';

export default function WalkInRegistrationModal({ isOpen, onClose, onAddPatient }) {
  const [formData, setFormData] = useState({
    patientName: '',
    nic: '',
    gender: 'Male',
    age: '',
    vaccine: 'Pfizer-BioNTech Bivalent',
    dose: 'Booster Dose (3)',
    assignedBooth: 'Booth 01 - General OPD',
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.patientName || !formData.nic) return;

    onAddPatient({
      id: Date.now(),
      token: `T-${Math.floor(100 + Math.random() * 900)}`,
      name: formData.patientName,
      nic: formData.nic,
      vaccine: formData.vaccine,
      dose: formData.dose,
      booth: formData.assignedBooth.split(' - ')[0],
      doctor: 'Dr. Samantha Perera',
      time: 'Just now',
      status: 'waiting',
    });

    onClose();
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
                  placeholder="e.g. 199245102830"
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
                <option value="Pfizer-BioNTech Bivalent">Pfizer-BioNTech Bivalent (mRNA)</option>
                <option value="Moderna Spikevax">Moderna Spikevax</option>
                <option value="Influenza Quadrivalent">Influenza Quadrivalent (Fluarix)</option>
                <option value="Hepatitis B Recombinant">Hepatitis B Recombinant</option>
                <option value="MMR (Measles, Mumps, Rubella)">MMR Vaccine</option>
                <option value="Tdap (Tetanus, Diphtheria, Pertussis)">Tdap Vaccine</option>
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
                  <option value="Dose 1 (Primary)">Dose 1 (Primary)</option>
                  <option value="Dose 2 (Primary)">Dose 2 (Primary)</option>
                  <option value="Booster Dose (3)">Booster Dose (3)</option>
                  <option value="Annual Booster">Annual Routine Booster</option>
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
                  <option value="Booth 01 - General OPD">Booth 01 (Dr. Samantha)</option>
                  <option value="Booth 02 - Pediatric Center">Booth 02 (Dr. Nimal)</option>
                  <option value="Booth 03 - Fast Track">Booth 03 (Nurse Anoma)</option>
                  <option value="Booth 04 - Immunization Room">Booth 04 (Nurse Dilani)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-modal-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-modal-submit">
              + Generate Token &amp; Enqueue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
