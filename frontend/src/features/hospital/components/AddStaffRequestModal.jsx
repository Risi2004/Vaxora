import React, { useState } from 'react';

export default function AddStaffRequestModal({ isOpen, onClose, onSendRequest, isSubmitting = false }) {
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleClose = () => {
    if (isSubmitting) return;
    setRegistrationNumber('');
    setError('');
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = registrationNumber.trim();
    if (!trimmed) {
      setError('Enter the doctor or nurse Vaxora registration number (e.g. VAX-D-1001).');
      return;
    }

    setError('');
    try {
      await onSendRequest(trimmed);
      setRegistrationNumber('');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to send invitation.');
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="hospital-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ margin: 0 }}>Add New Staff</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '3px 0 0' }}>
              Invite an approved doctor or nurse using their Vaxora ID
            </p>
          </div>
          <button type="button" className="modal-close-btn" onClick={handleClose} disabled={isSubmitting}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="modal-form-group">
              <label className="modal-label">Vaxora Registration Number *</label>
              <input
                type="text"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                placeholder="e.g. VAX-D-1001 or VAX-N-1001"
                className="modal-input"
                disabled={isSubmitting}
                autoFocus
              />
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                The practitioner must already be registered and admin-approved.
              </span>
            </div>

            {error && (
              <div style={{ color: '#dc2626', fontSize: '0.85rem', marginTop: '8px' }} role="alert">
                {error}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-modal-cancel" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-modal-submit"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              disabled={isSubmitting}
            >
              <span>✉️</span> {isSubmitting ? 'Sending...' : 'Send Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
