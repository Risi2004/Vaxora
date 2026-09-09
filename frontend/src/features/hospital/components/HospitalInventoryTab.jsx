import React, { useState, useMemo } from 'react';
import RestockVaccineModal from './RestockVaccineModal';
import VaccineWastageModal from './VaccineWastageModal';
import BatchAuditModal from './BatchAuditModal';

export default function HospitalInventoryTab() {
  // Modal states
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [isWastageOpen, setIsWastageOpen] = useState(false);
  const [selectedAuditVaccine, setSelectedAuditVaccine] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // Hospital Registered Vaccine Formulations Registry
  const [registeredVaccines, setRegisteredVaccines] = useState([
    'Pfizer-BioNTech Bivalent (mRNA)',
    'Moderna Spikevax mRNA-1273',
    'Influenza Quadrivalent (Seasonal)',
    'Hepatitis B Recombinant',
    'MMR (Measles, Mumps, Rubella)',
    'Tdap (Tetanus, Diphtheria, Pertussis)',
    'Rabies Inactivated Vaccine (Verorab)',
  ]);

  // Quick Inline Vaccine Registration input
  const [newVaccineInput, setNewVaccineInput] = useState('');
  const [newVaccineMfrInput, setNewVaccineMfrInput] = useState('');
  const [showRegistryBox, setShowRegistryBox] = useState(true);

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'low' | 'sufficient' | 'expiring' | 'ultracold'
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | 'mrna' | 'routine' | 'seasonal' | 'pediatric'
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'

  // Primary Inventory State
  const [inventory, setInventory] = useState([
    {
      id: 1,
      name: 'Pfizer-BioNTech Bivalent (mRNA)',
      manufacturer: 'Pfizer Inc. & BioNTech',
      category: 'mrna',
      lotNumber: 'PF-9082',
      available: 1420,
      capacity: 1800,
      minThreshold: 400,
      dosesPerVial: 6,
      expiry: '2027-10-15',
      expiryStatus: 'healthy',
      temp: '-75°C Ultra Cold',
      storageUnit: 'Ultra-Cold Vault A (-70°C)',
      statusColor: 'bar-green',
      lastRestocked: '2026-08-15',
    },
    {
      id: 2,
      name: 'Moderna Spikevax mRNA-1273',
      manufacturer: 'ModernaTX, Inc.',
      category: 'mrna',
      lotNumber: 'MD-4419',
      available: 850,
      capacity: 1200,
      minThreshold: 300,
      dosesPerVial: 5,
      expiry: '2027-08-30',
      expiryStatus: 'healthy',
      temp: '-20°C Freezer',
      storageUnit: 'Freezer Unit B (-20°C)',
      statusColor: 'bar-blue',
      lastRestocked: '2026-08-10',
    },
    {
      id: 3,
      name: 'Influenza Quadrivalent (Seasonal)',
      manufacturer: 'Sanofi Pasteur',
      category: 'seasonal',
      lotNumber: 'FL-7721',
      available: 95,
      capacity: 800,
      minThreshold: 200,
      dosesPerVial: 1,
      expiry: '2026-11-20',
      expiryStatus: 'expiring_soon',
      temp: '2°C to 8°C Chilled',
      storageUnit: 'Chiller Unit B (2-8°C)',
      statusColor: 'bar-red',
      lastRestocked: '2026-05-12',
    },
    {
      id: 4,
      name: 'Hepatitis B Recombinant',
      manufacturer: 'GlaxoSmithKline (GSK)',
      category: 'routine',
      lotNumber: 'HB-1102',
      available: 640,
      capacity: 900,
      minThreshold: 200,
      dosesPerVial: 1,
      expiry: '2028-03-12',
      expiryStatus: 'healthy',
      temp: '2°C to 8°C Chilled',
      storageUnit: 'Chiller Unit B (2-8°C)',
      statusColor: 'bar-green',
      lastRestocked: '2026-07-22',
    },
    {
      id: 5,
      name: 'MMR (Measles, Mumps, Rubella)',
      manufacturer: 'Merck & Co.',
      category: 'pediatric',
      lotNumber: 'MM-6503',
      available: 180,
      capacity: 600,
      minThreshold: 250,
      dosesPerVial: 1,
      expiry: '2027-02-18',
      expiryStatus: 'healthy',
      temp: '2°C to 8°C Chilled',
      storageUnit: 'Chiller Unit B (2-8°C)',
      statusColor: 'bar-orange',
      lastRestocked: '2026-06-04',
    },
    {
      id: 6,
      name: 'Tdap (Tetanus, Diphtheria, Pertussis)',
      manufacturer: 'Serum Institute / Sanofi',
      category: 'routine',
      lotNumber: 'TD-3398',
      available: 480,
      capacity: 750,
      minThreshold: 150,
      dosesPerVial: 1,
      expiry: '2027-12-05',
      expiryStatus: 'healthy',
      temp: '2°C to 8°C Chilled',
      storageUnit: 'Mobile Chiller C',
      statusColor: 'bar-blue',
      lastRestocked: '2026-08-01',
    },
    {
      id: 7,
      name: 'Rabies Inactivated Vaccine (Verorab)',
      manufacturer: 'Sanofi Pasteur',
      category: 'routine',
      lotNumber: 'RB-8812',
      available: 45,
      capacity: 300,
      minThreshold: 80,
      dosesPerVial: 1,
      expiry: '2026-10-30',
      expiryStatus: 'expiring_soon',
      temp: '2°C to 8°C Chilled',
      storageUnit: 'Chiller Unit B (2-8°C)',
      statusColor: 'bar-red',
      lastRestocked: '2026-04-18',
    },
  ]);

  // Cold Storage Units State
  const [coldVaults] = useState([
    {
      id: 'vault-a',
      name: 'Ultra-Cold Vault A',
      type: 'Cryo-Freezer (-70°C to -86°C)',
      temp: '-76.2°C',
      target: '-75°C',
      status: 'Optimal',
      humidity: '14%',
      sensorStatus: 'Active & Encrypted',
      assignedLots: 2,
    },
    {
      id: 'vault-b',
      name: 'Biomedical Chiller B',
      type: 'Refrigerated Unit (2°C to 8°C)',
      temp: '+4.1°C',
      target: '+4.0°C',
      status: 'Optimal',
      humidity: '48%',
      sensorStatus: 'Active & Encrypted',
      assignedLots: 4,
    },
    {
      id: 'vault-c',
      name: 'Mobile Deployment C',
      type: 'Field Transport Chiller (2°C to 8°C)',
      temp: '+3.8°C',
      target: '+4.0°C',
      status: 'Standby / Ready',
      humidity: '42%',
      sensorStatus: 'Battery 98%',
      assignedLots: 1,
    },
  ]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Register New Vaccine Formulation Name
  const handleRegisterNewVaccine = (vaccineName, mfr = '') => {
    const trimmed = vaccineName.trim();
    if (!trimmed) return;

    if (registeredVaccines.some((v) => v.toLowerCase() === trimmed.toLowerCase())) {
      showToast(`ℹ️ "${trimmed}" is already registered in the hospital formulary.`);
      return;
    }

    setRegisteredVaccines((prev) => [...prev, trimmed]);
    showToast(`✓ Registered new vaccine product: "${trimmed}". It is now ready for Restock shipments!`);
  };

  // Handle Form Submit for Inline Formulation Register
  const handleRegisterFormSubmit = (e) => {
    e.preventDefault();
    if (!newVaccineInput.trim()) return;

    handleRegisterNewVaccine(newVaccineInput, newVaccineMfrInput);
    setNewVaccineInput('');
    setNewVaccineMfrInput('');
  };

  // Remove Registered Formulation
  const handleRemoveFormulation = (name) => {
    if (registeredVaccines.length <= 1) {
      alert('You must keep at least one registered vaccine product.');
      return;
    }
    setRegisteredVaccines((prev) => prev.filter((v) => v !== name));
    showToast(`Removed "${name}" from registered formulary options.`);
  };

  // Handle Add Restock from Modal
  const handleAddStock = ({ vaccineName, lotNumber, quantity, storageUnit, expiryDate, supplier }) => {
    // If not in registered list, add it
    if (!registeredVaccines.some((v) => v.toLowerCase() === vaccineName.toLowerCase())) {
      setRegisteredVaccines((prev) => [...prev, vaccineName]);
    }

    setInventory((prev) => {
      const existingIndex = prev.findIndex((v) => v.name.toLowerCase() === vaccineName.toLowerCase());
      if (existingIndex >= 0) {
        const updated = [...prev];
        const item = updated[existingIndex];
        const newAvailable = item.available + quantity;
        const newCapacity = Math.max(item.capacity, newAvailable);
        let newStatusColor = 'bar-green';
        if (newAvailable <= item.minThreshold) newStatusColor = 'bar-red';
        else if (newAvailable <= item.minThreshold * 1.5) newStatusColor = 'bar-orange';

        updated[existingIndex] = {
          ...item,
          lotNumber: lotNumber || item.lotNumber,
          available: newAvailable,
          capacity: newCapacity,
          storageUnit: storageUnit || item.storageUnit,
          expiry: expiryDate || item.expiry,
          statusColor: newStatusColor,
          lastRestocked: new Date().toISOString().split('T')[0],
        };
        return updated;
      } else {
        // Create new inventory batch
        const newEntry = {
          id: Date.now(),
          name: vaccineName,
          manufacturer: supplier || 'Authorized State Manufacturer',
          category: 'routine',
          lotNumber: lotNumber,
          available: quantity,
          capacity: quantity + 200,
          minThreshold: 100,
          dosesPerVial: 5,
          expiry: expiryDate || '2028-01-01',
          expiryStatus: 'healthy',
          temp: storageUnit && storageUnit.includes('-70') ? '-75°C Ultra Cold' : '2°C to 8°C Chilled',
          storageUnit: storageUnit || 'Chiller Unit B (2-8°C)',
          statusColor: 'bar-green',
          lastRestocked: new Date().toISOString().split('T')[0],
        };
        return [newEntry, ...prev];
      }
    });

    showToast(`✓ Successfully logged restock of +${quantity} vials for ${vaccineName} (Lot ${lotNumber}).`);
  };

  // Handle Wastage Logging
  const handleLogWastage = ({ vaccineId, quantity, reason, reportedBy }) => {
    setInventory((prev) =>
      prev.map((item) => {
        if (item.id === vaccineId) {
          const newAvail = Math.max(0, item.available - quantity);
          let newStatusColor = 'bar-green';
          if (newAvail <= item.minThreshold) newStatusColor = 'bar-red';
          else if (newAvail <= item.minThreshold * 1.5) newStatusColor = 'bar-orange';

          return {
            ...item,
            available: newAvail,
            statusColor: newStatusColor,
          };
        }
        return item;
      })
    );

    showToast(`⚠️ Logged ${quantity} wasted vials. Audit entry recorded by ${reportedBy}.`);
  };

  // Quick Inline Adjustment (+20 / -20)
  const handleQuickAdjust = (id, delta) => {
    setInventory((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newAvail = Math.max(0, item.available + delta);
          let newStatusColor = 'bar-green';
          if (newAvail <= item.minThreshold) newStatusColor = 'bar-red';
          else if (newAvail <= item.minThreshold * 1.5) newStatusColor = 'bar-orange';

          return {
            ...item,
            available: newAvail,
            statusColor: newStatusColor,
          };
        }
        return item;
      })
    );
  };

  // Filtered Inventory List
  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      // Search
      const matchSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.lotNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.storageUnit.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;

      // Status
      if (statusFilter === 'low' && item.available > item.minThreshold) return false;
      if (statusFilter === 'sufficient' && item.available <= item.minThreshold) return false;
      if (statusFilter === 'expiring' && item.expiryStatus !== 'expiring_soon') return false;
      if (statusFilter === 'ultracold' && !item.storageUnit.toLowerCase().includes('ultra-cold')) return false;

      // Category
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;

      return true;
    });
  }, [inventory, searchQuery, statusFilter, categoryFilter]);

  // Aggregated KPI Metrics
  const totalVials = inventory.reduce((acc, curr) => acc + curr.available, 0);
  const totalDoses = inventory.reduce((acc, curr) => acc + curr.available * curr.dosesPerVial, 0);
  const lowStockCount = inventory.filter((item) => item.available <= item.minThreshold).length;
  const expiringCount = inventory.filter((item) => item.expiryStatus === 'expiring_soon').length;

  return (
    <div className="hospital-manage-appointments-wrapper">
      <div className="hospital-manage-appointments-card" style={{ maxWidth: '1240px' }}>
        {/* Toast Alert Notice */}
        {toastMessage && (
          <div className="inventory-toast-banner">
            <span>{toastMessage}</span>
            <button type="button" onClick={() => setToastMessage('')}>&times;</button>
          </div>
        )}

        {/* 1. Header & Primary Action Bar */}
        <div className="inventory-header-row">
          <div>
            <div className="inventory-badge-row">
              <span className="inventory-moh-tag">MOH Sri Lanka &bull; Cold Chain Certified</span>
              <span className="inventory-facility-tag">Facility Code: MOH-COL-77042</span>
            </div>
            <h2 className="hospital-manage-title" style={{ textAlign: 'left', margin: '8px 0 4px' }}>
              Vaccine Inventory &amp; Cold Storage Management
            </h2>
            <p className="inventory-subtitle">
              Manage authorized vaccine products, log incoming restock shipments, monitor IoT cold storage sensors, and track lot audits.
            </p>
          </div>

          <div className="inventory-action-buttons">
            <button
              type="button"
              className="btn-inventory-action btn-restock-primary"
              onClick={() => setIsRestockOpen(true)}
            >
              <span className="btn-icon">📦</span> + Log Restock Shipment
            </button>
            <button
              type="button"
              className="btn-inventory-action btn-wastage-secondary"
              onClick={() => setIsWastageOpen(true)}
            >
              <span className="btn-icon">⚠️</span> Record Wastage
            </button>
            <button
              type="button"
              className="btn-inventory-action btn-export-neutral"
              onClick={() => showToast('Exporting official MOH Vaccine Stock Ledger (.CSV) with cryptographic seal...')}
            >
              <span className="btn-icon">📄</span> Export Stock Report
            </button>
          </div>
        </div>

        {/* 2. Hospital Vaccine Product Name Formulary Registry Card */}
        <div className="vaccine-formulary-card">
          <div className="formulary-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.35rem' }}>🧪</span>
              <div>
                <h3 className="formulary-title">Hospital Vaccine Formulary &amp; Product Registry</h3>
                <p className="formulary-sub">
                  Enter new vaccine product names below. Registered names immediately appear in the <strong>Restock Shipment form</strong> dropdown.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="btn-toggle-registry"
              onClick={() => setShowRegistryBox((prev) => !prev)}
            >
              {showRegistryBox ? '▲ Collapse' : '▼ Expand'}
            </button>
          </div>

          {showRegistryBox && (
            <div className="formulary-card-body">
              {/* Registration Form */}
              <form onSubmit={handleRegisterFormSubmit} className="formulary-input-row">
                <div className="formulary-input-group" style={{ flex: 1.8 }}>
                  <label className="formulary-label">Vaccine Product Name *</label>
                  <input
                    type="text"
                    className="formulary-text-input"
                    placeholder="Enter vaccine name (e.g. Sinopharm BBIBP-CorV, AstraZeneca, HPV Cervarix, BCG...)"
                    value={newVaccineInput}
                    onChange={(e) => setNewVaccineInput(e.target.value)}
                    required
                  />
                </div>

                <div className="formulary-input-group" style={{ flex: 1.2 }}>
                  <label className="formulary-label">Manufacturer / Supplier</label>
                  <input
                    type="text"
                    className="formulary-text-input"
                    placeholder="e.g. Serum Institute / Sanofi / GSK"
                    value={newVaccineMfrInput}
                    onChange={(e) => setNewVaccineMfrInput(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn-register-vaccine">
                  + Register Vaccine Product
                </button>
              </form>

              {/* Active Registered Formulations Badge Pills */}
              <div className="registered-pills-wrap">
                <span className="registered-pills-label">
                  Registered Formulations ({registeredVaccines.length}):
                </span>
                <div className="registered-pills-list">
                  {registeredVaccines.map((vName) => (
                    <span key={vName} className="registered-vaccine-pill">
                      <span className="pill-dot">💉</span>
                      <strong className="pill-name">{vName}</strong>
                      <button
                        type="button"
                        className="pill-remove-btn"
                        onClick={() => handleRemoveFormulation(vName)}
                        title={`Remove ${vName} from list`}
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. Key Metrics Summary Grid */}
        <div className="inventory-metrics-grid">
          <div className="inventory-stat-card">
            <div className="inventory-stat-icon-box icon-blue">
              💉
            </div>
            <div className="inventory-stat-content">
              <span className="inventory-stat-label">Total Vials In Stock</span>
              <span className="inventory-stat-value">{totalVials.toLocaleString()}</span>
              <span className="inventory-stat-sub">
                &asymp; <strong>{totalDoses.toLocaleString()}</strong> Patient Doses Available
              </span>
            </div>
          </div>

          <div className="inventory-stat-card">
            <div className="inventory-stat-icon-box icon-amber">
              ⚠️
            </div>
            <div className="inventory-stat-content">
              <span className="inventory-stat-label">Low Stock Reorders</span>
              <span className="inventory-stat-value" style={{ color: lowStockCount > 0 ? '#dc2626' : '#1e1b4b' }}>
                {lowStockCount} <small style={{ fontSize: '0.85rem', fontWeight: 500 }}>Formulations</small>
              </span>
              <span className="inventory-stat-sub">
                {lowStockCount > 0 ? 'Urgent PO dispatch needed' : 'All stocks above safety threshold'}
              </span>
            </div>
          </div>

          <div className="inventory-stat-card">
            <div className="inventory-stat-icon-box icon-purple">
              ⏳
            </div>
            <div className="inventory-stat-content">
              <span className="inventory-stat-label">Expiring in &lt; 60 Days</span>
              <span className="inventory-stat-value" style={{ color: expiringCount > 0 ? '#d97706' : '#1e1b4b' }}>
                {expiringCount} <small style={{ fontSize: '0.85rem', fontWeight: 500 }}>Batches</small>
              </span>
              <span className="inventory-stat-sub">Prioritize in clinic queue</span>
            </div>
          </div>

          <div className="inventory-stat-card">
            <div className="inventory-stat-icon-box icon-green">
              ❄️
            </div>
            <div className="inventory-stat-content">
              <span className="inventory-stat-label">Cold Storage Status</span>
              <span className="inventory-stat-value" style={{ color: '#059669' }}>
                100%
              </span>
              <span className="inventory-stat-sub">3 Units Online &bull; 0 Excursions</span>
            </div>
          </div>
        </div>

        {/* 4. Live Cold Storage Vault Sensor Dashboard */}
        <div className="cold-vaults-section">
          <div className="cold-vaults-header">
            <div>
              <h3 className="cold-vaults-title">❄️ IoT Cold Chain Vaults &bull; Live Telemetry</h3>
              <p className="cold-vaults-sub">Continuous monitoring conforming to WHO &amp; MOH cold-chain guidelines.</p>
            </div>
            <span className="cold-vaults-live-tag">
              <span className="pulse-dot" /> SENSORS SYNCED (10s AGO)
            </span>
          </div>

          <div className="cold-vaults-grid">
            {coldVaults.map((vault) => (
              <div key={vault.id} className="cold-vault-card">
                <div className="cold-vault-card-header">
                  <div>
                    <h4 className="vault-name">{vault.name}</h4>
                    <span className="vault-type">{vault.type}</span>
                  </div>
                  <span className="vault-status-badge">{vault.status}</span>
                </div>

                <div className="cold-vault-temp-display">
                  <span className="temp-big">{vault.temp}</span>
                  <span className="temp-target">Target: {vault.target}</span>
                </div>

                <div className="cold-vault-footer">
                  <span>Humidity: <strong>{vault.humidity}</strong></span>
                  <span>Lots Stored: <strong>{vault.assignedLots}</strong></span>
                  <span className="sensor-tag">{vault.sensorStatus}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5. Filter Toolbar & Search Bar */}
        <div className="inventory-toolbar">
          <div className="inventory-search-group">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="inventory-search-input"
              placeholder="Search by Vaccine name, Lot #, Manufacturer, or Vault..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button type="button" className="clear-search-btn" onClick={() => setSearchQuery('')}>
                &times;
              </button>
            )}
          </div>

          <div className="inventory-filter-pills">
            <div className="filter-pill-group">
              <button
                type="button"
                className={`filter-pill ${statusFilter === 'all' ? 'active' : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                All Status ({inventory.length})
              </button>
              <button
                type="button"
                className={`filter-pill pill-alert ${statusFilter === 'low' ? 'active' : ''}`}
                onClick={() => setStatusFilter('low')}
              >
                ⚠️ Low Stock ({lowStockCount})
              </button>
              <button
                type="button"
                className={`filter-pill ${statusFilter === 'sufficient' ? 'active' : ''}`}
                onClick={() => setStatusFilter('sufficient')}
              >
                ✓ Healthy
              </button>
              <button
                type="button"
                className={`filter-pill pill-warning ${statusFilter === 'expiring' ? 'active' : ''}`}
                onClick={() => setStatusFilter('expiring')}
              >
                ⏳ Expiring Soon ({expiringCount})
              </button>
              <button
                type="button"
                className={`filter-pill ${statusFilter === 'ultracold' ? 'active' : ''}`}
                onClick={() => setStatusFilter('ultracold')}
              >
                ❄️ Ultra-Cold (-70°C)
              </button>
            </div>

            <div className="view-mode-toggles">
              <button
                type="button"
                className={`btn-view-toggle ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
                title="Table List View"
              >
                ☰ Table
              </button>
              <button
                type="button"
                className={`btn-view-toggle ${viewMode === 'cards' ? 'active' : ''}`}
                onClick={() => setViewMode('cards')}
                title="Grid Cards View"
              >
                ⊞ Cards
              </button>
            </div>
          </div>
        </div>

        {/* 6. Inventory Display: Table View */}
        {viewMode === 'table' ? (
          <div className="hospital-appointments-table-wrapper" style={{ marginTop: '12px' }}>
            <table className="inventory-custom-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', paddingLeft: '20px' }}>Vaccine Formulation &amp; Lot</th>
                  <th>Category</th>
                  <th>Storage &amp; Cold Unit</th>
                  <th>Stock Level &amp; Capacity</th>
                  <th>Doses Equiv.</th>
                  <th>Expiry Date</th>
                  <th>Status</th>
                  <th>Actions &amp; Audit</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="empty-table-cell">
                      No vaccines match the selected criteria. Try resetting your search or filter.
                    </td>
                  </tr>
                ) : (
                  filteredInventory.map((item) => {
                    const pct = Math.min(100, Math.round((item.available / item.capacity) * 100));
                    const isLow = item.available <= item.minThreshold;
                    const isExpiring = item.expiryStatus === 'expiring_soon';

                    return (
                      <tr key={item.id} className={isLow ? 'row-highlight-low' : ''}>
                        <td style={{ textAlign: 'left', paddingLeft: '20px' }}>
                          <div className="vaccine-title-cell">
                            <strong className="vaccine-name-text">{item.name}</strong>
                            <div className="vaccine-sub-meta">
                              <span className="lot-badge">Lot: {item.lotNumber}</span>
                              <span className="mfr-text">{item.manufacturer}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="category-tag">{item.category.toUpperCase()}</span>
                        </td>
                        <td>
                          <div className="storage-cell">
                            <span className="vault-label">{item.storageUnit}</span>
                            <span className="temp-badge">{item.temp}</span>
                          </div>
                        </td>
                        <td style={{ minWidth: '180px' }}>
                          <div className="stock-level-cell">
                            <div className="stock-numbers">
                              <strong>{item.available}</strong>
                              <span className="cap-total">/ {item.capacity} vials</span>
                              <span className="pct-text">({pct}%)</span>
                            </div>
                            <div className="stock-progress-track">
                              <div
                                className={`stock-progress-fill ${item.statusColor}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            {isLow && (
                              <span className="low-stock-alert-tag">
                                Below threshold ({item.minThreshold} min)
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="doses-cell">
                            <strong>{(item.available * item.dosesPerVial).toLocaleString()}</strong>
                            <small>{item.dosesPerVial} dose/vial</small>
                          </div>
                        </td>
                        <td>
                          <div className="expiry-cell">
                            <span className={`expiry-date ${isExpiring ? 'text-amber' : ''}`}>
                              {item.expiry}
                            </span>
                            {isExpiring && <span className="exp-badge">Expiring Soon</span>}
                          </div>
                        </td>
                        <td>
                          {isLow ? (
                            <span className="stock-badge badge-reorder">Low Stock</span>
                          ) : isExpiring ? (
                            <span className="stock-badge badge-expiring">Action Due</span>
                          ) : (
                            <span className="stock-badge badge-healthy">In Stock</span>
                          )}
                        </td>
                        <td>
                          <div className="inventory-row-actions">
                            <button
                              type="button"
                              className="btn-quick-adjust btn-adjust-plus"
                              onClick={() => handleQuickAdjust(item.id, 20)}
                              title="Add +20 Vials"
                            >
                              +20
                            </button>
                            <button
                              type="button"
                              className="btn-quick-adjust btn-adjust-minus"
                              onClick={() => handleQuickAdjust(item.id, -20)}
                              title="Deduct -20 Vials"
                            >
                              -20
                            </button>
                            <button
                              type="button"
                              className="btn-table-audit"
                              onClick={() => setSelectedAuditVaccine(item)}
                              title="View Batch Audit & Traceability Ledger"
                            >
                              📋 Audit
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* 6B. Inventory Display: Cards Grid View */
          <div className="inventory-cards-grid">
            {filteredInventory.map((item) => {
              const pct = Math.min(100, Math.round((item.available / item.capacity) * 100));
              const isLow = item.available <= item.minThreshold;

              return (
                <div key={item.id} className={`inventory-card-item ${isLow ? 'card-low-stock' : ''}`}>
                  <div className="inv-card-top">
                    <span className="category-tag">{item.category.toUpperCase()}</span>
                    {isLow ? (
                      <span className="stock-badge badge-reorder">Low Stock</span>
                    ) : (
                      <span className="stock-badge badge-healthy">Optimal</span>
                    )}
                  </div>

                  <h4 className="inv-card-name">{item.name}</h4>
                  <div className="inv-card-meta">
                    <span>Lot: <strong>{item.lotNumber}</strong></span>
                    <span>Expiry: <strong>{item.expiry}</strong></span>
                  </div>

                  <div className="inv-card-storage-box">
                    <div className="storage-row">
                      <span>❄️ {item.storageUnit}</span>
                      <span className="temp-badge">{item.temp}</span>
                    </div>
                  </div>

                  <div className="inv-card-stock-block">
                    <div className="stock-header-flex">
                      <span>Stock on Hand:</span>
                      <strong>{item.available} / {item.capacity} vials</strong>
                    </div>
                    <div className="stock-progress-track">
                      <div
                        className={`stock-progress-fill ${item.statusColor}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="doses-sub-line">
                      Provides &asymp; {(item.available * item.dosesPerVial).toLocaleString()} doses ({item.dosesPerVial}/vial)
                    </div>
                  </div>

                  <div className="inv-card-actions">
                    <button
                      type="button"
                      className="btn-card-audit"
                      onClick={() => setSelectedAuditVaccine(item)}
                    >
                      Audit Ledger
                    </button>
                    <button
                      type="button"
                      className="btn-card-restock"
                      onClick={() => {
                        handleQuickAdjust(item.id, 50);
                        showToast(`Added +50 vials to ${item.name}`);
                      }}
                    >
                      + Quick 50
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 7. Bottom Notice / National Vaccine Registry Link */}
        <div className="inventory-footer-notice">
          <div className="footer-notice-text">
            <span>🛡️</span>
            <span>
              All vaccine storage, administration records, and lot allocations automatically synchronize with the <strong>National Immunization Cold Chain Registry (MOH Sri Lanka)</strong>.
            </span>
          </div>
          <button
            type="button"
            className="btn-sync-registry"
            onClick={() => showToast('Cold chain registry status: All batches verified in consensus.')}
          >
            ⚡ Force Telemetry Sync
          </button>
        </div>
      </div>

      {/* Modals */}
      <RestockVaccineModal
        isOpen={isRestockOpen}
        onClose={() => setIsRestockOpen(false)}
        onAddStock={handleAddStock}
        registeredVaccines={registeredVaccines}
        onRegisterNewVaccine={handleRegisterNewVaccine}
      />

      <VaccineWastageModal
        isOpen={isWastageOpen}
        onClose={() => setIsWastageOpen(false)}
        inventoryItems={inventory}
        onLogWastage={handleLogWastage}
      />

      <BatchAuditModal
        isOpen={Boolean(selectedAuditVaccine)}
        onClose={() => setSelectedAuditVaccine(null)}
        vaccine={selectedAuditVaccine}
      />
    </div>
  );
}
