import React, { useState, useEffect } from 'react';
import { emergencyApi } from '../services/api';
import {
  KeyRound,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Shield,
  X,
  User,
  Trash2,
} from 'lucide-react';

export default function AccessRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Review Modal state
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [responseNote, setResponseNote] = useState('');
  const [grantHours, setGrantHours] = useState(24);
  const [reviewing, setReviewing] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await emergencyApi.listRequests();
      if (res.data && res.data.success) {
        setRequests(res.data.incoming || []);
      }
    } catch (err) {
      console.error('Error fetching requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleReview = async (approve) => {
    setReviewing(true);
    try {
      await emergencyApi.reviewRequest(selectedRequest._id, {
        approve,
        responseNote,
        grantHours: Number(grantHours),
      });
      setSelectedRequest(null);
      setResponseNote('');
      fetchRequests();
    } catch (err) {
      alert('Review failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setReviewing(false);
    }
  };

  const handleRevoke = async (id) => {
    if (!window.confirm('Immediately revoke this emergency access grant?')) return;
    try {
      await emergencyApi.revokeAccess(id);
      fetchRequests();
    } catch (err) {
      alert('Revocation failed: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
            Emergency Access Requests
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            Incoming authorization requests from trusted contacts during emergencies or incapacitation events.
          </p>
        </div>
      </div>

      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <p>Loading access requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <KeyRound size={48} color="var(--text-subtle)" style={{ marginBottom: '16px' }} />
            <h3 style={{ fontSize: '1.15rem', color: '#fff', fontWeight: 700 }}>No emergency requests</h3>
            <p style={{ fontSize: '0.875rem', marginTop: '4px', maxWidth: '420px', margin: '4px auto' }}>
              When a trusted contact lodges an emergency access request, it will appear here for review.
            </p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Requester</th>
                <th>Request Type</th>
                <th>Justification</th>
                <th>Requested Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req._id}>
                  <td>
                    <div style={{ fontWeight: 600, color: '#fff' }}>{req.requesterName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>{req.requesterEmail}</div>
                  </td>
                  <td>
                    <span className="badge badge-indigo">{req.requestType}</span>
                  </td>
                  <td style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-muted)' }}>
                    {req.justification}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>
                    {new Date(req.createdAt).toLocaleString()}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        req.status === 'APPROVED'
                          ? 'badge-success'
                          : req.status === 'PENDING'
                          ? 'badge-warning'
                          : 'badge-danger'
                      }`}
                    >
                      {req.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {req.status === 'PENDING' && (
                      <button
                        onClick={() => setSelectedRequest(req)}
                        className="btn-primary"
                        style={{ padding: '6px 14px', fontSize: '0.775rem' }}
                      >
                        Review Request
                      </button>
                    )}
                    {req.status === 'APPROVED' && (
                      <button
                        onClick={() => handleRevoke(req._id)}
                        className="btn-danger"
                        style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                      >
                        Revoke Grant
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Review Modal */}
      {selectedRequest && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div className="glass-card" style={{ width: '100%', maxWidth: '520px', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>Review Emergency Access</h3>
              <button
                onClick={() => setSelectedRequest(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-subtle)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '16px', fontSize: '0.85rem' }}>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-subtle)', display: 'block', fontSize: '0.75rem' }}>REQUESTER:</span>
                <span style={{ color: '#fff', fontWeight: 600 }}>{selectedRequest.requesterName}</span> ({selectedRequest.requesterEmail})
              </div>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-subtle)', display: 'block', fontSize: '0.75rem' }}>JUSTIFICATION:</span>
                <p style={{ color: 'var(--text-muted)', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px' }}>
                  {selectedRequest.justification}
                </p>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Access Duration (Hours)
              </label>
              <input
                type="number"
                min={1}
                max={72}
                className="input-field"
                value={grantHours}
                onChange={(e) => setGrantHours(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Response Note
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Optional explanation for decision..."
                value={responseNote}
                onChange={(e) => setResponseNote(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => handleReview(false)}
                disabled={reviewing}
                className="btn-danger"
              >
                <XCircle size={16} /> Reject Request
              </button>
              <button
                type="button"
                onClick={() => handleReview(true)}
                disabled={reviewing}
                className="btn-primary"
              >
                <CheckCircle size={16} /> Approve Access
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

