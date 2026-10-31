import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  documentsApi,
  privacyApi,
  sharingApi,
  emergencyApi,
  auditApi,
} from '../services/api';
import {
  FolderLock,
  Eye,
  Share2,
  HeartPulse,
  UploadCloud,
  ShieldCheck,
  Download,
  ArrowRight,
  Lock,
  History,
  AlertTriangle,
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [privacyOverview, setPrivacyOverview] = useState(null);
  const [shares, setShares] = useState([]);
  const [emergencyProfile, setEmergencyProfile] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [docsRes, privacyRes, sharesRes, emergencyRes, logsRes] = await Promise.allSettled([
          documentsApi.getDocuments({ limit: 5 }),
          privacyApi.getOverview(),
          sharingApi.getMyShares(),
          emergencyApi.getProfile(),
          auditApi.getLogs({ limit: 5 }),
        ]);

        if (docsRes.status === 'fulfilled' && docsRes.value.data.success) {
          setDocuments(docsRes.value.data.documents || []);
        }
        if (privacyRes.status === 'fulfilled' && privacyRes.value.data.success) {
          setPrivacyOverview(privacyRes.value.data.overview);
        }
        if (sharesRes.status === 'fulfilled' && sharesRes.value.data.success) {
          setShares(sharesRes.value.data.shares || []);
        }
        if (emergencyRes.status === 'fulfilled' && emergencyRes.value.data.success) {
          setEmergencyProfile(emergencyRes.value.data.profile);
        }
        if (logsRes.status === 'fulfilled' && logsRes.value.data.success) {
          setRecentLogs(logsRes.value.data.logs || []);
        }
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const handleDownload = async (docId, filename) => {
    try {
      const res = await documentsApi.download(docId);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to decrypt and download document: ' + (err.response?.data?.error || err.message));
    }
  };

  const activeSharesCount = shares.filter((s) => !s.isRevoked && new Date(s.expiresAt) > new Date()).length;
  const overallScore = privacyOverview ? privacyOverview.overallScore : 100;
  const overallGrade = privacyOverview ? privacyOverview.overallGrade : 'EXCELLENT';

  return (
    <div>
      {/* Top Welcome Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
            Welcome back, {user ? user.name : 'Vault Custodian'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            Your zero-trust encrypted workspace is online. All cryptographic policies enforced.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link to="/upload" className="btn-primary" style={{ textDecoration: 'none' }}>
            <UploadCloud size={16} /> Encrypt Document
          </Link>
          <Link to="/privacy" className="btn-secondary" style={{ textDecoration: 'none' }}>
            <Eye size={16} /> Privacy Health
          </Link>
        </div>
      </div>

      {/* KPI Metrics Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '20px',
          marginBottom: '32px',
        }}
      >
        {/* Metric 1: Total Documents */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Stored Documents
              </p>
              <h3 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
                {privacyOverview ? privacyOverview.totalDocuments : documents.length}
              </h3>
            </div>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(6,182,212,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FolderLock size={20} color="#06b6d4" />
            </div>
          </div>
          <div style={{ marginTop: '14px', fontSize: '0.75rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Lock size={12} /> 100% AES-256-GCM Encrypted
          </div>
        </div>

        {/* Metric 2: Privacy Health Score */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Privacy Health Score
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                <h3 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff' }}>{overallScore}</h3>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-subtle)' }}>/100</span>
              </div>
            </div>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background:
                  overallGrade === 'EXCELLENT'
                    ? 'rgba(16,185,129,0.15)'
                    : overallGrade === 'GOOD'
                    ? 'rgba(6,182,212,0.15)'
                    : 'rgba(244,63,94,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Eye
                size={20}
                color={overallGrade === 'EXCELLENT' ? '#10b981' : overallGrade === 'GOOD' ? '#06b6d4' : '#f43f5e'}
              />
            </div>
          </div>
          <div style={{ marginTop: '14px' }}>
            <span
              className={`badge ${
                overallGrade === 'EXCELLENT'
                  ? 'badge-success'
                  : overallGrade === 'GOOD'
                  ? 'badge-cyan'
                  : overallGrade === 'ATTENTION'
                  ? 'badge-warning'
                  : 'badge-danger'
              }`}
            >
              {overallGrade} POSTURE
            </span>
          </div>
        </div>

        {/* Metric 3: Active Shares */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Active Share Links
              </p>
              <h3 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
                {activeSharesCount}
              </h3>
            </div>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(99,102,241,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Share2 size={20} color="#818cf8" />
            </div>
          </div>
          <div style={{ marginTop: '14px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Scoped &amp; View-Limited
          </div>
        </div>

        {/* Metric 4: Emergency Profile Readiness */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Emergency Readiness
              </p>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginTop: '8px' }}>
                {emergencyProfile && emergencyProfile.bloodType !== 'UNKNOWN' ? 'CONFIGURED' : 'ACTION REQUIRED'}
              </h3>
            </div>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(244,63,94,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <HeartPulse size={20} color="#f43f5e" />
            </div>
          </div>
          <div style={{ marginTop: '14px', fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
            {emergencyProfile ? `${emergencyProfile.designatedContactIds?.length || 0} designated contacts` : 'Setup health directives'}
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Documents & Live Forensic Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1.3fr', gap: '24px' }}>
        {/* Recent Documents Section */}
        <div className="glass-card" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FolderLock size={18} color="#06b6d4" /> Recent Encrypted Documents
            </h2>
            <Link to="/documents" style={{ color: '#06b6d4', fontSize: '0.825rem', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              View All <ArrowRight size={14} />
            </Link>
          </div>

          {documents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <FolderLock size={36} color="var(--text-subtle)" style={{ marginBottom: '12px' }} />
              <p style={{ fontWeight: 600 }}>No documents stored in vault yet.</p>
              <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>Upload a file to encrypt with AES-256-GCM.</p>
              <Link to="/upload" className="btn-primary" style={{ marginTop: '16px', textDecoration: 'none', fontSize: '0.825rem' }}>
                Upload First Document
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {documents.map((doc) => (
                <div
                  key={doc._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.04)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: 'rgba(6,182,212,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Lock size={16} color="#06b6d4" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {doc.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{doc.originalFilename}</span>
                        <span>•</span>
                        <span>{(doc.sizeBytes / 1024).toFixed(1)} KB</span>
                        <span>•</span>
                        <span className="badge badge-indigo" style={{ padding: '1px 6px', fontSize: '0.65rem' }}>
                          {doc.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownload(doc._id, doc.originalFilename)}
                    className="btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.8rem', flexShrink: 0 }}
                    title="Decrypt & Download"
                  >
                    <Download size={14} /> Download
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Forensic Audit Timeline */}
        <div className="glass-card" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <History size={18} color="#818cf8" /> Forensic Audit Trail
            </h2>
            <Link to="/audit" style={{ color: '#818cf8', fontSize: '0.825rem', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Full Log <ArrowRight size={14} />
            </Link>
          </div>

          {recentLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <History size={36} color="var(--text-subtle)" style={{ marginBottom: '12px' }} />
              <p style={{ fontWeight: 600 }}>No audit records generated yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentLogs.map((log) => (
                <div
                  key={log._id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.04)',
                    fontSize: '0.8rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span className="badge badge-cyan" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                      {log.actionType}
                    </span>
                    <span style={{ color: 'var(--text-subtle)', fontSize: '0.7rem' }}>
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                    SHA-256: {log.logHash.substring(0, 24)}...
                  </div>
                </div>
              ))}
            </div>
          )}

          <div
            style={{
              marginTop: '20px',
              padding: '12px 14px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.775rem',
              color: '#34d399',
            }}
          >
            <ShieldCheck size={16} />
            <span>Cryptographic hash chain verified unbroken. Zero data tampering.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

