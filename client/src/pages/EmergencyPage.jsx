import React, { useState, useEffect } from 'react';
import { emergencyApi, documentsApi } from '../services/api';
import {
  HeartPulse,
  Save,
  CheckCircle,
  AlertCircle,
  Shield,
  FileText,
  UserCheck,
  Clock,
  Phone,
} from 'lucide-react';

const BLOOD_TYPES = ['UNKNOWN', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function EmergencyPage() {
  const [profile, setProfile] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [bloodType, setBloodType] = useState('UNKNOWN');
  const [allergies, setAllergies] = useState('');
  const [chronicConditions, setChronicConditions] = useState('');
  const [medications, setMedications] = useState('');
  const [physicianName, setPhysicianName] = useState('');
  const [physicianPhone, setPhysicianPhone] = useState('');
  const [physicianClinic, setPhysicianClinic] = useState('');
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [insurancePolicyNum, setInsurancePolicyNum] = useState('');
  const [insurancePhone, setInsurancePhone] = useState('');
  const [emergencyInstructions, setEmergencyInstructions] = useState('');
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [autoGrantHours, setAutoGrantHours] = useState(24);
  const [isProfileEnabled, setIsProfileEnabled] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const [profileRes, docsRes] = await Promise.all([
          emergencyApi.getProfile(),
          documentsApi.getDocuments({ limit: 100 }),
        ]);

        if (profileRes.data && profileRes.data.success) {
          const p = profileRes.data.profile;
          setProfile(p);
          setBloodType(p.bloodType || 'UNKNOWN');
          setAllergies(Array.isArray(p.allergies) ? p.allergies.join(', ') : '');
          setChronicConditions(Array.isArray(p.chronicConditions) ? p.chronicConditions.join(', ') : '');
          setMedications(Array.isArray(p.medications) ? p.medications.join(', ') : '');
          setPhysicianName(p.primaryPhysician?.name || '');
          setPhysicianPhone(p.primaryPhysician?.phone || '');
          setPhysicianClinic(p.primaryPhysician?.clinic || '');
          setInsuranceProvider(p.insurancePolicy?.provider || '');
          setInsurancePolicyNum(p.insurancePolicy?.policyNumber || '');
          setInsurancePhone(p.insurancePolicy?.emergencyPhone || '');
          setEmergencyInstructions(p.emergencyInstructions || '');
          setSelectedDocIds(p.emergencyDocumentIds ? p.emergencyDocumentIds.map((d) => (d._id ? d._id : d)) : []);
          setAutoGrantHours(p.autoGrantAfterHours ?? 24);
          setIsProfileEnabled(p.isProfileEnabled ?? true);
        }

        if (docsRes.data && docsRes.data.success) {
          setDocuments(docsRes.data.documents || []);
        }
      } catch (err) {
        console.error('Error loading emergency profile:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleToggleDoc = (docId) => {
    if (selectedDocIds.includes(docId)) {
      setSelectedDocIds(selectedDocIds.filter((id) => id !== docId));
    } else {
      setSelectedDocIds([...selectedDocIds, docId]);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const payload = {
        bloodType,
        allergies: allergies.split(',').map((s) => s.trim()).filter(Boolean),
        chronicConditions: chronicConditions.split(',').map((s) => s.trim()).filter(Boolean),
        medications: medications.split(',').map((s) => s.trim()).filter(Boolean),
        primaryPhysician: {
          name: physicianName,
          phone: physicianPhone,
          clinic: physicianClinic,
        },
        insurancePolicy: {
          provider: insuranceProvider,
          policyNumber: insurancePolicyNum,
          emergencyPhone: insurancePhone,
        },
        emergencyInstructions,
        emergencyDocumentIds: selectedDocIds,
        autoGrantAfterHours: Number(autoGrantHours),
        isProfileEnabled,
      };

      const res = await emergencyApi.updateProfile(payload);
      if (res.data && res.data.success) {
        setSuccessMessage('Emergency profile & medical directives updated successfully.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update emergency profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
            Emergency Health &amp; Disaster Directives
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            Pre-configure vital health information, living wills, and emergency documents accessible to trusted contacts during crises.
          </p>
        </div>
      </div>

      {successMessage && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#34d399',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '24px',
          }}
        >
          <CheckCircle size={16} />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.4)',
            color: '#fda4af',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '24px',
          }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Vital Health Information Card */}
        <div className="glass-card" style={{ padding: '28px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HeartPulse size={18} color="#f43f5e" /> Vital Medical Parameters
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Blood Type
              </label>
              <select
                className="input-field"
                value={bloodType}
                onChange={(e) => setBloodType(e.target.value)}
              >
                {BLOOD_TYPES.map((bt) => (
                  <option key={bt} value={bt}>
                    {bt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Known Critical Allergies (comma separated)
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Penicillin, Sulfa drugs, Peanuts, Latex"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Chronic Conditions / Diagnoses
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Type 1 Diabetes, Hypertension, Asthma"
                value={chronicConditions}
                onChange={(e) => setChronicConditions(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Active Prescribed Medications
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Insulin, Lisinopril 10mg, Albuterol"
                value={medications}
                onChange={(e) => setMedications(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Primary Physician & Insurance Card */}
        <div className="glass-card" style={{ padding: '28px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Phone size={18} color="#06b6d4" /> Healthcare Provider &amp; Insurance Details
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Primary Physician Name
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Dr. Gregory House"
                value={physicianName}
                onChange={(e) => setPhysicianName(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Physician Phone
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="+1 (555) 019-2831"
                value={physicianPhone}
                onChange={(e) => setPhysicianPhone(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Hospital / Clinic
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Princeton General Hospital"
                value={physicianClinic}
                onChange={(e) => setPhysicianClinic(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Insurance Provider
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="BlueCross BlueShield"
                value={insuranceProvider}
                onChange={(e) => setInsuranceProvider(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Policy / Member ID
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="BCBS-9912048-A"
                value={insurancePolicyNum}
                onChange={(e) => setInsurancePolicyNum(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Insurance 24/7 Hotline
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="1-800-555-HELP"
                value={insurancePhone}
                onChange={(e) => setInsurancePhone(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Instructions & Designated Emergency Documents Card */}
        <div className="glass-card" style={{ padding: '28px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} color="#818cf8" /> Emergency Instructions &amp; Designated Vault Documents
          </h2>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Special Medical Directives &amp; First Responder Notes
            </label>
            <textarea
              className="input-field"
              rows={3}
              placeholder="Provide advance directives, DNR wishes, or specific hospital admission instructions..."
              value={emergencyInstructions}
              onChange={(e) => setEmergencyInstructions(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '10px' }}>
              Select Documents to Include in Emergency Access Package:
            </label>
            {documents.length === 0 ? (
              <p style={{ fontSize: '0.825rem', color: 'var(--text-subtle)' }}>
                No documents uploaded yet. Upload your health insurance card, living will, or ID in My Documents first.
              </p>
            ) : (
              <div
                style={{
                  maxHeight: '200px',
                  overflowY: 'auto',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                {documents.map((doc) => {
                  const isChecked = selectedDocIds.includes(doc._id);
                  return (
                    <label
                      key={doc._id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        background: isChecked ? 'rgba(6,182,212,0.1)' : 'transparent',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleDoc(doc._id)}
                        />
                        <span style={{ color: '#fff', fontWeight: isChecked ? 600 : 400 }}>{doc.title}</span>
                      </div>
                      <span className="badge badge-indigo" style={{ fontSize: '0.65rem' }}>
                        {doc.category}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Protocol Settings Card */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} color="#f59e0b" /> Emergency Trigger Policies
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'center' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Auto-Grant Delay Window (Hours)
              </label>
              <input
                type="number"
                min={0}
                max={72}
                className="input-field"
                value={autoGrantHours}
                onChange={(e) => setAutoGrantHours(e.target.value)}
              />
              <span style={{ fontSize: '0.725rem', color: 'var(--text-subtle)', marginTop: '4px', display: 'block' }}>
                If you do not respond to an emergency request within this window, access will be granted automatically to verified contacts.
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="checkbox"
                id="emergency-enabled-toggle"
                checked={isProfileEnabled}
                onChange={(e) => setIsProfileEnabled(e.target.checked)}
                style={{ width: '18px', height: '18px' }}
              />
              <label htmlFor="emergency-enabled-toggle" style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                Emergency Access Protocol Enabled
              </label>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button type="submit" disabled={saving} className="btn-primary" style={{ padding: '12px 24px' }}>
            <Save size={16} /> {saving ? 'Saving Directives...' : 'Save Emergency Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}

