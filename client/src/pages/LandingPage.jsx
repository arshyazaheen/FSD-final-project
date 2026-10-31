import React from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  Lock,
  Eye,
  HeartPulse,
  Share2,
  History,
  CheckCircle,
  FileText,
  KeyRound,
  ArrowRight,
  Database,
  Cpu,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: '#fff' }}>
      {/* Top Navbar */}
      <header
        style={{
          height: '72px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 48px',
          background: 'rgba(9, 13, 22, 0.8)',
          backdropFilter: 'blur(10px)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
          <span style={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Vault<span style={{ color: '#06b6d4' }}>Verse</span>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <a
            href={import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api-docs` : 'http://localhost:5000/api-docs'}
            target="_blank"
            rel="noreferrer"
            style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}
          >
            API Docs
          </a>
          <Link
            to="/login"
            style={{ color: 'var(--text-main)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600 }}
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="btn-primary"
            style={{ textDecoration: 'none', padding: '8px 18px', fontSize: '0.88rem' }}
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section
        style={{
          padding: '100px 32px 80px',
          maxWidth: '1200px',
          margin: '0 auto',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            borderRadius: '9999px',
            background: 'rgba(6, 182, 212, 0.1)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            color: '#22d3ee',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginBottom: '24px',
          }}
        >
          <Lock size={14} /> NIST SP 800-38D Conforming AES-256-GCM Envelope Encryption
        </div>

        <h1
          style={{
            fontSize: '3.5rem',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.15,
            marginBottom: '24px',
          }}
        >
          AI-Powered Secure Personal Data Management &amp;{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #06b6d4 0%, #818cf8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Privacy Protection System
          </span>
        </h1>

        <p
          style={{
            fontSize: '1.25rem',
            color: 'var(--text-muted)',
            maxWidth: '800px',
            margin: '0 auto 40px',
            lineHeight: 1.6,
          }}
        >
          Zero-trust digital vault engineered on the MERN stack with AES-256-GCM authenticated encryption,
          deterministic local PII sanitization, time-limited cryptographic sharing, emergency disaster workflows,
          and tamper-evident SHA-256 forensic audit hash chaining.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
          <Link
            to="/register"
            className="btn-primary"
            style={{ textDecoration: 'none', padding: '14px 28px', fontSize: '1rem' }}
          >
            Create Secure Vault <ArrowRight size={18} />
          </Link>
          <Link
            to="/login"
            className="btn-secondary"
            style={{ textDecoration: 'none', padding: '14px 28px', fontSize: '1rem' }}
          >
            Launch Console
          </Link>
        </div>

        {/* Security Pillars Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '24px',
            marginTop: '80px',
            textAlign: 'left',
          }}
        >
          <div className="glass-card" style={{ padding: '28px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: 'rgba(6,182,212,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <Lock size={22} color="#06b6d4" />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px' }}>
              AES-256-GCM Cryptography
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Hardware-accelerated authenticated envelope encryption. Unique 256-bit DEK generated per document; plaintext
              never touches disk unencrypted.
            </p>
          </div>

          <div className="glass-card" style={{ padding: '28px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: 'rgba(16,185,129,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <Eye size={22} color="#10b981" />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px' }}>
              Deterministic PII Scanner
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Deterministic local identification of payment cards (Luhn MOD-10), SSNs, IBANs, passports, and leaked API
              credentials with zero network egress.
            </p>
          </div>

          <div className="glass-card" style={{ padding: '28px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: 'rgba(244,63,94,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <HeartPulse size={22} color="#f43f5e" />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px' }}>
              Emergency Access Protocol
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Configurable emergency profile for critical health directives and designated contacts with time-bounded
              approval and instant revocation controls.
            </p>
          </div>

          <div className="glass-card" style={{ padding: '28px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: 'rgba(99,102,241,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <History size={22} color="#818cf8" />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px' }}>
              Tamper-Evident Hash Chain
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Immutable forensic audit records linked via SHA-256 chaining. Mathematically guarantees that any retroactively
              altered event is immediately flagged.
            </p>
          </div>
        </div>
      </section>

      {/* Tech Stack Banner */}
      <section
        style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(15, 23, 42, 0.5)',
          padding: '40px 32px',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '20px' }}>
          MANDATORY PRODUCTION MERN ARCHITECTURE
        </p>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '32px',
            fontSize: '0.95rem',
            fontWeight: 600,
            color: 'var(--text-muted)',
          }}
        >
          <span>MongoDB 8.x + Mongoose</span>
          <span>•</span>
          <span>Express.js REST Engine</span>
          <span>•</span>
          <span>React.js + Vite</span>
          <span>•</span>
          <span>Node.js LTS</span>
          <span>•</span>
          <span>AES-256-GCM AEAD</span>
          <span>•</span>
          <span>JWT + bcrypt</span>
        </div>
      </section>
    </div>
  );
}

