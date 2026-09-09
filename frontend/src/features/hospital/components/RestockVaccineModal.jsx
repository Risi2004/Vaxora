import React, { useState, useEffect } from 'react';

export default function RestockVaccineModal({
  isOpen,
  onClose,
  onAddStock,
  registeredVaccines = [],
  onRegisterNewVaccine,
}) {
  const defaultList = [
    'Pfizer-BioNTech Bivalent (mRNA)',
    'Moderna Spikevax mRNA-1273',
    'Influenza Quadrivalent (Seasonal)',
    'Hepatitis B Recombinant',
    'MMR (Measles, Mumps, Rubella)',
    'Tdap (Tetanus, Diphtheria, Pertussis)',
    'Rabies Inactivated Vaccine (Verorab)',
  ];

  const vaccineOptions = registeredVaccines.length > 0 ? registeredVaccines : defaultList;

  const [formData, setFormData] = useState({
    vaccineName: vaccineOptions[0] || 'Pfizer-BioNTech Bivalent (mRNA)',
    customVaccineName: '',
    lotNumber: 'PF-' + Math.floor(1000 + Math.random() * 9000),
    quantity: '200',
    expiryDate: '2027-04-30',
    storageUnit: 'Freezer Unit A (-70°C)',
    supplier: 'State Pharmaceuticals Corporation (SPC) / MOH',
  });

  const [isCustomMode, setIsCustomMode] = useState(false);

  useEffect(() => {
    if (vaccineOptions.length > 0 && !isCustomMode) {
      setFormData((prev) => ({
        ...prev,
        vaccineName: prev.vaccineName || vaccineOptions[0],
      }));
    }
  }, [vaccineOptions, isCustomMode]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'vaccineName') {
      if (value === '__custom__') {
        setIsCustomMode(true);
        setFormData((prev) => ({ ...prev, vaccineName: '' }));
      } else {
        setIsCustomMode(false);
        setFormData((prev) => ({ ...prev, vaccineName: value, customVaccineName: '' }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalName = isCustomMode
      ? formData.customVaccineName.trim()
      : formData.vaccineName.trim();

    if (!finalName) {
      alert('Please select or enter a valid vaccine product name.');
      return;
    }

    if (!formData.lotNumber || !formData.quantity) {
      alert('Please fill the Lot Number and Quantity.');
      return;
    }

    // Register new vaccine name if not already present
    if (isCustomMode && onRegisterNewVaccine) {
      onRegisterNewVaccine(finalName);
    }

    onAddStock({
      vaccineName: finalName,
      lotNumber: formData.lotNumber,
      quantity: parseInt(formData.quantity, 10),
      storageUnit: formData.storageUnit,
      expiryDate: formData.expiryDate,
      supplier: formData.supplier,
    });

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="hospital-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 style={{ margin: 0 }}>Log Vaccine Restock Shipment</h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
              Select from hospital-registered vaccine formulations or enter a new product name.
            </p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Vaccine Product Selection */}
            <div className="modal-form-group">
              <label className="modal-label">Vaccine Product Formulation *</label>
              {!isCustomMode ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    name="vaccineName"
                    value={formData.vaccineName}
                    onChange={handleChange}
                    className="modal-select"
                    style={{ flex: 1 }}
                  >
                    {vaccineOptions.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                    <option value="__custom__">✨ + Enter a New Vaccine Product Name...</option>
                  </select>
                  <button
                    type="button"
                    className="btn-quick-adjust btn-adjust-plus"
                    onClick={() => {
                      setIsCustomMode(true);
                      setFormData((prev) => ({ ...prev, vaccineName: '' }));
                    }}
                    title="Type a new vaccine name"
                    style={{ padding: '0 14px', fontSize: '0.82rem' }}
                  >
                    + New
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      name="customVaccineName"
                      value={formData.customVaccineName}
                      onChange={handleChange}
                      placeholder="e.g. Sinopharm BBIBP-CorV or AstraZeneca Vaxzevria"
                      required
                      className="modal-input"
                      style={{ flex: 1, borderColor: '#19469d' }}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="btn-quick-adjust btn-adjust-minus"
                      onClick={() => {
                        setIsCustomMode(false);
                        setFormData((prev) => ({
                          ...prev,
                          vaccineName: vaccineOptions[0] || 'Pfizer-BioNTech Bivalent (mRNA)',
                        }));
                      }}
                      title="Back to registered list"
                      style={{ padding: '0 12px', fontSize: '0.8rem' }}
                    >
                      Back to list
                    </button>
                  </div>
                  <span style={{ fontSize: '0.76rem', color: '#2563eb' }}>
                    💡 This new vaccine name will be saved in your hospital formulations registry.
                  </span>
                </div>
              )}
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
                  min="1"
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
                placeholder="e.g. State Pharmaceuticals Corporation (SPC) / MOH"
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
