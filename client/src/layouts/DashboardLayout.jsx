import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  LayoutDashboard,
  FolderLock,
  UploadCloud,
  Eye,
  HeartPulse,
  Users,
  Share2,
  KeyRound,
  History,
  Settings,
  LogOut,
  Menu,
  X,
  HardDrive,
  Lock,
} from 'lucide-react';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'My Documents', path: '/documents', icon: FolderLock },
    { name: 'Upload Document', path: '/upload', icon: UploadCloud },
    { name: 'Privacy Analysis', path: '/privacy', icon: Eye },
    { name: 'Emergency Profile', path: '/emergency', icon: HeartPulse },
    { name: 'Trusted Contacts', path: '/trusted-contacts', icon: Users },
    { name: 'Secure Sharing', path: '/sharing', icon: Share2 },
    { name: 'Access Requests', path: '/access-requests', icon: KeyRound },
    { name: 'Audit History', path: '/audit', icon: History },
    { name: 'Profile & Settings', path: '/profile', icon: Settings },
  ];

  const storageUsedMB = user ? (user.storageUsedBytes / (1024 * 1024)).toFixed(1) : '0';
  const storageQuotaMB = user ? (user.storageQuotaBytes / (1024 * 1024)).toFixed(0) : '5120';
  const storagePercentage = user ? Math.min(100, Math.round((user.storageUsedBytes / user.storageQuotaBytes) * 100)) : 0;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 40,
          }}
        />
      )}

      {/* Sidebar */}
      <aside
        style={{
          width: '260px',
          background: 'var(--bg-surface)',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 50,
          transform: mobileMenuOpen ? 'translateX(0)' : undefined,
          transition: 'transform 0.25s ease-in-out',
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(6,182,212,0.2) 0%, rgba(99,102,241,0.2) 100%)',
              border: '1px solid rgba(6,182,212,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Shield size={24} color="#06b6d4" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>
              Vault<span style={{ color: '#06b6d4' }}>Verse</span>
            </h1>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', fontWeight: 600, letterSpacing: '0.05em' }}>
              SECURE PRIVACY OS
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  marginBottom: '4px',
                  fontSize: '0.88rem',
                  fontWeight: isActive ? 600 : 500,
                  textDecoration: 'none',
                  color: isActive ? '#06b6d4' : 'var(--text-muted)',
                  background: isActive ? 'rgba(6, 182, 212, 0.12)' : 'transparent',
                  borderLeft: isActive ? '3px solid #06b6d4' : '3px solid transparent',
                  transition: 'all 0.15s ease',
                })}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Storage Quota Widget */}
        <div
          style={{
            padding: '16px',
            margin: '12px',
            background: 'rgba(0, 0, 0, 0.25)',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <HardDrive size={14} color="#06b6d4" /> Storage Usage
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#fff' }}>{storagePercentage}%</span>
          </div>
          <div style={{ width: '100%', height: '6px', background: '#334155', borderRadius: '3px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${storagePercentage}%`,
                height: '100%',
                background: storagePercentage > 85 ? '#f43f5e' : 'linear-gradient(90deg, #06b6d4, #3b82f6)',
                borderRadius: '3px',
              }}
            />
          </div>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', marginTop: '6px' }}>
            {storageUsedMB} MB of {storageQuotaMB} MB used
          </p>
        </div>

        {/* User Card & Logout */}
        <div
          style={{
            padding: '16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#6366f1',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.9rem',
                flexShrink: 0,
              }}
            >
              {user ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {user ? user.name : 'User'}
              </div>
              <div style={{ fontSize: '0.725rem', color: 'var(--text-subtle)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {user ? user.email : ''}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Log Out"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-subtle)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#f43f5e')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-subtle)')}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, marginLeft: '260px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header */}
        <header
          style={{
            height: '64px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(9, 13, 22, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 32px',
            position: 'sticky',
            top: 0,
            zIndex: 30,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                display: 'none',
                background: 'transparent',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              <Menu size={22} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-cyan" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Lock size={12} /> AES-256-GCM Active
              </span>
              <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Shield size={12} /> Hash Chain Verified
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <NavLink
              to="/upload"
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.85rem', textDecoration: 'none' }}
            >
              <UploadCloud size={16} /> New Upload
            </NavLink>
          </div>
        </header>

        {/* Page Body */}
        <main style={{ flex: 1, padding: '32px', maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

