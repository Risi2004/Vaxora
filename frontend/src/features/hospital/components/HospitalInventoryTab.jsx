import React, { useState, useEffect, useMemo, useCallback } from 'react';
import RestockVaccineModal from './RestockVaccineModal';
import VaccineWastageModal from './VaccineWastageModal';
import BatchAuditModal from './BatchAuditModal';
import inventoryService from '../services/inventoryService';
import InventoryAIInventoryWorkflow from './InventoryAIInventoryWorkflow';

export default function HospitalInventoryTab() {
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [isWastageOpen, setIsWastageOpen] = useState(false);
  const [selectedAuditVaccine, setSelectedAuditVaccine] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [isAIAgentOpen, setIsAIAgentOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [registeredVaccines, setRegisteredVaccines] = useState([]);
  const [newVaccineInput, setNewVaccineInput] = useState('');
  const [newVaccineMfrInput, setNewVaccineMfrInput] = useState('');
  const [showRegistryBox, setShowRegistryBox] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewMode, setViewMode] = useState('table');

  const [inventory, setInventory] = useState([]);
  const [coldVaults, setColdVaults] = useState([]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const loadAll = useCallback(async () => {
    try {
      setErrorMsg('');
      const [batches, formulary, vaults] = await Promise.all([
        inventoryService.getInventory(),
        inventoryService.getFormulary(),
        inventoryService.getColdVaults(),
      ]);
      setInventory(Array.isArray(batches) ? batches : []);
      setRegisteredVaccines(Array.isArray(formulary) ? formulary.map((f) => f.vaccineName) : []);
      setColdVaults(Array.isArray(vaults) ? vaults : []);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load inventory.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleRegisterNewVaccine = async (vaccineName, mfr = '') => {
    const trimmed = vaccineName.trim();
    if (!trimmed) return;
    if (registeredVaccines.some((v) => v.toLowerCase() === trimmed.toLowerCase())) {
      showToast(`ℹ️ "${trimmed}" is already registered in the hospital formulary.`);
      return;
    }
    try {
      await inventoryService.registerFormulary(trimmed, mfr);
      setRegisteredVaccines((prev) => [...prev, trimmed]);
      showToast(`✓ Registered new vaccine product: "${trimmed}".`);
    } catch (err) {
      showToast(`⚠️ ${err.message}`);
    }
  };

  const handleRegisterFormSubmit = (e) => {
    e.preventDefault();
    if (!newVaccineInput.trim()) return;
    handleRegisterNewVaccine(newVaccineInput, newVaccineMfrInput);
    setNewVaccineInput('');
    setNewVaccineMfrInput('');
  };

  const handleRemoveFormulation = async (name) => {
    if (registeredVaccines.length <= 1) {
      alert('You must keep at least one registered vaccine product.');
      return;
    }
    try {
      const formulary = await inventoryService.getFormulary();
      const match = formulary.find((f) => f.vaccineName === name);
      if (match) {
        await inventoryService.removeFormulary(match.id);
        setRegisteredVaccines((prev) => prev.filter((v) => v !== name));
        showToast(`Removed "${name}" from registered formulary options.`);
      }
    } catch (err) {
      showToast(`⚠️ ${err.message}`);
    }
  };

  const handleAddStock = async ({ vaccineName, lotNumber, quantity, storageUnit, expiryDate, supplier }) => {
    try {
      await inventoryService.restockBatch({ vaccineName, lotNumber, quantity, storageUnit, expiryDate, supplier });
      await loadAll();
      showToast(`✓ Successfully logged restock of +${quantity} vials for ${vaccineName} (Lot ${lotNumber}).`);
    } catch (err) {
      showToast(`⚠️ ${err.message}`);
      throw err;
    }
  };

  const handleLogWastage = async ({ vaccineId, quantity, reason, reportedBy, notes, incidentDate }) => {
    try {
      await inventoryService.logWastage(vaccineId, { quantity, reason, reportedBy, notes, incidentDate });
      await loadAll();
      showToast(`⚠️ Logged ${quantity} wasted vials.`);
    } catch (err) {
      showToast(`⚠️ ${err.message}`);
      throw err;
    }
  };

  const handleQuickAdjust = async (id, delta) => {
    try {
      await inventoryService.adjustStock(id, delta, `Quick ${delta > 0 ? '+' : ''}${delta} adjustment`);
      await loadAll();
    } catch (err) {
      showToast(`⚠️ ${err.message}`);
    }
  };

  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        item.name.toLowerCase().includes(q) ||
        item.lotNumber.toLowerCase().includes(q) ||
        (item.manufacturer || '').toLowerCase().includes(q) ||
        (item.storageUnit || '').toLowerCase().includes(q);
      if (!matchSearch) return false;
      if (statusFilter === 'low' && item.available > item.minThreshold) return false;
      if (statusFilter === 'sufficient' && item.available <= item.minThreshold) return false;
      if (statusFilter === 'expiring' && item.expiryStatus !== 'expiring_soon') return false;
      if (statusFilter === 'ultracold' && !(item.storageUnit || '').toLowerCase().includes('ultra-cold')) return false;
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      return true;
    });
  }, [inventory, searchQuery, statusFilter, categoryFilter]);

  const totalVials = inventory.reduce((acc, curr) => acc + curr.available, 0);
  const totalDoses = inventory.reduce((acc, curr) => acc + curr.available * curr.dosesPerVial, 0);
  const lowStockCount = inventory.filter((item) => item.available <= item.minThreshold).length;
  const expiringCount = inventory.filter((item) => item.expiryStatus === 'expiring_soon').length;

  if (loading) {
    return (
      <div className="hospital-manage-appointments-wrapper">
        <div className="hospital-manage-appointments-card" style={{ maxWidth: '1240px', padding: '60px', textAlign: 'center' }}>
          <h3>Loading inventory…</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="hospital-manage-appointments-wrapper">
      <div className="hospital-manage-appointments-card" style={{ maxWidth: '1240px' }}>
        {toastMessage && (
          <div className="inventory-toast-banner">
            <span>{toastMessage}</span>
            <button type="button" onClick={() => setToastMessage('')}>&times;</button>
          </div>
        )}

        {errorMsg && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
            ⚠️ {errorMsg}
          </div>
        )}

        <div className="inventory-header-row">
          <div>
            <div className="inventory-badge-row">
              <span className="inventory-moh-tag">MOH Sri Lanka &bull; Cold Chain Certified</span>
              <span className="inventory-facility-tag">Hospital Code: MOH-COL-77042</span>
            </div>
            <h2 className="hospital-manage-title" style={{ textAlign: 'left', margin: '8px 0 4px' }}>
              Vaccine Inventory &amp; Cold Storage Management
            </h2>
            <p className="inventory-subtitle">
              Manage authorized vaccine products, log incoming restock shipments, monitor IoT cold storage sensors, and track lot audits.
            </p>
          </div>

          <div className="inventory-action-buttons">
            <button type="button" className="btn-inventory-action btn-restock-primary" onClick={() => setIsRestockOpen(true)}>
              <span className="btn-icon">📦</span> + Log Restock Shipment
            </button>
            <button type="button" className="btn-inventory-action btn-wastage-secondary" onClick={() => setIsWastageOpen(true)} disabled={inventory.length === 0}>
              <span className="btn-icon">⚠️</span> Record Wastage
            </button>
            <button
              type="button"
              className="btn-inventory-action btn-export-neutral"
              onClick={() => setIsAIAgentOpen(true)}
              style={{ background: '#7c3aed', color: '#ffffff', borderColor: '#7c3aed' }}
            >
              <span className="btn-icon">🤖</span> AI Agent
            </button>
            <button type="button" className="btn-inventory-action btn-export-neutral" onClick={() => showToast('Exporting official MOH Vaccine Stock Ledger (.CSV)...')}>
              <span className="btn-icon">📄</span> Export Stock Report
            </button>
          </div>
        </div>

        <div className="vaccine-formulary-card">
          <div className="formulary-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.35rem' }}>🧪</span>
              <div>
                <h3 className="formulary-title">Hospital Vaccine Formulary &amp; Product Registry</h3>
                <p className="formulary-sub">Enter new vaccine product names below. Registered names immediately appear in the <strong>Restock Shipment form</strong> dropdown.</p>
              </div>
            </div>
            <button type="button" className="btn-toggle-registry" onClick={() => setShowRegistryBox((prev) => !prev)}>
              {showRegistryBox ? '▲ Collapse' : '▼ Expand'}
            </button>
          </div>

          {showRegistryBox && (
            <div className="formulary-card-body">
              <form onSubmit={handleRegisterFormSubmit} className="formulary-input-row">
                <div className="formulary-input-group" style={{ flex: 1.8 }}>
                  <label className="formulary-label">Vaccine Product Name *</label>
                  <input type="text" className="formulary-text-input" placeholder="Enter vaccine name..." value={newVaccineInput} onChange={(e) => setNewVaccineInput(e.target.value)} required />
                </div>
                <div className="formulary-input-group" style={{ flex: 1.2 }}>
                  <label className="formulary-label">Manufacturer / Supplier</label>
                  <input type="text" className="formulary-text-input" placeholder="e.g. Serum Institute / Sanofi / GSK" value={newVaccineMfrInput} onChange={(e) => setNewVaccineMfrInput(e.target.value)} />
                </div>
                <button type="submit" className="btn-register-vaccine">+ Register Vaccine Product</button>
              </form>

              <div className="registered-pills-wrap">
                <span className="registered-pills-label">Registered Formulations ({registeredVaccines.length}):</span>
                <div className="registered-pills-list">
                  {registeredVaccines.map((vName) => (
                    <span key={vName} className="registered-vaccine-pill">
                      <span className="pill-dot">💉</span>
                      <strong className="pill-name">{vName}</strong>
                      <button type="button" className="pill-remove-btn" onClick={() => handleRemoveFormulation(vName)} title={`Remove ${vName}`}>&times;</button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="inventory-metrics-grid">
          <div className="inventory-stat-card">
            <div className="inventory-stat-icon-box icon-blue">💉</div>
            <div className="inventory-stat-content">
              <span className="inventory-stat-label">Total Vials In Stock</span>
              <span className="inventory-stat-value">{totalVials.toLocaleString()}</span>
              <span className="inventory-stat-sub">&asymp; <strong>{totalDoses.toLocaleString()}</strong> Patient Doses Available</span>
            </div>
          </div>
          <div className="inventory-stat-card">
            <div className="inventory-stat-icon-box icon-amber">⚠️</div>
            <div className="inventory-stat-content">
              <span className="inventory-stat-label">Low Stock Reorders</span>
              <span className="inventory-stat-value" style={{ color: lowStockCount > 0 ? '#dc2626' : '#1e1b4b' }}>{lowStockCount} <small style={{ fontSize: '0.85rem', fontWeight: 500 }}>Formulations</small></span>
              <span className="inventory-stat-sub">{lowStockCount > 0 ? 'Urgent PO dispatch needed' : 'All stocks above safety threshold'}</span>
            </div>
          </div>
          <div className="inventory-stat-card">
            <div className="inventory-stat-icon-box icon-purple">⏳</div>
            <div className="inventory-stat-content">
              <span className="inventory-stat-label">Expiring in &lt; 60 Days</span>
              <span className="inventory-stat-value" style={{ color: expiringCount > 0 ? '#d97706' : '#1e1b4b' }}>{expiringCount} <small style={{ fontSize: '0.85rem', fontWeight: 500 }}>Batches</small></span>
              <span className="inventory-stat-sub">Prioritize in clinic queue</span>
            </div>
          </div>
          <div className="inventory-stat-card">
            <div className="inventory-stat-icon-box icon-green">❄️</div>
            <div className="inventory-stat-content">
              <span className="inventory-stat-label">Cold Storage Status</span>
              <span className="inventory-stat-value" style={{ color: '#059669' }}>100%</span>
              <span className="inventory-stat-sub">{coldVaults.length} Units Online &bull; 0 Excursions</span>
            </div>
          </div>
        </div>

        {coldVaults.length > 0 && (
          <div className="cold-vaults-section">
            <div className="cold-vaults-header">
              <div>
                <h3 className="cold-vaults-title">❄️ IoT Cold Chain Vaults &bull; Live Telemetry</h3>
                <p className="cold-vaults-sub">Continuous monitoring conforming to WHO &amp; MOH cold-chain guidelines.</p>
              </div>
              <span className="cold-vaults-live-tag"><span className="pulse-dot" /> SENSORS SYNCED</span>
            </div>
            <div className="cold-vaults-grid">
              {coldVaults.map((vault) => (
                <div key={vault.id} className="cold-vault-card">
                  <div className="cold-vault-card-header">
                    <div><h4 className="vault-name">{vault.name}</h4><span className="vault-type">{vault.type}</span></div>
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
        )}

        <div className="inventory-toolbar">
          <div className="inventory-search-group">
            <span className="search-icon">🔍</span>
            <input type="text" className="inventory-search-input" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            {searchQuery && <button type="button" className="clear-search-btn" onClick={() => setSearchQuery('')}>&times;</button>}
          </div>
          <div className="inventory-filter-pills">
            <div className="filter-pill-group">
              <button type="button" className={`filter-pill ${statusFilter === 'all' ? 'active' : ''}`} onClick={() => setStatusFilter('all')}>All Status ({inventory.length})</button>
              <button type="button" className={`filter-pill pill-alert ${statusFilter === 'low' ? 'active' : ''}`} onClick={() => setStatusFilter('low')}>⚠️ Low Stock ({lowStockCount})</button>
              <button type="button" className={`filter-pill ${statusFilter === 'sufficient' ? 'active' : ''}`} onClick={() => setStatusFilter('sufficient')}>✓ Healthy</button>
              <button type="button" className={`filter-pill pill-warning ${statusFilter === 'expiring' ? 'active' : ''}`} onClick={() => setStatusFilter('expiring')}>⏳ Expiring Soon ({expiringCount})</button>
              <button type="button" className={`filter-pill ${statusFilter === 'ultracold' ? 'active' : ''}`} onClick={() => setStatusFilter('ultracold')}>❄️ Ultra-Cold</button>
            </div>
            <div className="view-mode-toggles">
              <button type="button" className={`btn-view-toggle ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')}>☰ Table</button>
              <button type="button" className={`btn-view-toggle ${viewMode === 'cards' ? 'active' : ''}`} onClick={() => setViewMode('cards')}>⊞ Cards</button>
            </div>
          </div>
        </div>

        {inventory.length === 0 ? (
          <div className="hospital-appointments-table-wrapper" style={{ marginTop: '12px', padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
            <h3>No inventory yet</h3>
            <p>Click <strong>+ Log Restock Shipment</strong> to add your first batch.</p>
          </div>
        ) : viewMode === 'table' ? (
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
                  <tr><td colSpan="8" className="empty-table-cell">No vaccines match the selected criteria.</td></tr>
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
                        <td><span className="category-tag">{item.category.toUpperCase()}</span></td>
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
                              <div className={`stock-progress-fill ${item.statusColor}`} style={{ width: `${pct}%` }} />
                            </div>
                            {isLow && <span className="low-stock-alert-tag">Below threshold ({item.minThreshold} min)</span>}
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
                            <span className={`expiry-date ${isExpiring ? 'text-amber' : ''}`}>{item.expiry}</span>
                            {isExpiring && <span className="exp-badge">Expiring Soon</span>}
                          </div>
                        </td>
                        <td>
                          {isLow ? <span className="stock-badge badge-reorder">Low Stock</span>
                            : isExpiring ? <span className="stock-badge badge-expiring">Action Due</span>
                            : <span className="stock-badge badge-healthy">In Stock</span>}
                        </td>
                        <td>
                          <div className="inventory-row-actions">
                            <button type="button" className="btn-quick-adjust btn-adjust-plus" onClick={() => handleQuickAdjust(item.id, 20)} title="Add +20 Vials">+20</button>
                            <button type="button" className="btn-quick-adjust btn-adjust-minus" onClick={() => handleQuickAdjust(item.id, -20)} title="Deduct -20 Vials">-20</button>
                            <button type="button" className="btn-table-audit" onClick={() => setSelectedAuditVaccine(item)} title="View Batch Audit">📋 Audit</button>
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
          <div className="inventory-cards-grid">
            {filteredInventory.map((item) => {
              const pct = Math.min(100, Math.round((item.available / item.capacity) * 100));
              const isLow = item.available <= item.minThreshold;
              return (
                <div key={item.id} className={`inventory-card-item ${isLow ? 'card-low-stock' : ''}`}>
                  <div className="inv-card-top">
                    <span className="category-tag">{item.category.toUpperCase()}</span>
                    {isLow ? <span className="stock-badge badge-reorder">Low Stock</span> : <span className="stock-badge badge-healthy">Optimal</span>}
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
                      <div className={`stock-progress-fill ${item.statusColor}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="doses-sub-line">Provides &asymp; {(item.available * item.dosesPerVial).toLocaleString()} doses ({item.dosesPerVial}/vial)</div>
                  </div>
                  <div className="inv-card-actions">
                    <button type="button" className="btn-card-audit" onClick={() => setSelectedAuditVaccine(item)}>Audit Ledger</button>
                    <button type="button" className="btn-card-restock" onClick={() => handleQuickAdjust(item.id, 50)}>+ Quick 50</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="inventory-footer-notice">
          <div className="footer-notice-text">
            <span>🛡️</span>
            <span>All vaccine storage, administration records, and lot allocations automatically synchronize with the <strong>National Immunization Cold Chain Registry (MOH Sri Lanka)</strong>.</span>
          </div>
          <button type="button" className="btn-sync-registry" onClick={() => showToast('Cold chain registry status: All batches verified.')}>
            ⚡ Force Telemetry Sync
          </button>
        </div>
      </div>

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

      <InventoryAIInventoryWorkflow
        isOpen={isAIAgentOpen}
        onClose={() => setIsAIAgentOpen(false)}
        onApproved={loadAll}
      />
    </div>
  );
}