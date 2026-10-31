import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(
        err.response?.data?.error || 'Authentication failed. Please verify your credentials.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemoAccount = () => {
    setEmail('alexander@vaultverse.io');
    setPassword('StrongPassword123!');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'radial-gradient(circle at 50% 20%, rgba(6,182,212,0.12) 0%, rgba(9,13,22,1) 80%)',
      }}
    >
      <div className="glass-card" style={{ width: '100%', maxWidth: '440px', padding: '36px' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(6,182,212,0.2) 0%, rgba(99,102,241,0.2) 100%)',
              border: '1px solid rgba(6,182,212,0.4)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px',
            }}
          >
            <Shield size={28} color="#06b6d4" />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
            Vault<span style={{ color: '#06b6d4' }}>Verse</span> Console
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Enter your credentials to unlock your encrypted vault.
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '8px',
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.4)',
              color: '#fda4af',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '20px',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                required
                className="input-field"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: '38px' }}
              />
              <Mail size={16} color="var(--text-subtle)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                Master Password
              </label>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                required
                className="input-field"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '38px' }}
              />
              <Lock size={16} color="var(--text-subtle)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary"
            style={{ width: '100%', padding: '12px', marginTop: '8px' }}
          >
            {submitting ? 'Decrypting Vault Session...' : 'Authenticate & Unlock'}
            {!submitting && <ArrowRight size={16} />}
          </button>

          <button
            type="button"
            onClick={fillDemoAccount}
            style={{
              background: 'transparent',
              border: '1px dashed var(--border-subtle)',
              color: 'var(--cyan-primary)',
              padding: '8px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Quick-fill Demo Credentials
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Don't have an encrypted vault yet?{' '}
          <Link to="/register" style={{ color: '#06b6d4', fontWeight: 600, textDecoration: 'none' }}>
            Register Account
          </Link>
        </div>
      </div>
    </div>
  );
}

