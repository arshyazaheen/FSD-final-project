import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { sharingApi } from '../services/api';
import {
  Shield,
  Lock,
  Download,
  AlertCircle,
  Clock,
  Eye,
  CheckCircle,
  FileText,
} from 'lucide-react';

export default function PublicSharePage() {
  const { token } = useParams();
  const [passphrase, setPassphrase] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [needsPassphrase, setNeedsPassphrase] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const fetchSharedDoc = async (enteredPass = '') => {
    setLoading(true);
    setError('');
    try {
      const res = await sharingApi.accessPublicShare(token, enteredPass);
      if (res.data && res.data.success) {
        setData(res.data);
        setNeedsPassphrase(false);
      }
    } catch (err) {
      if (err.response?.data?.code === 'PASSPHRASE_REQUIRED' || err.response?.data?.code === 'INVALID_PASSPHRASE') {
        setNeedsPassphrase(true);
        if (err.response?.data?.code === 'INVALID_PASSPHRASE') {
          setError('Incorrect passphrase. Please try again.');
        }
      } else {
        setError(err.response?.data?.error || 'This share link is invalid, expired, or revoked.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSharedDoc();
  }, [token]);

  const handleUnlockWithPassphrase = (e) => {
    e.preventDefault();
    fetchSharedDoc(passphrase);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await sharingApi.downloadPublicShare(token, passphrase);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', data.document?.originalFilename || 'decrypted_document');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Download error: ' + (err.response?.data?.error || err.message));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at 50% 20%, rgba(6,182,212,0.1) 0%, rgba(9,13,22,1) 80%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        color: '#fff',
      }}
    >
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
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
          Vault<span style={{ color: '#06b6d4' }}>Verse</span> Secure Transfer
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          AES-256-GCM Authenticated Zero-Trust Document Portal
        </p>
      </div>

      <div className="glass-card" style={{ width: '100%', maxWidth: '480px', padding: '32px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            <p>Verifying cryptographic share token...</p>
          </div>
        ) : error && !needsPassphrase ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <AlertCircle size={44} color="#f43f5e" style={{ marginBottom: '14px' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
              Access Link Unavailable
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
              {error}
            </p>
            <Link to="/" className="btn-secondary" style={{ textDecoration: 'none' }}>
              Go to VaultVerse Home
            </Link>
          </div>
        ) : needsPassphrase ? (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <Lock size={32} color="#f59e0b" style={{ marginBottom: '8px' }} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
                Passphrase Protected Document
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                The sender has protected this document with an encryption passphrase.
              </p>
            </div>

            {error && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '6px',
                  background: 'rgba(244, 63, 94, 0.15)',
                  color: '#fda4af',
                  fontSize: '0.8rem',
                  marginBottom: '14px',
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleUnlockWithPassphrase} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input
                type="password"
                required
                className="input-field"
                placeholder="Enter passphrase to unlock"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
              />
              <button type="submit" className="btn-primary" style={{ padding: '10px' }}>
                Unlock Shared Document
              </button>
            </form>
          </div>
        ) : data ? (
          <div>
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
              <FileText size={22} color="#06b6d4" />
            </div>

            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>
              {data.document.title}
            </h2>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              File: {data.document.originalFilename} • {(data.document.sizeBytes / 1024).toFixed(1)} KB
            </p>

            <div
              style={{
                padding: '14px',
                borderRadius: '8px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.8rem',
                marginBottom: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-subtle)' }}>Permission:</span>
                <span className="badge badge-indigo">{data.permission}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-subtle)' }}>Views Remaining:</span>
                <span style={{ color: '#fff', fontWeight: 600 }}>{data.maxViews - data.currentViews}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-subtle)' }}>Link Expiration:</span>
                <span style={{ color: 'var(--text-muted)' }}>{new Date(data.expiresAt).toLocaleString()}</span>
              </div>
            </div>

            {data.permission === 'DOWNLOAD' ? (
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="btn-primary"
                style={{ width: '100%', padding: '12px' }}
              >
                <Download size={16} /> {downloading ? 'Decrypting Document...' : 'Download Decrypted File'}
              </button>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                This is a view-only share link. The sender has not enabled file download permissions.
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

