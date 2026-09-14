import React, { useCallback, useEffect, useMemo, useState } from 'react';
import staffService from '../services/staffService';

function toDateInputValue(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const emptyForm = {
  affiliationId: '',
  shiftDate: toDateInputValue(),
  startTime: '08:00',
  endTime: '16:00',
  boothOrStation: '',
  notes: '',
};

export default function HospitalShiftsPanel() {
  const [activeStaff, setActiveStaff] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [fromDate, setFromDate] = useState(toDateInputValue());

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(''), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const to = new Date(fromDate);
      to.setDate(to.getDate() + 14);
      const toStr = toDateInputValue(to);

      const [staff, shiftList] = await Promise.all([
        staffService.getHospitalStaff({ status: 'Active' }),
        staffService.getHospitalShifts({ from: fromDate, to: toStr }),
      ]);

      setActiveStaff(Array.isArray(staff) ? staff : []);
      setShifts(Array.isArray(shiftList) ? shiftList : []);
    } catch (err) {
      setError(err.message || 'Failed to load shifts.');
      setActiveStaff([]);
      setShifts([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const staffOptions = useMemo(
    () =>
      activeStaff.map((s) => ({
        value: s.affiliationId,
        label: `${s.staffName} (${s.staffRegistrationNumber})`,
      })),
    [activeStaff]
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.affiliationId) {
      setError('Select an active staff member.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await staffService.createShift({
        affiliationId: form.affiliationId,
        shiftDate: form.shiftDate,
        startTime: form.startTime.length === 5 ? `${form.startTime}:00` : form.startTime,
        endTime: form.endTime.length === 5 ? `${form.endTime}:00` : form.endTime,
        boothOrStation: form.boothOrStation || null,
        notes: form.notes || null,
      });
      showToast('Shift created.');
      setForm((prev) => ({ ...emptyForm, shiftDate: prev.shiftDate }));
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to create shift.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (shiftId) => {
    setActionId(shiftId);
    setError('');
    try {
      await staffService.deleteShift(shiftId);
      showToast('Shift deleted.');
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to delete shift.');
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
        <div className="section-title-group" style={{ marginBottom: '16px' }}>
          <h2 style={{ margin: 0 }}>
            <span>🗓️</span> Staff Shift Roster
          </h2>
          <p className="section-title-desc">
            Assign shifts to active affiliated staff. Overlapping times for the same person are blocked.
          </p>
        </div>

        <form onSubmit={handleCreate} style={{ display: 'grid', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div className="modal-form-group" style={{ margin: 0 }}>
              <label className="modal-label">Staff *</label>
              <select
                name="affiliationId"
                value={form.affiliationId}
                onChange={handleChange}
                className="modal-select"
                required
              >
                <option value="">Select active staff</option>
                {staffOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-form-group" style={{ margin: 0 }}>
              <label className="modal-label">Date *</label>
              <input
                type="date"
                name="shiftDate"
                value={form.shiftDate}
                onChange={handleChange}
                className="modal-input"
                required
              />
            </div>

            <div className="modal-form-group" style={{ margin: 0 }}>
              <label className="modal-label">Start *</label>
              <input
                type="time"
                name="startTime"
                value={form.startTime}
                onChange={handleChange}
                className="modal-input"
                required
              />
            </div>

            <div className="modal-form-group" style={{ margin: 0 }}>
              <label className="modal-label">End *</label>
              <input
                type="time"
                name="endTime"
                value={form.endTime}
                onChange={handleChange}
                className="modal-input"
                required
              />
            </div>

            <div className="modal-form-group" style={{ margin: 0 }}>
              <label className="modal-label">Booth / Station</label>
              <input
                type="text"
                name="boothOrStation"
                value={form.boothOrStation}
                onChange={handleChange}
                className="modal-input"
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="modal-form-group" style={{ margin: 0 }}>
            <label className="modal-label">Notes</label>
            <input
              type="text"
              name="notes"
              value={form.notes}
              onChange={handleChange}
              className="modal-input"
              placeholder="Optional"
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button type="submit" className="btn-hospital-primary" disabled={saving || staffOptions.length === 0}>
              {saving ? 'Saving...' : 'Create Shift'}
            </button>
            <button type="button" className="btn-hospital-secondary" onClick={loadData} disabled={loading}>
              Refresh
            </button>
          </div>

          {staffOptions.length === 0 && !loading && (
            <p style={{ color: '#64748b', margin: 0 }}>
              No active staff yet. Invite and accept affiliations in the Directory tab first.
            </p>
          )}
        </form>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <h3 style={{ margin: 0 }}>Upcoming shifts (from selected date, 14 days)</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '0.85rem', color: '#64748b' }}>From</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="modal-input"
            style={{ width: 'auto' }}
          />
        </div>
      </div>

      <div className="hospital-section-card">
        {loading ? (
          <p style={{ color: '#64748b' }}>Loading shifts...</p>
        ) : shifts.length === 0 ? (
          <p style={{ color: '#64748b' }}>No shifts in this date range.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '10px 8px' }}>Staff</th>
                  <th style={{ padding: '10px 8px' }}>Role</th>
                  <th style={{ padding: '10px 8px' }}>Date</th>
                  <th style={{ padding: '10px 8px' }}>Time</th>
                  <th style={{ padding: '10px 8px' }}>Booth</th>
                  <th style={{ padding: '10px 8px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shifts.map((shift) => (
                  <tr key={shift.shiftId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 8px' }}>{shift.staffName}</td>
                    <td style={{ padding: '10px 8px' }}>{shift.staffRole}</td>
                    <td style={{ padding: '10px 8px' }}>{shift.shiftDate}</td>
                    <td style={{ padding: '10px 8px' }}>
                      {String(shift.startTime).slice(0, 5)} – {String(shift.endTime).slice(0, 5)}
                    </td>
                    <td style={{ padding: '10px 8px' }}>{shift.boothOrStation || '—'}</td>
                    <td style={{ padding: '10px 8px' }}>
                      <button
                        type="button"
                        onClick={() => handleDelete(shift.shiftId)}
                        disabled={actionId === shift.shiftId}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#dc2626',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {actionId === shift.shiftId ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
