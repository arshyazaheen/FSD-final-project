import React, { useState, useEffect } from 'react';
import { sharingApi } from '../services/api';
import {
  Share2,
  Lock,
  Copy,
  Trash2,
  Eye,
  Download,
  Clock,
  CheckCircle,
  AlertCircle,
  Shield,
} from 'lucide-react';

export default function SharingPage() {
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchShares = async () => {
    setLoading(true);
    try {
      const res = await sharingApi.getMyShares();
      if (res.data && res.data.success) {
        setShares(res.data.shares || []);
      }
    } catch (err) {
      console.error('Failed to load shares:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShares();
  }, []);

  const handleRevoke = async (id) => {
    if (!window.confirm('Immediately revoke this share link? Anyone attempting to use it will be blocked.')) return;
    try {
      await sharingApi.revokeShare(id);
      fetchShares();
    } catch (err) {
      alert('Failed to revoke share link: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
            Scoped Document Sharing &amp; Access Links
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            Time-limited, view-limited, and passphrase-protected access links. Cryptographic hashes stored in database.
          </p>
        </div>
      </div>

      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <p>Loading share links...</p>
          </div>
        ) : shares.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <Share2 size={48} color="var(--text-subtle)" style={{ marginBottom: '16px' }} />
            <h3 style={{ fontSize: '1.15rem', color: '#fff', fontWeight: 700 }}>No active share links</h3>
            <p style={{ fontSize: '0.875rem', marginTop: '4px', maxWidth: '420px', margin: '4px auto' }}>
              Create a time-limited share link for any document from the My Documents page.
            </p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Recipient</th>
                <th>Permission</th>
                <th>Views Used / Max</th>
                <th>Expires</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shares.map((share) => {
                const isExpired = new Date(share.expiresAt) < new Date();
                const isLimitReached = share.currentViews >= share.maxViews;
                const isInactive = share.isRevoked || isExpired || isLimitReached;

                return (
                  <tr key={share._id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#fff' }}>
                        {share.documentId?.title || 'Unknown Document'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                        {share.documentId?.originalFilename}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {share.recipientEmail || 'Anyone with link'}
                    </td>
                    <td>
                      <span className="badge badge-indigo">
                        {share.permission === 'DOWNLOAD' ? 'DOWNLOAD' : 'VIEW ONLY'}
                      </span>
                    </td>
                    <td style={{ color: '#fff', fontWeight: 600 }}>
                      {share.currentViews} / {share.maxViews}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: isExpired ? '#f87171' : 'var(--text-muted)' }}>
                      {new Date(share.expiresAt).toLocaleString()}
                    </td>
                    <td>
                      {share.isRevoked ? (
                        <span className="badge badge-danger">REVOKED</span>
                      ) : isExpired ? (
                        <span className="badge badge-danger">EXPIRED</span>
                      ) : isLimitReached ? (
                        <span className="badge badge-warning">VIEW LIMIT</span>
                      ) : (
                        <span className="badge badge-success">ACTIVE</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {!share.isRevoked && !isExpired && (
                        <button
                          onClick={() => handleRevoke(share._id)}
                          className="btn-danger"
                          style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                        >
                          Revoke Access
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

