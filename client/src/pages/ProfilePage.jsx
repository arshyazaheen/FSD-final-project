import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import {
  User,
  Lock,
  HardDrive,
  Shield,
  Save,
  CheckCircle,
  AlertCircle,
  Bell,
  Eye,
} from 'lucide-react';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user ? user.name : '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [autoScan, setAutoScan] = useState(user?.settings?.autoPrivacyScan ?? true);
  const [emailAlerts, setEmailAlerts] = useState(user?.settings?.emailAlerts ?? true);

  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPass, setChangingPass] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [passMessage, setPassMessage] = useState('');
  const [passError, setPassError] = useState('');

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMessage('');
    setProfileError('');

    try {
      const res = await authApi.updateProfile({
        name,
        settings: {
          autoPrivacyScan: autoScan,
          emailAlerts,
        },
      });

      if (res.data && res.data.success) {
        setProfileMessage('Profile settings updated successfully.');
        updateUser(res.data.user);
      }
    } catch (err) {
      setProfileError(err.response?.data?.error || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassMessage('');
    setPassError('');

    if (newPassword.length < 8) {
      setPassError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError('New passwords do not match.');
      return;
    }

    setChangingPass(true);
    try {
      const res = await authApi.changePassword({
        currentPassword,
        newPassword,
      });

      if (res.data && res.data.success) {
        setPassMessage('Master password updated successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setPassError(err.response?.data?.error || 'Failed to change password.');
    } finally {
      setChangingPass(false);
    }
  };

  const usedMB = user ? (user.storageUsedBytes / (1024 * 1024)).toFixed(1) : '0';
  const quotaMB = user ? (user.storageQuotaBytes / (1024 * 1024)).toFixed(0) : '5120';
  const percentage = user ? Math.min(100, Math.round((user.storageUsedBytes / user.storageQuotaBytes) * 100)) : 0;

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
          User Profile &amp; Account Settings
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
          Manage your identity, master passphrase credentials, security preferences, and storage quota.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Storage Quota Breakdown Card */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HardDrive size={18} color="#06b6d4" /> Cryptographic Storage Allocation
          </h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.875rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>{usedMB} MB used</span>
            <span style={{ color: '#fff', fontWeight: 600 }}>{quotaMB} MB Total Capacity ({percentage}%)</span>
          </div>
          <div style={{ width: '100%', height: '8px', background: '#334155', borderRadius: '4px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${percentage}%`,
                height: '100%',
                background: percentage > 85 ? '#f43f5e' : 'linear-gradient(90deg, #06b6d4, #3b82f6)',
                borderRadius: '4px',
              }}
            />
          </div>
        </div>

        {/* Profile Information & Preferences */}
        <div className="glass-card" style={{ padding: '28px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={18} color="#818cf8" /> Profile Information &amp; Preferences
          </h2>

          {profileMessage && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '6px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                fontSize: '0.825rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px',
              }}
            >
              <CheckCircle size={16} />
              <span>{profileMessage}</span>
            </div>
          )}

          {profileError && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '6px',
                background: 'rgba(244, 63, 94, 0.15)',
                color: '#fda4af',
                fontSize: '0.825rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px',
              }}
            >
              <AlertCircle size={16} />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  className="input-field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Email Address (Immutable)
                </label>
                <input
                  type="email"
                  disabled
                  className="input-field"
                  value={user ? user.email : ''}
                  style={{ opacity: 0.7, cursor: 'not-allowed' }}
                />
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span style={{ fontSize: '0.775rem', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase' }}>
                Automated Security Flags:
              </span>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem', color: '#fff', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={autoScan}
                  onChange={(e) => setAutoScan(e.target.checked)}
                />
                Automatically scan uploaded documents for unredacted PII
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem', color: '#fff', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                />
                Receive email alerts on new emergency access requests
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button type="submit" disabled={savingProfile} className="btn-primary">
                <Save size={16} /> {savingProfile ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </form>
        </div>

        {/* Change Master Password Card */}
        <div className="glass-card" style={{ padding: '28px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={18} color="#f43f5e" /> Update Master Password
          </h2>

          {passMessage && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '6px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                fontSize: '0.825rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px',
              }}
            >
              <CheckCircle size={16} />
              <span>{passMessage}</span>
            </div>
          )}

          {passError && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '6px',
                background: 'rgba(244, 63, 94, 0.15)',
                color: '#fda4af',
                fontSize: '0.825rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px',
              }}
            >
              <AlertCircle size={16} />
              <span>{passError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Current Master Password
              </label>
              <input
                type="password"
                required
                className="input-field"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  New Master Password
                </label>
                <input
                  type="password"
                  required
                  className="input-field"
                  placeholder="Min 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  className="input-field"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button type="submit" disabled={changingPass} className="btn-primary">
                {changingPass ? 'Re-encrypting Password Hash...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

