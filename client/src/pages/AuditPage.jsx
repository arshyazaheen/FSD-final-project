import React, { useState, useEffect } from 'react';
import { auditApi } from '../services/api';
import {
  History,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verification, setVerification] = useState(null);
  const [verifying, setVerifying] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await auditApi.getLogs({ limit: 50 });
      if (res.data && res.data.success) {
        setLogs(res.data.logs || []);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleVerifyChain = async () => {
    setVerifying(true);
    try {
      const res = await auditApi.verifyChain();
      if (res.data && res.data.success) {
        setVerification(res.data.verification);
      }
    } catch (err) {
      alert('Verification failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
            Forensic Audit &amp; Tamper-Evident Hash Chain
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            Cryptographically linked immutable records. Every security event is bound to the SHA-256 blockchain-style hash chain.
          </p>
        </div>

        <button
          onClick={handleVerifyChain}
          disabled={verifying}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <ShieldCheck size={16} /> {verifying ? 'Verifying Chain...' : 'Verify Audit Chain Integrity'}
        </button>
      </div>

      {/* Chain Verification Result Card */}
      {verification && (
        <div
          className="glass-card"
          style={{
            padding: '20px 24px',
            marginBottom: '24px',
            background: verification.valid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.15)',
            border: '1px solid ' + (verification.valid ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.4)'),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {verification.valid ? (
              <CheckCircle size={28} color="#10b981" />
            ) : (
              <ShieldAlert size={28} color="#f43f5e" />
            )}
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>
                {verification.valid ? 'Cryptographic Hash Chain Fully Verified' : 'Security Alert: Tampering Detected!'}
              </h3>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {verification.valid
                  ? `All ${verification.totalChecked} audit records verified against previous SHA-256 blocks with zero integrity anomalies.`
                  : `Chain verification failed: ${verification.reason}`}
              </p>
            </div>
          </div>
          <span className={`badge ${verification.valid ? 'badge-success' : 'badge-danger'}`} style={{ padding: '6px 14px' }}>
            {verification.valid ? 'INTEGRITY PASS' : 'CHAIN COMPROMISED'}
          </span>
        </div>
      )}

      {/* Audit Log Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <p>Loading forensic audit log...</p>
          </div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <History size={48} color="var(--text-subtle)" style={{ marginBottom: '16px' }} />
            <h3 style={{ fontSize: '1.15rem', color: '#fff', fontWeight: 700 }}>No audit logs recorded</h3>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Action Type</th>
                <th>Entity</th>
                <th>Anonymized Client IP</th>
                <th>Status</th>
                <th>Forensic Log Hash</th>
                <th style={{ textAlign: 'right' }}>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id}>
                  <td>
                    <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>
                      {log.actionType}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.825rem' }}>
                    {log.entityType} {log.entityId ? `(#${log.entityId.substring(0, 8)})` : ''}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                    SHA256:{log.ipHash.substring(0, 16)}...
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        log.status === 'SUCCESS'
                          ? 'badge-success'
                          : log.status === 'BLOCKED'
                          ? 'badge-warning'
                          : 'badge-danger'
                      }`}
                      style={{ fontSize: '0.65rem' }}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#818cf8' }}>
                    {log.logHash.substring(0, 20)}...
                  </td>
                  <td style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-subtle)' }}>
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

