import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { documentsApi, sharingApi } from '../services/api';
import {
  FolderLock,
  Search,
  UploadCloud,
  Download,
  Trash2,
  Share2,
  Eye,
  Edit3,
  Filter,
  Lock,
  X,
  Check,
  AlertCircle,
  FileText,
  Calendar,
} from 'lucide-react';

const CATEGORIES = ['ALL', 'FINANCIAL', 'MEDICAL', 'IDENTITY', 'LEGAL', 'PERSONAL', 'TAX', 'EMERGENCY', 'OTHER'];

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Edit Metadata Modal state
  const [editDoc, setEditDoc] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('PERSONAL');
  const [editTags, setEditTags] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Quick Share Modal state
  const [shareDoc, setShareDoc] = useState(null);
  const [shareRecipient, setShareRecipient] = useState('');
  const [sharePermission, setSharePermission] = useState('VIEW');
  const [shareMaxViews, setShareMaxViews] = useState(5);
  const [shareExpiresHours, setShareExpiresHours] = useState(24);
  const [sharePassphrase, setSharePassphrase] = useState('');
  const [generatedShare, setGeneratedShare] = useState(null);
  const [sharing, setSharing] = useState(false);

  // Document Details Modal state
  const [viewDetailsDoc, setViewDetailsDoc] = useState(null);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await documentsApi.getDocuments({
        category: selectedCategory,
        search,
      });
      if (res.data && res.data.success) {
        setDocuments(res.data.documents || []);
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [selectedCategory, search]);

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
      alert('Decryption failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDelete = async (docId, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? Storage quota will be reclaimed.`)) return;
    try {
      await documentsApi.deleteDocument(docId);
      setDocuments(documents.filter((d) => d._id !== docId));
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleScanPrivacy = async (docId) => {
    try {
      const res = await documentsApi.scanPrivacy(docId);
      if (res.data && res.data.success) {
        alert(`Privacy scan complete! Score: ${res.data.assessment.score}/100 (${res.data.assessment.grade})`);
        fetchDocuments();
      }
    } catch (err) {
      alert('Scan error: ' + (err.response?.data?.error || err.message));
    }
  };

  const openEditModal = (doc) => {
    setEditDoc(doc);
    setEditTitle(doc.title);
    setEditCategory(doc.category);
    setEditTags(Array.isArray(doc.tags) ? doc.tags.join(', ') : '');
    setEditNotes(doc.notes || '');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      await documentsApi.updateMetadata(editDoc._id, {
        title: editTitle,
        category: editCategory,
        tags: editTags.split(',').map((t) => t.trim()).filter(Boolean),
        notes: editNotes,
      });
      setEditDoc(null);
      fetchDocuments();
    } catch (err) {
      alert('Update failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCreateShare = async (e) => {
    e.preventDefault();
    setSharing(true);
    try {
      const res = await sharingApi.createShare({
        documentId: shareDoc._id,
        recipientEmail: shareRecipient || null,
        permission: sharePermission,
        maxViews: Number(shareMaxViews),
        expiresInHours: Number(shareExpiresHours),
        passphrase: sharePassphrase || null,
      });
      if (res.data && res.data.success) {
        setGeneratedShare(res.data.share);
      }
    } catch (err) {
      alert('Failed to generate share link: ' + (err.response?.data?.error || err.message));
    } finally {
      setSharing(false);
    }
  };

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
            Personal Document Vault
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            All files encrypted at rest with AES-256-GCM AEAD. Keys managed via cryptographic envelope encryption.
          </p>
        </div>
        <Link to="/upload" className="btn-primary" style={{ textDecoration: 'none' }}>
          <UploadCloud size={16} /> Upload New Document
        </Link>
      </div>

      {/* Filters & Search Toolbar */}
      <div
        className="glass-card"
        style={{
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        {/* Category Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                background: selectedCategory === cat ? '#06b6d4' : 'rgba(255, 255, 255, 0.04)',
                color: selectedCategory === cat ? '#fff' : 'var(--text-muted)',
                border: '1px solid ' + (selectedCategory === cat ? '#06b6d4' : 'rgba(255, 255, 255, 0.08)'),
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', width: '280px' }}>
          <input
            type="text"
            className="input-field"
            placeholder="Search documents or tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '36px', height: '38px', fontSize: '0.85rem' }}
          />
          <Search size={16} color="var(--text-subtle)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
        </div>
      </div>

      {/* Documents Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <p>Loading encrypted documents...</p>
          </div>
        ) : documents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <FolderLock size={48} color="var(--text-subtle)" style={{ marginBottom: '16px' }} />
            <h3 style={{ fontSize: '1.15rem', color: '#fff', fontWeight: 700 }}>No documents found</h3>
            <p style={{ fontSize: '0.875rem', marginTop: '4px', maxWidth: '400px', margin: '4px auto 20px' }}>
              {search || selectedCategory !== 'ALL'
                ? 'No documents match your active search filter or category.'
                : 'Your vault is currently empty. Upload your sensitive files to securely store and analyze them.'}
            </p>
            <Link to="/upload" className="btn-primary" style={{ textDecoration: 'none', fontSize: '0.85rem' }}>
              <UploadCloud size={16} /> Upload First Document
            </Link>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Document Title</th>
                <th>Category</th>
                <th>File Size</th>
                <th>Privacy Score</th>
                <th>Created</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => {
                const assessment = doc.privacyAssessment;
                return (
                  <tr key={doc._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            background: 'rgba(6, 182, 212, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Lock size={16} color="#06b6d4" />
                        </div>
                        <div>
                          <div
                            onClick={() => setViewDetailsDoc(doc)}
                            style={{ fontWeight: 600, color: '#fff', cursor: 'pointer' }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#06b6d4')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = '#fff')}
                          >
                            {doc.title}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                            {doc.originalFilename}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-indigo">{doc.category}</span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {(doc.sizeBytes / 1024).toFixed(1)} KB
                    </td>
                    <td>
                      {assessment && assessment.scanned ? (
                        <span
                          className={`badge ${
                            assessment.grade === 'EXCELLENT'
                              ? 'badge-success'
                              : assessment.grade === 'GOOD'
                              ? 'badge-cyan'
                              : assessment.grade === 'ATTENTION'
                              ? 'badge-warning'
                              : 'badge-danger'
                          }`}
                        >
                          {assessment.score}/100 • {assessment.grade}
                        </span>
                      ) : (
                        <span className="badge" style={{ background: '#1e293b', color: 'var(--text-subtle)' }}>
                          UNSCANNED
                        </span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-subtle)', fontSize: '0.8rem' }}>
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          onClick={() => handleDownload(doc._id, doc.originalFilename)}
                          className="btn-secondary"
                          style={{ padding: '6px 10px' }}
                          title="Decrypt & Download"
                        >
                          <Download size={14} color="#06b6d4" />
                        </button>
                        <button
                          onClick={() => {
                            setShareDoc(doc);
                            setGeneratedShare(null);
                          }}
                          className="btn-secondary"
                          style={{ padding: '6px 10px' }}
                          title="Generate Share Link"
                        >
                          <Share2 size={14} color="#818cf8" />
                        </button>
                        <button
                          onClick={() => handleScanPrivacy(doc._id)}
                          className="btn-secondary"
                          style={{ padding: '6px 10px' }}
                          title="Run Privacy & PII Scan"
                        >
                          <Eye size={14} color="#10b981" />
                        </button>
                        <button
                          onClick={() => openEditModal(doc)}
                          className="btn-secondary"
                          style={{ padding: '6px 10px' }}
                          title="Edit Metadata"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(doc._id, doc.title)}
                          className="btn-danger"
                          style={{ padding: '6px 10px' }}
                          title="Delete Document"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit Metadata Modal */}
      {editDoc && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
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
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>Edit Document Metadata</h3>
              <button
                onClick={() => setEditDoc(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-subtle)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Document Title
                </label>
                <input
                  type="text"
                  required
                  className="input-field"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Category
                </label>
                <select
                  className="input-field"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                >
                  {CATEGORIES.filter((c) => c !== 'ALL').map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="taxes, 2026, passport, legal"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Notes &amp; Security Remarks
                </label>
                <textarea
                  className="input-field"
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button type="button" onClick={() => setEditDoc(null)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={savingEdit} className="btn-primary">
                  {savingEdit ? 'Saving...' : 'Update Metadata'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Share Document Modal */}
      {shareDoc && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
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
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
                Secure Share: {shareDoc.title}
              </h3>
              <button
                onClick={() => setShareDoc(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-subtle)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {generatedShare ? (
              <div>
                <div
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    marginBottom: '20px',
                  }}
                >
                  <p style={{ color: '#34d399', fontWeight: 700, fontSize: '0.9rem', marginBottom: '6px' }}>
                    Share Link Ready!
                  </p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Copy this link and send it to the recipient. The link is valid for {shareExpiresHours}h and max{' '}
                    {generatedShare.maxViews} views.
                  </p>
                  <div
                    style={{
                      marginTop: '12px',
                      background: '#090d16',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-subtle)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.8rem',
                      color: '#22d3ee',
                      wordBreak: 'break-all',
                    }}
                  >
                    {`${window.location.origin}/share/${generatedShare.token}`}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/share/${generatedShare.token}`);
                      alert('Share link copied to clipboard!');
                    }}
                    className="btn-primary"
                  >
                    Copy Link
                  </button>
                  <button onClick={() => setShareDoc(null)} className="btn-secondary">
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateShare} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Recipient Email (Optional)
                  </label>
                  <input
                    type="email"
                    className="input-field"
                    placeholder="recipient@partner.com"
                    value={shareRecipient}
                    onChange={(e) => setShareRecipient(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                      Permission
                    </label>
                    <select
                      className="input-field"
                      value={sharePermission}
                      onChange={(e) => setSharePermission(e.target.value)}
                    >
                      <option value="VIEW">Preview Metadata Only</option>
                      <option value="DOWNLOAD">Allow Decrypted Download</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                      Max Views Allowed
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      className="input-field"
                      value={shareMaxViews}
                      onChange={(e) => setShareMaxViews(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                      Expires In
                    </label>
                    <select
                      className="input-field"
                      value={shareExpiresHours}
                      onChange={(e) => setShareExpiresHours(e.target.value)}
                    >
                      <option value={1}>1 Hour</option>
                      <option value={24}>24 Hours</option>
                      <option value={72}>3 Days</option>
                      <option value={168}>7 Days</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                      Passphrase Protection (Optional)
                    </label>
                    <input
                      type="password"
                      className="input-field"
                      placeholder="Enter passphrase"
                      value={sharePassphrase}
                      onChange={(e) => setSharePassphrase(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                  <button type="button" onClick={() => setShareDoc(null)} className="btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={sharing} className="btn-primary">
                    {sharing ? 'Generating Link...' : 'Create Secure Link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* View Document Details Modal */}
      {viewDetailsDoc && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div className="glass-card" style={{ width: '100%', maxWidth: '600px', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>Document Security Details</h3>
              <button
                onClick={() => setViewDetailsDoc(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-subtle)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.875rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>TITLE</span>
                <span style={{ color: '#fff', fontWeight: 600 }}>{viewDetailsDoc.title}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>ORIGINAL FILE</span>
                <span style={{ color: '#fff' }}>{viewDetailsDoc.originalFilename}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>MIME TYPE</span>
                  <span style={{ color: '#fff' }}>{viewDetailsDoc.mimeType}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>STORAGE FILE</span>
                  <span style={{ color: '#22d3ee', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                    {viewDetailsDoc.storageFilename}
                  </span>
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>SHA-256 CHECKSUM</span>
                <span style={{ color: 'var(--text-subtle)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', wordBreak: 'break-all' }}>
                  {viewDetailsDoc.checksumSha256}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>CRYPTOGRAPHIC ALGORITHM</span>
                <span className="badge badge-cyan">AES-256-GCM AEAD (12-byte IV, 16-byte Auth Tag)</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button onClick={() => setViewDetailsDoc(null)} className="btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

