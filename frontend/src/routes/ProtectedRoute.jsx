import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getToken, getUser } from '../features/auth';

/**
 * Route guard that ensures user is authenticated and has the required role.
 * If user is unauthenticated -> redirects to /login.
 * If user has wrong role -> redirects to their assigned dashboard.
 * If user is not yet active (e.g. pending doctor/nurse) -> redirects with state notice or login.
 */
export default function ProtectedRoute({ allowedRoles = [], children }) {
  const token = getToken();
  const user = getUser();
  const location = useLocation();

  // 1. Not logged in
  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const userRole = (user.role || '').toUpperCase();
  const normalizedAllowedRoles = allowedRoles.map((r) => r.toUpperCase());

  // 2. Role mismatch (e.g., patient trying to access /admin or /doctor)
  if (normalizedAllowedRoles.length > 0 && !normalizedAllowedRoles.includes(userRole)) {
    switch (userRole) {
      case 'PATIENT':
        return <Navigate to="/patient/dashboard" replace />;
      case 'DOCTOR':
        return <Navigate to="/doctor/dashboard" replace />;
      case 'NURSE':
        return <Navigate to="/nurse/dashboard" replace />;
      case 'HOSPITAL':
        return <Navigate to="/hospital/dashboard" replace />;
      case 'ADMIN':
        return <Navigate to="/admin/dashboard" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  }

  return children;
}
