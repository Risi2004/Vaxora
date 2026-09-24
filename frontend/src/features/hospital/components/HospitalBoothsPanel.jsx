import React, { useCallback, useEffect, useState } from 'react';
import staffService from '../services/staffService';

const emptyForm = {
  code: '',
  name: '',
};

export default function HospitalBoothsPanel() {
  const [booths, setBooths] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(''), 3500);
  };

  const loadBooths = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await staffService.getHospitalBooths();
      setBooths(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load booths.');
      setBooths([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBooths();
  }, [loadBooths]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const beginEdit = (booth) => {
    setEditingId(booth.boothId);
    setForm({
      code: booth.code || '',
      name: booth.name || '',
    });
    setError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      setError('Code and name are required.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (editingId) {
        const current = booths.find((b) => b.boothId === editingId);
        await staffService.updateHospitalBooth(editingId, {
          code: form.code.trim(),
          name: form.name.trim(),
          isActive: current?.isActive !== false,
          sortOrder: current?.sortOrder,
        });
        showToast('Booth updated.');
      } else {
        await staffService.createHospitalBooth({
          code: form.code.trim(),
          name: form.name.trim(),
        });
        showToast('Booth created.');
      }
      resetForm();
      await loadBooths();
    } catch (err) {
      setError(err.message || 'Failed to save booth.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (booth) => {
    setActionId(booth.boothId);
    setError('');
    try {
      if (booth.isActive) {
        await staffService.deactivateHospitalBooth(booth.boothId);
        showToast('Booth deactivated.');
      } else {
        await staffService.updateHospitalBooth(booth.boothId, {
          code: booth.code,
          name: booth.name,
          isActive: true,
          sortOrder: booth.sortOrder,
        });
        showToast('Booth reactivated.');
      }
      await loadBooths();
    } catch (err) {
      setError(err.message || 'Failed to update booth status.');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div>
      {toast && (
        <div className="appointment-alert-pill" role="status" style={{ marginBottom: '16px' }}>
          ✓ {toast}
        </div>
      )}
      {error && (
        <div
          className="appointment-alert-pill"
          role="alert"
          style={{ marginBottom: '16px', background: '#fef2f2', color: '#b91c1c', borderColor: '#fecaca' }}
        >
          {error}
        </div>
      )}

      <div className="hospital-section-card" style={{ marginBottom: '20px' }}>
        <div className="section-title-group" style={{ marginBottom: '14px' }}>
          <h2 style={{ margin: 0 }}>
            <span>🚪</span> Vaccination Booths
          </h2>
          <p className="section-title-desc">
            Create, edit, or deactivate vaccination booths. Shifts and Suggest Week use these stations.
          </p>
        </div>

        <form onSubmit={handleSave} style={{ display: 'grid', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
            <div className="modal-form-group" style={{ margin: 0 }}>
              <label className="modal-label">Code *</label>
              <input
                type="text"
                className="modal-input"
                value={form.code}
                onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                placeholder="B01"
                maxLength={20}
                required
              />
            </div>
            <div className="modal-form-group" style={{ margin: 0 }}>
              <label className="modal-label">Name *</label>
              <input
                type="text"
                className="modal-input"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Adult Immunization"
                maxLength={100}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '8px 16px',
                fontSize: '0.88rem',
                fontWeight: 700,
                color: '#ffffff',
                background: '#19469d',
                border: '1px solid #19469d',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Booth'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
                style={{
                  padding: '8px 16px',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  color: '#334155',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={loadBooths}
              disabled={loading}
              style={{
                padding: '8px 16px',
                fontSize: '0.88rem',
                fontWeight: 600,
                color: '#334155',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              Refresh
            </button>
          </div>
        </form>
      </div>

      {loading ? (
        <div className="hospital-section-card" style={{ maxWidth: '420px' }}>
          <p style={{ color: '#64748b', margin: 0 }}>Loading booths...</p>
        </div>
      ) : booths.length === 0 ? (
        <div className="hospital-section-card" style={{ maxWidth: '420px' }}>
          <p style={{ color: '#64748b', margin: 0 }}>
            No booths yet. Use the form above to add one.
          </p>
        </div>
      ) : (
        <div className="booths-grid">
          {booths.map((booth) => (
            <div
              key={booth.boothId}
              className="booth-card"
              style={{ opacity: booth.isActive ? 1 : 0.7, gap: '10px' }}
            >
              <div className="booth-card-header">
                <div className="booth-title-box" style={{ minWidth: 0 }}>
                  <span className="booth-number-tag">{booth.code}</span>
                  <span className="booth-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {booth.name}
                  </span>
                </div>
                <button
                  type="button"
                  aria-label={`Edit ${booth.code}`}
                  title="Edit"
                  onClick={() => beginEdit(booth)}
                  disabled={actionId === booth.boothId}
                  style={{
                    flexShrink: 0,
                    width: '28px',
                    height: '28px',
                    padding: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    />
                    <path d="M13.5 6.5l3 3" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <span className="booth-status-indicator" style={{ color: booth.isActive ? '#15803d' : '#64748b' }}>
                  <span
                    className="telemetry-pulse"
                    style={{
                      width: '6px',
                      height: '6px',
                      background: booth.isActive ? '#22c55e' : '#94a3b8',
                    }}
                  />
                  {booth.isActive ? 'Active' : 'Inactive'}
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleActive(booth)}
                  disabled={actionId === booth.boothId}
                  style={{
                    padding: 0,
                    border: 'none',
                    background: 'transparent',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: booth.isActive ? '#b91c1c' : '#047857',
                  }}
                >
                  {actionId === booth.boothId
                    ? 'Updating...'
                    : booth.isActive
                      ? 'Deactivate'
                      : 'Restore'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
