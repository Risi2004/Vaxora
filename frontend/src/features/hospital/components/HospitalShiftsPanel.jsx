import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import staffService from '../services/staffService';
import StaffSchedulingAgentChat from './StaffSchedulingAgentChat';

function toDateInputValue(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfWeek(dateInput) {
  const date = new Date(`${dateInput}T00:00:00`);
  const day = date.getDay(); // 0 Sun ... 6 Sat
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  date.setDate(date.getDate() + diff);
  return toDateInputValue(date);
}

function addDays(dateInput, days) {
  const date = new Date(`${dateInput}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toDateInputValue(date);
}

function formatDayLabel(dateInput) {
  const date = new Date(`${dateInput}T00:00:00`);
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function validateShiftForm({ shiftDate, startTime, endTime }) {
  const today = toDateInputValue();
  if (shiftDate < today) {
    return 'Shifts cannot be scheduled on past dates.';
  }

  if (endTime <= startTime) {
    return 'End time must be after start time.';
  }

  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const durationHours = (endH * 60 + endM - (startH * 60 + startM)) / 60;
  if (durationHours > 12) {
    return 'A single shift cannot exceed 12 hours.';
  }

  if (shiftDate === today) {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = startH * 60 + startM;
    if (startMinutes < nowMinutes) {
      return 'Shift start time cannot be in the past.';
    }
  }

  return '';
}

const emptyForm = {
  affiliationId: '',
  shiftDate: toDateInputValue(),
  startTime: '08:00',
  endTime: '16:00',
  boothOrStation: '',
  notes: '',
};

const weekNavButtonStyle = {
  border: 'none',
  background: '#ffffff',
  color: '#19469d',
  fontSize: '1.1rem',
  fontWeight: 700,
  lineHeight: 1,
  padding: '8px 14px',
  cursor: 'pointer',
};

const coverageColor = {
  Good: { bg: '#ecfdf5', border: '#6ee7b7', text: '#047857' },
  Partial: { bg: '#fffbeb', border: '#fcd34d', text: '#b45309' },
  Low: { bg: '#fef2f2', border: '#fca5a5', text: '#b91c1c' },
};

export default function HospitalShiftsPanel() {
  const [activeStaff, setActiveStaff] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [coverage, setCoverage] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editingShiftId, setEditingShiftId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [approvingKey, setApprovingKey] = useState(null);
  const [approvingAll, setApprovingAll] = useState(false);
  const [proposals, setProposals] = useState([]);
  const [showAgentChat, setShowAgentChat] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [weekStart, setWeekStart] = useState(startOfWeek(toDateInputValue()));

  const today = useMemo(() => toDateInputValue(), []);
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const toastTimerRef = useRef(null);

  const showToast = (message) => {
    setToast(message);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(''), 3500);
  };

  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [staff, shiftList] = await Promise.all([
        staffService.getHospitalStaff({ status: 'Active' }),
        staffService.getHospitalShifts({ from: weekStart, to: weekEnd }),
      ]);

      setActiveStaff(Array.isArray(staff) ? staff : []);
      setShifts(Array.isArray(shiftList) ? shiftList : []);

      try {
        const coverageReport = await staffService.getCoverage({ from: weekStart, to: weekEnd });
        setCoverage(coverageReport || null);
      } catch (coverageErr) {
        setCoverage(null);
        setError(
          coverageErr.message ||
            'Coverage summary unavailable. Restart the API if you recently pulled updates, then refresh.'
        );
      }
    } catch (err) {
      setError(err.message || 'Failed to load shifts.');
      setActiveStaff([]);
      setShifts([]);
      setCoverage(null);
    } finally {
      setLoading(false);
    }
  }, [weekStart, weekEnd]);

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

  const shiftsByDay = useMemo(() => {
    const map = {};
    weekDays.forEach((day) => {
      map[day] = [];
    });
    shifts.forEach((shift) => {
      const key = String(shift.shiftDate).slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(shift);
    });
    return map;
  }, [shifts, weekDays]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = (keepDate = true) => {
    setEditingShiftId(null);
    setForm((prev) => ({ ...emptyForm, shiftDate: keepDate ? prev.shiftDate : emptyForm.shiftDate }));
  };

  const beginEdit = (shift) => {
    setEditingShiftId(shift.shiftId);
    setForm({
      affiliationId: shift.affiliationId,
      shiftDate: String(shift.shiftDate).slice(0, 10),
      startTime: String(shift.startTime).slice(0, 5),
      endTime: String(shift.endTime).slice(0, 5),
      boothOrStation: shift.boothOrStation || '',
      notes: shift.notes || '',
    });
    setError('');
  };

  const handleSaveShift = async (e) => {
    e.preventDefault();
    if (!form.affiliationId) {
      setError('Select an active staff member.');
      return;
    }

    const formError = validateShiftForm(form);
    if (formError) {
      setError(formError);
      return;
    }

    const payload = {
      shiftDate: form.shiftDate,
      startTime: form.startTime.length === 5 ? `${form.startTime}:00` : form.startTime,
      endTime: form.endTime.length === 5 ? `${form.endTime}:00` : form.endTime,
      boothOrStation: form.boothOrStation || null,
      notes: form.notes || null,
    };

    setSaving(true);
    setError('');
    try {
      if (editingShiftId) {
        await staffService.updateShift(editingShiftId, payload);
        showToast('Shift updated.');
      } else {
        await staffService.createShift({
          affiliationId: form.affiliationId,
          ...payload,
        });
        showToast('Shift created.');
      }
      resetForm();
      await loadData();
    } catch (err) {
      setError(err.message || (editingShiftId ? 'Failed to update shift.' : 'Failed to create shift.'));
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

  const proposalKey = (p, index) =>
    `${p.affiliationId}-${String(p.shiftDate).slice(0, 10)}-${p.startTime}-${p.endTime}-${index}`;

  const normalizeTime = (value) => {
    const s = String(value || '').trim();
    if (s.length === 5) return `${s}:00`;
    return s;
  };

  const handleSuggestWeek = async () => {
    setSuggesting(true);
    setError('');
    try {
      const result = await staffService.suggestWeekCoverage({
        from: weekStart,
        to: weekEnd,
        defaultStart: '08:00',
        defaultEnd: '16:00',
      });
      const list = Array.isArray(result?.proposals) ? result.proposals : [];
      setProposals(list);
      showToast(result?.message || (list.length ? `Suggested ${list.length} shift(s).` : 'No suggestions.'));
    } catch (err) {
      setError(err.message || 'Failed to suggest week coverage.');
      setProposals([]);
    } finally {
      setSuggesting(false);
    }
  };

  const handleApproveProposal = async (proposal, index) => {
    const key = proposalKey(proposal, index);
    setApprovingKey(key);
    setError('');
    try {
      await staffService.createShift({
        affiliationId: proposal.affiliationId,
        shiftDate: String(proposal.shiftDate).slice(0, 10),
        startTime: normalizeTime(proposal.startTime),
        endTime: normalizeTime(proposal.endTime),
        boothOrStation: proposal.boothOrStation || null,
        notes: proposal.notes || null,
      });
      setProposals((prev) =>
        prev.filter(
          (p) =>
            !(
              p.affiliationId === proposal.affiliationId &&
              String(p.shiftDate).slice(0, 10) === String(proposal.shiftDate).slice(0, 10) &&
              String(p.startTime) === String(proposal.startTime) &&
              String(p.endTime) === String(proposal.endTime)
            )
        )
      );
      showToast(`Approved shift for ${proposal.staffName}.`);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to approve shift.');
    } finally {
      setApprovingKey(null);
    }
  };

  const handleDismissProposal = (index) => {
    setProposals((prev) => prev.filter((_, i) => i !== index));
  };

  const handleApproveAll = async () => {
    if (proposals.length === 0) return;
    setApprovingAll(true);
    setError('');
    let created = 0;
    const remaining = [];
    try {
      for (let i = 0; i < proposals.length; i += 1) {
        const proposal = proposals[i];
        try {
          await staffService.createShift({
            affiliationId: proposal.affiliationId,
            shiftDate: String(proposal.shiftDate).slice(0, 10),
            startTime: normalizeTime(proposal.startTime),
            endTime: normalizeTime(proposal.endTime),
            boothOrStation: proposal.boothOrStation || null,
            notes: proposal.notes || null,
          });
          created += 1;
        } catch {
          remaining.push(proposal);
        }
      }
      setProposals(remaining);
      showToast(
        remaining.length
          ? `Created ${created} shift(s). ${remaining.length} need review.`
          : `Approved all ${created} suggested shift(s).`
      );
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed while approving suggestions.');
    } finally {
      setApprovingAll(false);
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
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '14px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div className="section-title-group">
            <h2 style={{ margin: 0 }}>
              <span>🗓️</span> Staff Shift Roster
            </h2>
            <p className="section-title-desc">
              Weekly roster with coverage insights. Overlaps and shifts over 12 hours are blocked.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAgentChat(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 18px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)',
              transition: 'all 0.2s ease',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <span style={{ fontSize: '18px' }}>🤖</span>
            <span>Open Scheduling Agent</span>
            <span
              style={{
                background: 'rgba(255, 255, 255, 0.25)',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              AI
            </span>
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
            marginBottom: '16px',
            paddingBottom: '16px',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                overflow: 'hidden',
                background: '#ffffff',
              }}
            >
              <button
                type="button"
                onClick={() => setWeekStart(addDays(weekStart, -7))}
                title="Previous week"
                style={weekNavButtonStyle}
              >
                ‹
              </button>
              <input
                type="date"
                value={weekStart}
                onChange={(e) => setWeekStart(startOfWeek(e.target.value || toDateInputValue()))}
                style={{
                  border: 'none',
                  borderLeft: '1px solid #e2e8f0',
                  borderRight: '1px solid #e2e8f0',
                  padding: '8px 10px',
                  fontSize: '0.88rem',
                  color: '#0f172a',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
              <button
                type="button"
                onClick={() => setWeekStart(addDays(weekStart, 7))}
                title="Next week"
                style={weekNavButtonStyle}
              >
                ›
              </button>
            </div>

            <button
              type="button"
              className="hospital-filter-btn"
              onClick={loadData}
              disabled={loading}
              style={{ padding: '8px 14px' }}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          <button
            type="button"
            onClick={handleSuggestWeek}
            disabled={suggesting || loading || staffOptions.length === 0}
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              border: '1px solid #19469d',
              background: suggesting || loading || staffOptions.length === 0 ? '#e2e8f0' : '#19469d',
              color: suggesting || loading || staffOptions.length === 0 ? '#94a3b8' : '#ffffff',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: suggesting || loading || staffOptions.length === 0 ? 'not-allowed' : 'pointer',
              flexShrink: 0,
            }}
          >
            {suggesting ? 'Suggesting...' : 'Suggest Week'}
          </button>
        </div>

        <div className="hospital-metrics-grid" style={{ marginBottom: '16px' }}>
          <div className="hospital-stat-card">
            <div className="hospital-stat-info">
              <span className="hospital-stat-label">Active Doctors</span>
              <span className="hospital-stat-value">{coverage?.activeDoctors ?? 0}</span>
            </div>
          </div>
          <div className="hospital-stat-card">
            <div className="hospital-stat-info">
              <span className="hospital-stat-label">Active Nurses</span>
              <span className="hospital-stat-value">{coverage?.activeNurses ?? 0}</span>
            </div>
          </div>
          <div className="hospital-stat-card">
            <div className="hospital-stat-info">
              <span className="hospital-stat-label">Low Coverage Days</span>
              <span className="hospital-stat-value" style={{ color: '#b91c1c' }}>
                {coverage?.daysWithLowCoverage ?? 0}
              </span>
            </div>
          </div>
          <div className="hospital-stat-card">
            <div className="hospital-stat-info">
              <span className="hospital-stat-label">Week</span>
              <span className="hospital-stat-value" style={{ fontSize: '1rem' }}>
                {weekStart} → {weekEnd}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveShift} style={{ display: 'grid', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div className="modal-form-group" style={{ margin: 0 }}>
              <label className="modal-label">Staff *</label>
              <select
                name="affiliationId"
                value={form.affiliationId}
                onChange={handleChange}
                className="modal-select"
                required
                disabled={Boolean(editingShiftId)}
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
                min={today}
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
              {saving ? 'Saving...' : editingShiftId ? 'Save Changes' : 'Create Shift'}
            </button>
            {editingShiftId && (
              <button type="button" className="btn-hospital-secondary" onClick={() => resetForm()} disabled={saving}>
                Cancel
              </button>
            )}
          </div>

          {staffOptions.length === 0 && !loading && (
            <p style={{ color: '#64748b', margin: 0 }}>
              No active staff yet. Invite and accept affiliations in the Directory tab first.
            </p>
          )}
        </form>
      </div>

      {showAgentChat && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAgentChat(false);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '760px',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            }}
          >
            <StaffSchedulingAgentChat
              weekStart={weekStart}
              weekEnd={weekEnd}
              onShiftsChanged={loadData}
              onClose={() => setShowAgentChat(false)}
            />
          </div>
        </div>
      )}

      {proposals.length > 0 && (
        <div className="hospital-section-card" style={{ marginBottom: '20px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
              alignItems: 'center',
              marginBottom: '12px',
            }}
          >
            <div className="section-title-group">
              <h3 style={{ margin: 0 }}>Suggested shifts (pending approval)</h3>
              <p className="section-title-desc" style={{ margin: '4px 0 0' }}>
                Review each proposal. Nothing is saved until you approve.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-hospital-secondary"
                onClick={() => setProposals([])}
                disabled={approvingAll}
              >
                Clear
              </button>
              <button
                type="button"
                className="btn-hospital-primary"
                onClick={handleApproveAll}
                disabled={approvingAll || approvingKey !== null}
              >
                {approvingAll ? 'Approving...' : `Approve all (${proposals.length})`}
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '10px' }}>
            {proposals.map((proposal, index) => {
              const key = proposalKey(proposal, index);
              const dateLabel = String(proposal.shiftDate).slice(0, 10);
              return (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '12px',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    padding: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    background: '#f8fafc',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>
                      {proposal.staffName}{' '}
                      <span style={{ fontWeight: 600, color: '#64748b', fontSize: '0.85rem' }}>
                        ({proposal.staffRole})
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: 2 }}>
                      {dateLabel} · {String(proposal.startTime).slice(0, 5)} –{' '}
                      {String(proposal.endTime).slice(0, 5)}
                    </div>
                    {proposal.reason && (
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4 }}>
                        {proposal.reason}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn-hospital-secondary"
                      onClick={() => handleDismissProposal(index)}
                      disabled={approvingAll || approvingKey === key}
                    >
                      Dismiss
                    </button>
                    <button
                      type="button"
                      className="btn-hospital-primary"
                      onClick={() => handleApproveProposal(proposal, index)}
                      disabled={approvingAll || approvingKey !== null}
                    >
                      {approvingKey === key ? 'Approving...' : 'Approve'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <h3 style={{ margin: '0 0 12px' }}>Week calendar & coverage</h3>
      {loading ? (
        <div className="hospital-section-card">
          <p style={{ color: '#64748b' }}>Loading roster...</p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
          }}
        >
          {weekDays.map((day) => {
            const dayCoverage = coverage?.days?.find((d) => String(d.date).slice(0, 10) === day);
            const level = dayCoverage?.coverageLevel || 'Low';
            const colors = coverageColor[level] || coverageColor.Low;
            const dayShifts = shiftsByDay[day] || [];

            return (
              <div
                key={day}
                className="hospital-section-card"
                style={{
                  margin: 0,
                  padding: '14px',
                  borderTop: `4px solid ${colors.border}`,
                  background: colors.bg,
                  minHeight: 220,
                }}
              >
                <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>{formatDayLabel(day)}</div>
                <div style={{ fontSize: '0.75rem', color: colors.text, fontWeight: 700, marginBottom: 8 }}>
                  {level} · D {dayCoverage?.scheduledDoctors ?? 0}/{dayCoverage?.activeDoctors ?? 0} · N{' '}
                  {dayCoverage?.scheduledNurses ?? 0}/{dayCoverage?.activeNurses ?? 0}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: 10 }}>
                  {dayCoverage?.summary || 'No coverage data'}
                </div>

                {dayShifts.length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No shifts</div>
                ) : (
                  <div style={{ display: 'grid', gap: 8 }}>
                    {dayShifts.map((shift) => (
                      <div
                        key={shift.shiftId}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: 8,
                          padding: '8px',
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0f172a' }}>
                          {shift.staffName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#475569' }}>
                          {String(shift.startTime).slice(0, 5)} – {String(shift.endTime).slice(0, 5)}
                          {shift.boothOrStation ? ` · ${shift.boothOrStation}` : ''}
                        </div>
                        <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                          {String(shift.shiftDate).slice(0, 10) >= today && (
                            <button
                              type="button"
                              onClick={() => beginEdit(shift)}
                              disabled={saving || actionId === shift.shiftId}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#19469d',
                                fontWeight: 600,
                                fontSize: '0.72rem',
                                cursor: 'pointer',
                                padding: 0,
                              }}
                            >
                              {editingShiftId === shift.shiftId ? 'Editing' : 'Edit'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(shift.shiftId)}
                            disabled={actionId === shift.shiftId}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#dc2626',
                              fontWeight: 600,
                              fontSize: '0.72rem',
                              cursor: 'pointer',
                              padding: 0,
                            }}
                          >
                            {actionId === shift.shiftId ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
