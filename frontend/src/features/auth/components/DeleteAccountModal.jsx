import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

export default function DeleteAccountModal({ isOpen, onClose, userName, roleName }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleDelete = async () => {
    try {
      setLoading(true);
      setError('');
      await authService.deleteAccount();
      onClose();
      navigate('/login', {
        state: { message: 'Your Vaxora account has been permanently deleted.' },
      });
    } catch (err) {
      console.error('Failed to delete account:', err);
      setError(err.message || 'Failed to delete your account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        padding: '20px',
        boxSizing: 'border-box',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#0c1322',
          color: '#ffffff',
          borderRadius: '16px',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 35px rgba(239, 68, 68, 0.25)',
          maxWidth: '480px',
          width: '100%',
          padding: '28px',
          position: 'relative',
          margin: 'auto',
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Warning Icon & Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
              flexShrink: 0,
            }}
          >
            ⚠️
          </div>
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: '1.25rem',
                fontWeight: 800,
                color: '#ffffff',
                fontFamily: 'var(--font-heading, "Outfit", sans-serif)',
              }}
            >
              Delete Account
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
              Permanent action for {roleName || 'User'}
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              color: '#fca5a5',
              padding: '10px 12px',
              borderRadius: '8px',
              fontSize: '0.84rem',
              marginBottom: '16px',
            }}
          >
            {error}
          </div>
        )}

        {/* Description Body */}
        <div
          style={{
            fontSize: '0.88rem',
            lineHeight: 1.5,
            color: '#cbd5e1',
            marginBottom: '20px',
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '14px',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <p style={{ margin: '0 0 8px', fontWeight: 600, color: '#f87171' }}>
            Are you sure you want to delete the account for "{userName || 'this profile'}"?
          </p>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>
            This will permanently remove your profile, registration details, documents, and credentials from the Vaxora database. This action cannot be undone.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              background: '#1e293b',
              color: '#e2e8f0',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '9px 18px',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            style={{
              background: '#dc2626',
              color: '#ffffff',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              padding: '9px 20px',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(220, 38, 38, 0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {loading ? 'Deleting...' : 'Yes, Delete Account'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
