import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, Mail, User, AlertCircle, ArrowRight, Check } from 'lucide-react';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Master password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await register(name, email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const hasLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'radial-gradient(circle at 50% 20%, rgba(99,102,241,0.12) 0%, rgba(9,13,22,1) 80%)',
      }}
    >
      <div className="glass-card" style={{ width: '100%', maxWidth: '460px', padding: '36px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
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
            Initialize Your Vault
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Set up zero-trust credentials protected with bcrypt and AES-256-GCM.
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Full Name
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                required
                className="input-field"
                placeholder="Alex Mercer"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ paddingLeft: '38px' }}
              />
              <User size={16} color="var(--text-subtle)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                required
                className="input-field"
                placeholder="alex@vaultverse.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: '38px' }}
              />
              <Mail size={16} color="var(--text-subtle)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Master Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                required
                className="input-field"
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '38px' }}
              />
              <Lock size={16} color="var(--text-subtle)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>

            {/* Password strength checklist */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '0.725rem', color: 'var(--text-subtle)' }}>
              <span style={{ color: hasLength ? '#34d399' : undefined, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Check size={12} /> 8+ chars
              </span>
              <span style={{ color: hasNumber ? '#34d399' : undefined, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Check size={12} /> Number
              </span>
              <span style={{ color: hasSpecial ? '#34d399' : undefined, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Check size={12} /> Symbol
              </span>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Confirm Master Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                required
                className="input-field"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
            {submitting ? 'Generating Keys & Creating Vault...' : 'Create Encrypted Vault'}
            {!submitting && <ArrowRight size={16} />}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#06b6d4', fontWeight: 600, textDecoration: 'none' }}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

