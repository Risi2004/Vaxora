import React, { useState } from 'react';

export default function RestockVaccineModal({ isOpen, onClose, onAddStock }) {
  const [formData, setFormData] = useState({
    vaccineName: 'Pfizer-BioNTech Bivalent',
    lotNumber: 'PF-' + Math.floor(1000 + Math.random() * 9000),
    quantity: '200',
    expiryDate: '2027-04-30',
    storageUnit: 'Freezer Unit A (-70°C)',
    supplier: 'State Pharmaceuticals Corporation (SPC) / MOH',
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.lotNumber || !formData.quantity) return;

    onAddStock({
      vaccineName: formData.vaccineName,
      lotNumber: formData.lotNumber,
      quantity: parseInt(formData.quantity, 10),
    });

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="hospital-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Log Vaccine Restock Shipment</h3>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="modal-form-group">
              <label className="modal-label">Vaccine Product *</label>
              <select
                name="vaccineName"
                value={formData.vaccineName}
                onChange={handleChange}
                className="modal-select"
              >
                <option value="Pfizer-BioNTech Bivalent">Pfizer-BioNTech Bivalent</option>
                <option value="Moderna Spikevax">Moderna Spikevax</option>
                <option value="Influenza Quadrivalent">Influenza Quadrivalent</option>
                <option value="Hepatitis B Recombinant">Hepatitis B Recombinant</option>
                <option value="MMR (Measles, Mumps, Rubella)">MMR Vaccine</option>
                <option value="Tdap Vaccine">Tdap Vaccine</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="modal-form-group">
                <label className="modal-label">Batch / Lot Number *</label>
                <input
                  type="text"
                  name="lotNumber"
                  value={formData.lotNumber}
                  onChange={handleChange}
                  placeholder="e.g. PF-9921"
                  required
                  className="modal-input"
                />
              </div>

              <div className="modal-form-group">
                <label className="modal-label">Quantity Received (Vials) *</label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  placeholder="e.g. 250"
                  required
                  className="modal-input"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="modal-form-group">
                <label className="modal-label">Expiry Date</label>
                <input
                  type="date"
                  name="expiryDate"
                  value={formData.expiryDate}
                  onChange={handleChange}
                  className="modal-input"
                />
              </div>

              <div className="modal-form-group">
                <label className="modal-label">Assigned Cold Vault</label>
                <select
                  name="storageUnit"
                  value={formData.storageUnit}
                  onChange={handleChange}
                  className="modal-select"
                >
                  <option value="Freezer Unit A (-70°C)">Ultra-Cold Vault A (-70°C)</option>
                  <option value="Chiller Unit B (2-8°C)">Chiller Unit B (2°C - 8°C)</option>
                  <option value="Mobile Chiller C">Mobile Deployment Chiller C</option>
                </select>
              </div>
            </div>

            <div className="modal-form-group">
              <label className="modal-label">Authorized Supplier / Batch Dispatch</label>
              <input
                type="text"
                name="supplier"
                value={formData.supplier}
                onChange={handleChange}
                className="modal-input"
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-modal-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-modal-submit">
              + Commit Shipment to Cold Chain
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
