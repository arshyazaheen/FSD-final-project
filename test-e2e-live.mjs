import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const API_BASE = 'http://localhost:5000/api';
const VITE_PROXY_BASE = 'http://localhost:5173/api';

console.log('================================================================');
console.log(' VaultVerse MERN — Live End-to-End User Verification Script');
console.log('================================================================');

async function run() {
  const testResults = [];
  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      testResults.push({ message, passed: true });
    } else {
      console.error(`  [FAIL] ${message}`);
      testResults.push({ message, passed: false });
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // 1. Health check via Vite Proxy (verifies frontend-to-backend proxy connectivity)
  console.log('\n1. Testing Vite Proxy & Health Endpoint...');
  const healthRes = await fetch(`${VITE_PROXY_BASE}/health`);
  assert(healthRes.status === 200, 'Vite proxy successfully connects to backend /api/health');
  const healthData = await healthRes.json();
  assert(healthData.status === 'HEALTHY', `Health status is HEALTHY (encryption: ${healthData.security.encryption})`);

  // 2. User Registration
  console.log('\n2. Testing User Registration...');
  const uniqueEmail = `dr.alexander.${Date.now()}@vaultverse.io`;
  const userPassword = 'EnterpriseStrongPassword#2026!';
  const regRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: uniqueEmail,
      password: userPassword,
      name: 'Dr. Alexander Vance',
    }),
  });
  assert(regRes.status === 201, `User registered successfully with status 201 (${uniqueEmail})`);
  const regData = await regRes.json();
  assert(regData.token, 'Registration returned JWT access token');
  assert(regData.user && regData.user.name === 'Dr. Alexander Vance', 'Registration confirmed user profile object');

  // 3. User Login & Authentication
  console.log('\n3. Testing User Authentication & Token Acquisition...');
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: uniqueEmail,
      password: userPassword,
    }),
  });
  assert(loginRes.status === 200, 'User logged in successfully with status 200');
  const loginData = await loginRes.json();
  const token = loginData.token;
  assert(token && token.length > 20, 'Acquired valid JWT token');
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 4. Verify /auth/me Profile
  console.log('\n4. Testing Protected Profile Route (/auth/me)...');
  const meRes = await fetch(`${API_BASE}/auth/me`, { headers: authHeaders });
  assert(meRes.status === 200, 'Fetched /auth/me profile with Bearer token');
  const meData = await meRes.json();
  assert(meData.user.email === uniqueEmail, `Profile matches authenticated user email`);

  // 5. Document Upload with AES-256-GCM Encryption
  console.log('\n5. Testing Document Upload with AES-256-GCM Encryption...');
  const confidentialContent = `TOP SECRET SPECIFICATION
Client: VaultVerse Enterprise
Sensitive PII:
SSN: 123-45-6789
Visa Card: 4532015012345671
API Key: ghp_1234567890abcdefghijklmnopqrstuvwxyz
Diagnostic: Medical condition - Type 1 Diabetes, severe penicillin allergy.
`;
  const originalChecksum = crypto.createHash('sha256').update(confidentialContent).digest('hex');

  // Create multipart form data using Node.js FormData / Blob
  const formData = new FormData();
  formData.append('file', new Blob([confidentialContent], { type: 'text/plain' }), 'confidential_records.txt');
  formData.append('title', 'Confidential Records & Diagnostic Summary');
  formData.append('category', 'MEDICAL');
  formData.append('tags', 'confidential,pii,medical');

  const uploadRes = await fetch(`${API_BASE}/documents/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (uploadRes.status !== 201) {
    console.error('Upload Error Details:', uploadRes.status, await uploadRes.text());
  }
  assert(uploadRes.status === 201, 'Document uploaded successfully with status 201');
  const uploadData = await uploadRes.json();
  const docId = uploadData.document._id;
  assert(docId, `Document created with ID: ${docId}`);
  assert(uploadData.document.encryptedDek, 'Encrypted DEK envelope generated');
  assert(uploadData.document.iv && uploadData.document.authTag, 'AES-256-GCM IV and AuthTag stored');
  const storageFilename = uploadData.document.storageFilename;
  assert(storageFilename, `Storage filename assigned: ${storageFilename}`);

  // 6. Verify On-Disk Ciphertext (Ensure plain text NEVER written to storage)
  console.log('\n6. Verifying Physical File On Disk is Encrypted Ciphertext...');
  const diskPath = path.resolve('C:/Users/HP/.gemini/antigravity/scratch/vaultverse-mern/server/uploads/vault', storageFilename);
  assert(fs.existsSync(diskPath), `Physical file exists on disk at ${diskPath}`);
  const diskBuffer = fs.readFileSync(diskPath);
  const diskText = diskBuffer.toString('utf8');
  assert(!diskText.includes('TOP SECRET'), 'Physical file does NOT contain plaintext content');
  assert(!diskText.includes('4532015012345671'), 'Physical file does NOT contain plaintext credit card numbers');
  console.log(`  Physical file size: ${diskBuffer.length} bytes (AES-256-GCM ciphertext + envelope)`);

  // 7. Document Download and Decryption Verification
  console.log('\n7. Testing Document Download, Decryption & Integrity Check...');
  const downloadRes = await fetch(`${API_BASE}/documents/${docId}/download`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(downloadRes.status === 200, 'Document download returned status 200');
  const decryptedText = await downloadRes.text();
  assert(decryptedText === confidentialContent, 'Decrypted content exactly matches original plaintext');
  const decryptedChecksum = crypto.createHash('sha256').update(decryptedText).digest('hex');
  assert(decryptedChecksum === originalChecksum, `Decrypted SHA-256 checksum (${decryptedChecksum}) matches original`);

  // 8. Privacy Analysis & PII Scanning
  console.log('\n8. Testing Privacy Analysis & Sensitivity Assessment...');
  const scanRes = await fetch(`${API_BASE}/documents/${docId}/scan`, {
    method: 'POST',
    headers: authHeaders,
  });
  assert(scanRes.status === 200, 'Privacy scan completed with status 200');
  const scanData = await scanRes.json();
  const detectedEntities = scanData.assessment.detectedEntities;
  assert(detectedEntities.length > 0, `Detected ${detectedEntities.length} PII violations`);
  const ruleTypes = detectedEntities.map(f => f.type);
  console.log(`  Detected PII Types: ${ruleTypes.join(', ')}`);
  assert(ruleTypes.includes('US_SSN') || ruleTypes.includes('PAYMENT_CARD') || ruleTypes.includes('SECRET_KEY'), 'Identified critical PII elements');

  const privacyOverviewRes = await fetch(`${API_BASE}/privacy/overview`, { headers: authHeaders });
  assert(privacyOverviewRes.status === 200, 'Privacy overview fetched successfully');
  const overviewData = await privacyOverviewRes.json();
  const ov = overviewData.overview;
  console.log(`  Vault Security Posture Score: ${ov.overallScore}/100, Grade: ${ov.overallGrade}`);
  assert(typeof ov.overallScore === 'number', 'Calculated numerical privacy posture score');

  // 9. Emergency Information Management
  console.log('\n9. Testing Emergency Profile Configuration...');
  const emProfileRes = await fetch(`${API_BASE}/emergency/profile`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      bloodType: 'O+',
      allergies: ['Penicillin', 'Sulfa drugs'],
      medications: ['Metformin 500mg twice daily', 'Insulin Glargine'],
      chronicConditions: ['Type 1 Diabetes'],
      primaryPhysician: {
        name: 'Dr. Gregory House',
        phone: '+1-555-0199',
        clinic: 'Princeton Plainsboro',
      },
      emergencyInstructions: 'Carrier of medical alert bracelet.',
    }),
  });
  if (emProfileRes.status !== 200) {
    console.error('Emergency error:', emProfileRes.status, await emProfileRes.text());
  }
  assert(emProfileRes.status === 200, 'Emergency profile updated successfully');
  const emProfileData = await emProfileRes.json();
  assert(emProfileData.profile.bloodType === 'O+', 'Blood type stored correctly');

  // 10. Trusted Contact Management
  console.log('\n10. Testing Trusted Contact Management...');
  const addContactRes = await fetch(`${API_BASE}/trusted-contacts`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      contactName: 'Dr. Sarah Connor',
      contactEmail: `sarah.connor.${Date.now()}@emergency-response.org`,
      phone: '+1-555-0144',
      relationship: 'PHYSICIAN',
      securityNote: 'Hospital chief emergency officer',
      permissions: {
        canViewEmergencyProfile: true,
        canRequestEmergencyAccess: true,
        canDownloadDocuments: true,
        allowedCategories: ['EMERGENCY', 'MEDICAL', 'IDENTITY'],
      },
    }),
  });
  if (addContactRes.status !== 201) {
    console.error('Contact error:', addContactRes.status, await addContactRes.text());
  }
  assert(addContactRes.status === 201, 'Trusted contact added with status 201');
  const contactData = await addContactRes.json();
  const contactId = contactData.contact._id;
  assert(contactId, `Trusted contact created with ID: ${contactId}`);

  // 11. Scoped Sharing & Time-Limited Links with Password
  console.log('\n11. Testing Scoped Time-Limited Sharing with Passphrase Protection...');
  const sharePassword = 'ShareAccessSecret2026!';
  const createShareRes = await fetch(`${API_BASE}/share`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      documentId: docId,
      passphrase: sharePassword,
      expiresInHours: 24,
      maxViews: 3,
      permission: 'DOWNLOAD',
    }),
  });
  assert(createShareRes.status === 201, 'Share link created with status 201');
  const shareData = await createShareRes.json();
  const rawShareToken = shareData.share.token;
  assert(rawShareToken, `Share link generated with token: ${rawShareToken}`);
  console.log(`  Full Share URL: http://localhost:5173/share/${rawShareToken}`);

  // Test public access without passphrase (should prompt for passphrase)
  const pubAccessPrompt = await fetch(`${API_BASE}/share/access/${rawShareToken}`);
  assert(pubAccessPrompt.status === 401, 'Public access without passphrase prompted for passphrase (401)');

  // Test public access with correct passphrase
  const pubAccessOk = await fetch(`${API_BASE}/share/access/${rawShareToken}?passphrase=${encodeURIComponent(sharePassword)}`);
  assert(pubAccessOk.status === 200, 'Public access granted with valid passphrase (200)');
  const pubDocData = await pubAccessOk.json();
  assert(pubDocData.document.title === 'Confidential Records & Diagnostic Summary', 'Public share returned correct document metadata');

  // Test public download
  const pubDownloadOk = await fetch(`${API_BASE}/share/access/${rawShareToken}/download?passphrase=${encodeURIComponent(sharePassword)}`);
  assert(pubDownloadOk.status === 200, 'Public download granted with valid passphrase (200)');
  const pubDecrypted = await pubDownloadOk.text();
  assert(pubDecrypted === confidentialContent, 'Publicly downloaded decrypted document matches original plaintext');

  // 12. Forensic Audit Log & Hash Chaining Verification
  console.log('\n12. Testing Forensic Audit Logging & Cryptographic SHA-256 Hash Chain...');
  const auditRes = await fetch(`${API_BASE}/audit`, { headers: authHeaders });
  assert(auditRes.status === 200, 'Audit log endpoint returned status 200');
  const auditData = await auditRes.json();
  const totalLogs = auditData.pagination?.total || auditData.logs?.length || 0;
  console.log(`  Recorded ${totalLogs} audit trail events for user`);
  assert(totalLogs >= 5, 'Recorded multiple lifecycle audit events');

  const verifyChainRes = await fetch(`${API_BASE}/audit/verify`, { headers: authHeaders });
  assert(verifyChainRes.status === 200, 'Audit verification endpoint returned status 200');
  const chainData = await verifyChainRes.json();
  const verification = chainData.verification;
  console.log(`  Hash Chain Status: ${verification.valid ? 'TAMPER-EVIDENT VALID' : 'COMPROMISED'} (Checked ${verification.totalEntries} entries)`);
  assert(verification.valid === true, 'Forensic cryptographic hash chain verified intact and untampered');

  console.log('\n================================================================');
  console.log(` ALL ${testResults.length} LIVE END-TO-END VERIFICATION CHECKS PASSED!`);
  console.log('================================================================\n');
}

run().catch(err => {
  console.error('\n[FATAL ERROR during verification]:', err);
  process.exit(1);
});
