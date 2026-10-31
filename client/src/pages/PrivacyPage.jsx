import React, { useState, useEffect } from 'react';
import { privacyApi } from '../services/api';
import {
  Eye,
  ShieldAlert,
  ShieldCheck,
  CreditCard,
  Key,
  FileText,
  AlertTriangle,
  Sparkles,
  CheckCircle,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';

export default function PrivacyPage() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  // Live Interactive Privacy Sandbox state
  const [sandboxText, setSandboxText] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [scoreReport, setScoreReport] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const res = await privacyApi.getOverview();
      if (res.data && res.data.success) {
        setOverview(res.data.overview);
      }
    } catch (err) {
      console.error('Failed to load privacy overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleRunSandboxScan = async (e) => {
    e.preventDefault();
    if (!sandboxText.trim()) return;

    setAnalyzing(true);
    try {
      const res = await privacyApi.analyzeText({ text: sandboxText });
      if (res.data && res.data.success) {
        setScanResult(res.data.scanResult);
        setScoreReport(res.data.scoreReport);
      }
    } catch (err) {
      alert('Analysis failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setAnalyzing(false);
    }
  };

  const fillSampleSandbox = () => {
    setSandboxText(`CONFIDENTIAL FINANCIAL STATEMENT
Account Holder: Alex Mercer
Email: alexander@vaultverse.io
SSN: 123-45-6789
Visa Card: 4532-0150-1234-5671
AWS Access Key: AKIAIOSFODNN7EXAMPLE
Bank IBAN: DE89370400440532013000`);
  };

  const score = overview ? overview.overallScore : 100;
  const grade = overview ? overview.overallGrade : 'EXCELLENT';
  const entityCounts = overview ? overview.entityTypeCounts || {} : {};

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
            Privacy Health &amp; Sensitivity Engine
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            Deterministic PII detection, Luhn card verification, secret leak audits, and 0–100 privacy posture scoring.
          </p>
        </div>
        <button onClick={fetchOverview} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RefreshCw size={14} /> Refresh Overview
        </button>
      </div>

      {/* Posture Score Banner */}
      <div
        className="glass-card"
        style={{
          padding: '32px',
          marginBottom: '32px',
          display: 'grid',
          gridTemplateColumns: '1fr 2fr',
          gap: '32px',
          alignItems: 'center',
        }}
      >
        <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.08)', paddingRight: '32px' }}>
          <div
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              margin: '0 auto 16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background:
                grade === 'EXCELLENT'
                  ? 'radial-gradient(circle, rgba(16,185,129,0.2) 0%, rgba(16,185,129,0.02) 70%)'
                  : grade === 'GOOD'
                  ? 'radial-gradient(circle, rgba(6,182,212,0.2) 0%, rgba(6,182,212,0.02) 70%)'
                  : 'radial-gradient(circle, rgba(244,63,94,0.2) 0%, rgba(244,63,94,0.02) 70%)',
              border:
                '3px solid ' +
                (grade === 'EXCELLENT'
                  ? '#10b981'
                  : grade === 'GOOD'
                  ? '#06b6d4'
                  : grade === 'ATTENTION'
                  ? '#f59e0b'
                  : '#f43f5e'),
            }}
          >
            <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#fff' }}>{score}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>OUT OF 100</span>
          </div>
          <span
            className={`badge ${
              grade === 'EXCELLENT'
                ? 'badge-success'
                : grade === 'GOOD'
                ? 'badge-cyan'
                : grade === 'ATTENTION'
                ? 'badge-warning'
                : 'badge-danger'
            }`}
            style={{ fontSize: '0.85rem', padding: '4px 14px' }}
          >
            {grade} POSTURE
          </span>
        </div>

        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
            Vault-Wide Data Sanitization Status
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '20px' }}>
            The privacy engine evaluates all documents against strict GDPR and PCI-DSS compliance heuristics. Critical
            entities like unmasked credit cards or raw API tokens apply aggressive score deductions.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>Scanned Docs</span>
              <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>{overview ? overview.scannedDocuments : 0}</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>Entities Detected</span>
              <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#22d3ee' }}>{overview ? overview.totalEntitiesDetected : 0}</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>High Risk Items</span>
              <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f87171' }}>{overview ? overview.highRiskDocuments?.length || 0 : 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Detected Entities Breakdown Grid */}
      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginBottom: '16px' }}>
        Detected Sensitive Entity Categories
      </h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        {[
          { label: 'Payment Cards', key: 'PAYMENT_CARD', icon: CreditCard, color: '#f43f5e' },
          { label: 'Social Security', key: 'US_SSN', icon: ShieldAlert, color: '#f43f5e' },
          { label: 'Bank IBANs', key: 'IBAN', icon: FileText, color: '#f59e0b' },
          { label: 'Cloud Secrets', key: 'SECRET_KEY', icon: Key, color: '#f43f5e' },
          { label: 'Passports', key: 'PASSPORT', icon: FileText, color: '#f59e0b' },
          { label: 'Email Addresses', key: 'EMAIL', icon: FileText, color: '#06b6d4' },
          { label: 'Phone Numbers', key: 'PHONE', icon: FileText, color: '#06b6d4' },
        ].map((item) => {
          const count = entityCounts[item.key] || 0;
          const Icon = item.icon;
          return (
            <div key={item.key} className="glass-card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>{item.label}</span>
                <Icon size={16} color={item.color} />
              </div>
              <p style={{ fontSize: '1.5rem', fontWeight: 800, color: count > 0 ? item.color : '#fff' }}>
                {count}
              </p>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>
                {count > 0 ? 'Entities identified' : 'Clean / None detected'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Interactive Local Privacy Sandbox */}
      <div className="glass-card" style={{ padding: '32px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} color="#06b6d4" /> Interactive Privacy Sandbox &amp; PII Inspector
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Paste any unstructured text snippet below to inspect real-time deterministic entity detection and score calculations.
            </p>
          </div>
          <button
            type="button"
            onClick={fillSampleSandbox}
            className="btn-secondary"
            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
          >
            Insert Test Vector
          </button>
        </div>

        <form onSubmit={handleRunSandboxScan}>
          <textarea
            className="input-field"
            rows={5}
            placeholder="Paste text here to evaluate PII entities and checksum rules..."
            value={sandboxText}
            onChange={(e) => setSandboxText(e.target.value)}
            style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', marginBottom: '16px' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="submit"
              disabled={analyzing || !sandboxText.trim()}
              className="btn-primary"
              style={{ padding: '10px 20px' }}
            >
              {analyzing ? 'Evaluating PII Rules...' : 'Execute Local Privacy Analysis'}
            </button>
          </div>
        </form>

        {/* Sandbox Results */}
        {scanResult && scoreReport && (
          <div
            style={{
              marginTop: '28px',
              padding: '24px',
              borderRadius: '10px',
              background: 'rgba(0,0,0,0.35)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>ANALYSIS RESULT</span>
                <h4 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>
                  Score: {scoreReport.score}/100 • Grade: {scoreReport.grade}
                </h4>
              </div>
              <span className={`badge ${scoreReport.grade === 'EXCELLENT' ? 'badge-success' : 'badge-danger'}`}>
                {scoreReport.riskLevel} RISK
              </span>
            </div>

            {/* Detected Entities List */}
            {scanResult.entities.length > 0 ? (
              <div style={{ marginBottom: '20px' }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '10px' }}>
                  Detected &amp; Masked Entities ({scanResult.entities.length}):
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {scanResult.entities.map((entity, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '6px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.825rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className={`badge ${entity.severity === 'CRITICAL' ? 'badge-danger' : 'badge-warning'}`}>
                          {entity.type}
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', color: '#fff' }}>{entity.maskedValue}</span>
                      </div>
                      <span style={{ color: 'var(--text-subtle)', fontSize: '0.75rem' }}>{entity.remediation}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ padding: '16px', color: '#34d399', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={18} /> Zero sensitive PII detected. Optimal posture.
              </div>
            )}

            {/* Deductions & Remediation Checklist */}
            {scoreReport.deductions.length > 0 && (
              <div>
                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '10px' }}>
                  Point Deductions &amp; Recommended Actions:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem' }}>
                  {scoreReport.deductions.map((d, i) => (
                    <div key={i} style={{ color: '#fda4af', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertTriangle size={14} /> -{d.pointsDeducted} pts: {d.reason}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

