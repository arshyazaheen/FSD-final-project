import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import DashboardLayout from '../layouts/DashboardLayout';
import LandingPage from '../pages/LandingPage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import DashboardPage from '../pages/DashboardPage';
import DocumentsPage from '../pages/DocumentsPage';
import UploadPage from '../pages/UploadPage';
import PrivacyPage from '../pages/PrivacyPage';
import EmergencyPage from '../pages/EmergencyPage';
import TrustedContactsPage from '../pages/TrustedContactsPage';
import SharingPage from '../pages/SharingPage';
import PublicSharePage from '../pages/PublicSharePage';
import AccessRequestsPage from '../pages/AccessRequestsPage';
import AuditPage from '../pages/AuditPage';
import ProfilePage from '../pages/ProfilePage';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary)',
          color: '#06b6d4',
          fontWeight: 600,
        }}
      >
        Decrypting secure session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/share/:token" element={<PublicSharePage />} />

      {/* Authenticated Dashboard Routes */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/emergency" element={<EmergencyPage />} />
        <Route path="/trusted-contacts" element={<TrustedContactsPage />} />
        <Route path="/sharing" element={<SharingPage />} />
        <Route path="/access-requests" element={<AccessRequestsPage />} />
        <Route path="/audit" element={<AuditPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

