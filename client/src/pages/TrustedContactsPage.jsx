import React, { useState, useEffect } from 'react';
import { trustedContactsApi } from '../services/api';
import {
  Users,
  UserPlus,
  Trash2,
  Mail,
  Phone,
  ShieldCheck,
  X,
  CheckCircle,
  Copy,
  AlertCircle,
} from 'lucide-react';

const RELATIONSHIPS = [
  'SPOUSE',
  'CHILD',
  'PARENT',
  'SIBLING',
  'ATTORNEY',
  'PHYSICIAN',
  'TRUSTED_ADVISOR',
  'FRIEND',
  'OTHER',
];

export default function TrustedContactsPage() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add Contact Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('TRUSTED_ADVISOR');
  const [securityNote, setSecurityNote] = useState('');
  const [canViewEmergency, setCanViewEmergency] = useState(true);
  const [canRequestAccess, setCanRequestAccess] = useState(true);
  const [canDownload, setCanDownload] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const res = await trustedContactsApi.list();
      if (res.data && res.data.success) {
        setContacts(res.data.contacts || []);
      }
    } catch (err) {
      console.error('Failed to load contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleAddContact = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const res = await trustedContactsApi.add({
        contactName: name,
        contactEmail: email,
        phone,
        relationship,
        securityNote,
        permissions: {
          canViewEmergencyProfile: canViewEmergency,
          canRequestEmergencyAccess: canRequestAccess,
          canDownloadDocuments: canDownload,
          allowedCategories: ['EMERGENCY', 'MEDICAL', 'IDENTITY'],
        },
      });

      if (res.data && res.data.success) {
        setShowAddModal(false);
        setName('');
        setEmail('');
        setPhone('');
        setSecurityNote('');
        fetchContacts();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add trusted contact.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteContact = async (id, contactName) => {
    if (!window.confirm(`Revoke all permissions and remove "${contactName}" as a trusted contact?`)) return;
    try {
      await trustedContactsApi.remove(id);
      setContacts(contacts.filter((c) => c._id !== id));
    } catch (err) {
      alert('Failed to remove contact: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
            Trusted Contact Circle
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            Designated individuals authorized to view emergency records or request vault recovery during crises.
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          <UserPlus size={16} /> Add Trusted Contact
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <p>Loading trusted contacts...</p>
        </div>
      ) : contacts.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <Users size={48} color="var(--text-subtle)" style={{ marginBottom: '16px' }} />
          <h3 style={{ fontSize: '1.15rem', color: '#fff', fontWeight: 700 }}>No trusted contacts added</h3>
          <p style={{ fontSize: '0.875rem', marginTop: '4px', maxWidth: '420px', margin: '4px auto 20px' }}>
            Add an attorney, spouse, physician, or family member who can be granted emergency access when needed.
          </p>
          <button onClick={() => setShowAddModal(true)} className="btn-primary" style={{ fontSize: '0.85rem' }}>
            <UserPlus size={16} /> Add First Contact
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {contacts.map((contact) => (
            <div key={contact._id} className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span className="badge badge-indigo">{contact.relationship}</span>
                  <span className="badge badge-success">{contact.status}</span>
                </div>

                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
                  {contact.contactName}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Mail size={14} color="var(--text-subtle)" />
                    <span>{contact.contactEmail}</span>
                  </div>
                  {contact.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Phone size={14} color="var(--text-subtle)" />
                      <span>{contact.phone}</span>
                    </div>
                  )}
                </div>

                {contact.securityNote && (
                  <p style={{ fontSize: '0.775rem', color: 'var(--text-subtle)', marginTop: '12px', fontStyle: 'italic' }}>
                    "{contact.securityNote}"
                  </p>
                )}

                <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', fontWeight: 700, textTransform: 'uppercase' }}>
                    Authorized Capabilities:
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                    {contact.permissions?.canViewEmergencyProfile && (
                      <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>
                        Emergency Profile
                      </span>
                    )}
                    {contact.permissions?.canRequestEmergencyAccess && (
                      <span className="badge badge-indigo" style={{ fontSize: '0.65rem' }}>
                        Access Requests
                      </span>
                    )}
                    {contact.permissions?.canDownloadDocuments && (
                      <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                        Download
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button
                  onClick={() => handleDeleteContact(contact._id, contact.contactName)}
                  className="btn-danger"
                  style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                >
                  <Trash2 size={13} /> Remove Contact
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddModal && (
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
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>Add Trusted Contact</h3>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-subtle)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
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

            <form onSubmit={handleAddContact} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="e.g. Attorney Sarah Jenkins"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    className="input-field"
                    placeholder="sarah@legal.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Phone Number
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="+1 (555) 123-4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Relationship
                </label>
                <select
                  className="input-field"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                >
                  {RELATIONSHIPS.map((rel) => (
                    <option key={rel} value={rel}>
                      {rel}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Security Verification Note
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Family attorney at Smith & Partners law firm"
                  value={securityNote}
                  onChange={(e) => setSecurityNote(e.target.value)}
                />
              </div>

              {/* Granular Permission Toggles */}
              <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                  Permissions Granted:
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.825rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#fff' }}>
                    <input
                      type="checkbox"
                      checked={canViewEmergency}
                      onChange={(e) => setCanViewEmergency(e.target.checked)}
                    />
                    Can View Emergency Medical Profile
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#fff' }}>
                    <input
                      type="checkbox"
                      checked={canRequestAccess}
                      onChange={(e) => setCanRequestAccess(e.target.checked)}
                    />
                    Can Lodge Emergency Access Requests
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#fff' }}>
                    <input
                      type="checkbox"
                      checked={canDownload}
                      onChange={(e) => setCanDownload(e.target.checked)}
                    />
                    Can Download Approved Emergency Documents
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? 'Adding Contact...' : 'Add Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

