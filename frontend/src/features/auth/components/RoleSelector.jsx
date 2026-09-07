import React from 'react';

export default function RoleSelector({ selectedRole, onSelectRole }) {
  const roles = [
    { id: 'patient', label: 'Patient' },
    { id: 'doctor', label: 'Doctor' },
    { id: 'nurse', label: 'Nurse' },
    { id: 'hospital', label: 'Hospital' },
  ];

  return (
    <div className="role-selector-container">
      <span className="role-selector-label">Select Account Type</span>
      <div className="role-selector-tabs" role="tablist" aria-label="Select role">
        {roles.map((role) => (
          <button
            key={role.id}
            type="button"
            className={`role-tab-btn ${selectedRole === role.id ? 'active' : ''}`}
            onClick={() => onSelectRole(role.id)}
            role="tab"
            aria-selected={selectedRole === role.id}
          >
            {role.label}
          </button>
        ))}
      </div>
    </div>
  );
}
