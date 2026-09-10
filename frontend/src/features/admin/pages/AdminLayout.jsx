import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import { authService } from '../../auth';
import '../../../styles/doctor.css';
import '../../../styles/admin.css';

export default function AdminLayout() {
  const location = useLocation();
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

  const fetchLivePendingCount = useCallback(async () => {
    try {
      const data = await authService.getPendingVerifications();
      if (Array.isArray(data)) {
        const count = data.filter((item) => (item.status || 'Pending').toLowerCase() === 'pending').length;
        setPendingApprovalsCount(count);
      } else {
        setPendingApprovalsCount(0);
      }
    } catch (err) {
      console.warn('Failed to fetch pending approvals count:', err);
    }
  }, []);

  useEffect(() => {
    fetchLivePendingCount();
    const interval = setInterval(fetchLivePendingCount, 15000);
    return () => clearInterval(interval);
  }, [fetchLivePendingCount, location.pathname]);

  const getPageTitle = (pathname) => {
    if (pathname.includes('/admin/users')) return 'National User Directory';
    if (pathname.includes('/admin/approvals')) return 'Doctor, Nurse & Hospital Approvals';
    if (pathname.includes('/admin/hospitals')) return 'Hospital Performance & Vaccine Logistics';
    if (pathname.includes('/admin/campaigns')) return 'National Campaigns & Vaccination Drives';
    if (pathname.includes('/admin/feedback')) return 'Feedback & Inquiries Central';
    if (pathname.includes('/admin/audit')) return 'System Audit & Compliance Logs';
    if (pathname.includes('/admin/profile')) return 'Superadmin Security & Profile';
    return 'Executive Operations Dashboard';
  };

  return (
    <div className="admin-dark-app">
      {/* 1. Left Dark Sidebar */}
      <AdminSidebar pendingApprovalsCount={pendingApprovalsCount} />

      {/* 2. Main Dark Content Wrapper */}
      <div className="admin-dark-main">
        {/* Top Dark Header Bar */}
        <header className="admin-dark-topbar">
          <div className="admin-topbar-left">
            <h1 className="admin-page-title">{getPageTitle(location.pathname)}</h1>
            <div className="admin-topbar-breadcrumb">
              <span>Vaxora Command</span>
              <span>/</span>
              <span className="admin-breadcrumb-active">{getPageTitle(location.pathname)}</span>
            </div>
          </div>

          <div className="admin-topbar-right">
            <div className="admin-system-status-pill">
              <span className="admin-status-pulse"></span>
              <span>National Network Online (14 Nodes)</span>
            </div>

            <div className="admin-topbar-time">
              <span>🗓️ Sep 2026</span>
            </div>
          </div>
        </header>

        {/* Nested Content Route Area */}
        <main className="admin-dark-content-area">
          <Outlet />
        </main>

        {/* Dark Footer */}
        <footer className="admin-dark-footer">
          <p className="admin-footer-line-1">
            Vaxora National Immunization Network • Ministry of Health Information Infrastructure
          </p>
          <p className="admin-footer-line-2">
            @{new Date().getFullYear()} Vaxora Superadmin Portal. Confidential &amp; Protected Health Information.
          </p>
        </footer>
      </div>
    </div>
  );
}
