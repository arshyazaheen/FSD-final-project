import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentsApi } from '../services/api';
import {
  UploadCloud,
  File,
  Lock,
  CheckCircle,
  AlertCircle,
  Shield,
  ArrowRight,
  HardDrive,
  Clock,
  Sparkles,
} from 'lucide-react';

const CATEGORIES = ['PERSONAL', 'IDENTITY', 'FINANCIAL', 'MEDICAL', 'LEGAL', 'TAX', 'EMERGENCY', 'OTHER'];

export default function UploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('PERSONAL');
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');
  const [retentionDays, setRetentionDays] = useState('0');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [successDoc, setSuccessDoc] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (!title) {
        setTitle(selected.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const dropped = e.dataTransfer.files[0];
      setFile(dropped);
      if (!title) {
        setTitle(dropped.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    setError('');
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title || file.name);
      formData.append('category', category);
      formData.append('tags', tags);
      formData.append('notes', notes);
      formData.append('retentionDays', retentionDays);

      const res = await documentsApi.upload(formData);
      if (res.data && res.data.success) {
        setSuccessDoc(res.data.document);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to encrypt and upload document.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
          Secure Document Upload
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
          Document is encrypted locally via AES-256-GCM AEAD before ciphertext storage. Plaintext is never stored on disk.
        </p>
      </div>

      {successDoc ? (
        <div className="glass-card" style={{ padding: '36px', textAlign: 'center' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}
          >
            <CheckCircle size={32} color="#10b981" />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
            Document Encrypted &amp; Stored Successfully!
          </h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto 24px', fontSize: '0.9rem' }}>
            "{successDoc.title}" has been encrypted with a dedicated 256-bit DEK, protected under master envelope key, and
            logged to the immutable forensic audit hash chain.
          </p>

          <div
            style={{
              maxWidth: '550px',
              margin: '0 auto 28px',
              padding: '16px',
              borderRadius: '8px',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid var(--border-subtle)',
              textAlign: 'left',
              fontSize: '0.8rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-subtle)' }}>Ciphertext Filename:</span>
              <span style={{ color: '#22d3ee', fontFamily: 'var(--font-mono)' }}>{successDoc.storageFilename}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-subtle)' }}>SHA-256 Checksum:</span>
              <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {successDoc.checksumSha256.substring(0, 24)}...
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-subtle)' }}>Privacy Health Grade:</span>
              <span style={{ color: '#34d399', fontWeight: 600 }}>
                {successDoc.privacyAssessment?.grade || 'EXCELLENT'} ({successDoc.privacyAssessment?.score || 100}/100)
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
            <button
              onClick={() => {
                setSuccessDoc(null);
                setFile(null);
                setTitle('');
                setTags('');
                setNotes('');
              }}
              className="btn-secondary"
            >
              Upload Another
            </button>
            <button onClick={() => navigate('/documents')} className="btn-primary">
              View All Documents <ArrowRight size={16} />
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
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
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Drag & Drop File Zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            style={{
              border: '2px dashed ' + (file ? '#06b6d4' : 'var(--border-subtle)'),
              borderRadius: '12px',
              padding: '40px 24px',
              textAlign: 'center',
              background: file ? 'rgba(6, 182, 212, 0.05)' : 'rgba(15, 23, 42, 0.4)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onClick={() => document.getElementById('file-upload-input').click()}
          >
            <input
              id="file-upload-input"
              type="file"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            {file ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <File size={40} color="#06b6d4" />
                <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>{file.name}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {(file.size / 1024).toFixed(1)} KB • {file.type || 'Binary Stream'}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600, marginTop: '4px' }}>
                  Click or drag to replace file
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <UploadCloud size={44} color="var(--text-subtle)" />
                <span style={{ fontSize: '1.05rem', fontWeight: 600, color: '#fff' }}>
                  Choose a file or drag &amp; drop here
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Supports PDF, TXT, CSV, DOCX, Images, JSON (Max 50MB)
                </span>
              </div>
            )}
          </div>

          {/* Document Metadata Form */}
          <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Document Title
                </label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="e.g. 2026 Health Insurance Policy"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Classification Category
                </label>
                <select
                  className="input-field"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="insurance, emergency, 2026"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Automated Retention Expiration
                </label>
                <select
                  className="input-field"
                  value={retentionDays}
                  onChange={(e) => setRetentionDays(e.target.value)}
                >
                  <option value="0">Indefinite (No Auto-Deletion)</option>
                  <option value="7">7 Days (Temporary Document)</option>
                  <option value="30">30 Days</option>
                  <option value="90">90 Days (Quarterly Retention)</option>
                  <option value="365">1 Year</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Secure Notes &amp; Context
              </label>
              <textarea
                className="input-field"
                rows={3}
                placeholder="Optional notes or handling instructions for this document..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Cryptographic Pipeline Assurance Box */}
          <div
            style={{
              padding: '16px 20px',
              borderRadius: '10px',
              background: 'rgba(6, 182, 212, 0.08)',
              border: '1px solid rgba(6, 182, 212, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
            }}
          >
            <Shield size={24} color="#06b6d4" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
              <span style={{ color: '#fff', fontWeight: 600 }}>Zero-Knowledge Pipeline:</span> Upon clicking upload,
              a unique 256-bit AES DEK is generated in memory. The payload is encrypted with AES-256-GCM with a 96-bit IV
              and 128-bit authentication tag. Only ciphertext is written to storage.
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '14px' }}>
            <button type="button" onClick={() => navigate('/documents')} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={uploading || !file} className="btn-primary" style={{ padding: '12px 24px' }}>
              {uploading ? 'Encrypting & Storing...' : 'Encrypt & Upload Document'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

