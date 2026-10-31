# VaultVerse — MongoDB Database Design & Data Modeling Specification

This document details the MongoDB 8.x schema design, field constraints, indexing strategies, relationships, and data-integrity rules implemented via Mongoose.

---

## 1. Schema Overview & Entity-Relationship Model

VaultVerse models all domain entities through structured Mongoose schemas enforcing:
- Data type validation and boundary limits.
- Unique compound indexes to prevent duplicates.
- Foreign key references via `ObjectId` referencing parent collections.
- Automated creation and update timestamps.
- Zero cleartext storage of secrets, tokens, or master keys.

---

## 2. Collection Specifications

### 2.1 Collection: `users` (Model: `User`)
Stores account authentication profiles, storage allocations, security lockouts, and user preferences.

```javascript
{
  _id: ObjectId,
  email: String,             // Required, unique index, lowercase, trimmed, email regex
  password: String,          // Required, bcrypt hash (12 salt rounds, never cleartext)
  name: String,              // Required, trimmed, max 100 chars
  role: String,              // Enum: ['USER', 'ADMIN', 'AUDITOR'], default: 'USER'
  authSalt: String,          // Optional client salt
  kdfParams: Object,         // PBKDF2 parameters { algorithm: 'PBKDF2-SHA256', iterations: 600000 }
  status: String,            // Enum: ['ACTIVE', 'LOCKED', 'SUSPENDED'], default: 'ACTIVE'
  storageQuotaBytes: Number, // Default 5,368,709,120 (5 GB)
  storageUsedBytes: Number,  // Default 0
  failedLoginAttempts: Number,// Default 0, increments on invalid password
  lockedUntil: Date,         // Date until lockout expires (15 mins after 5 failed attempts)
  lastLoginAt: Date,         // Timestamp of last successful login
  settings: {
    twoFactorEnabled: Boolean,
    emailAlerts: Boolean,
    defaultRetentionDays: Number,
    autoPrivacyScan: Boolean
  },
  createdAt: Date,
  updatedAt: Date
}
```
**Indexes**:
- `{ email: 1 }` (Unique)

---

### 2.2 Collection: `documents` (Model: `Document`)
Stores encrypted document metadata, envelope encryption keys, checksums, and privacy assessment results.

```javascript
{
  _id: ObjectId,
  userId: ObjectId,          // Ref: 'User', indexed
  title: String,             // Trimmed, max 200 chars
  originalFilename: String,  // Preserved for download Content-Disposition
  storageFilename: String,   // Unique random UUID + '.enc' on filesystem
  mimeType: String,          // Original MIME type
  sizeBytes: Number,         // File size in bytes
  checksumSha256: String,    // SHA-256 digest of original plaintext for integrity
  iv: String,                // 12-byte initialization vector (hex)
  authTag: String,           // 16-byte GCM authentication tag (hex)
  encryptedDek: String,      // JSON envelope: AES-256-GCM encrypted DEK wrapped in KEK
  category: String,          // Enum: ['IDENTITY', 'FINANCIAL', 'MEDICAL', 'LEGAL', 'PERSONAL', 'TAX', 'EMERGENCY', 'OTHER']
  tags: [String],            // Categorization tags
  notes: String,             // Optional notes, max 2000 chars
  privacyAssessment: {
    scanned: Boolean,
    score: Number,           // 0 to 100
    riskLevel: String,       // Enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
    grade: String,           // Enum: ['EXCELLENT', 'GOOD', 'ATTENTION', 'CRITICAL']
    entityCounts: Mixed,     // Map of detected entity counts
    detectedEntities: [
      {
        type: String,
        label: String,
        maskedValue: String,
        severity: String,
        confidence: String,
        remediation: String
      }
    ],
    scannedAt: Date,
    scanDurationMs: Number
  },
  retentionExpiresAt: Date,  // Auto-expiration date (indexed)
  isArchived: Boolean,
  isDeleted: Boolean,        // Soft-delete flag (indexed)
  deletedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```
**Indexes**:
- `{ userId: 1, isDeleted: 1, createdAt: -1 }` (Optimized document listing)
- `{ userId: 1, category: 1 }` (Category filtering)
- `{ storageFilename: 1 }` (Unique)
- `{ retentionExpiresAt: 1 }` (TTL / cleanup queries)

---

### 2.3 Collection: `trustedcontacts` (Model: `TrustedContact`)
Defines trusted individuals designated to participate in emergency access or view medical directives.

```javascript
{
  _id: ObjectId,
  userId: ObjectId,          // Ref: 'User', indexed
  contactName: String,       // Max 100 chars
  contactEmail: String,      // Lowercase, trimmed, indexed compound with userId
  phone: String,
  relationship: String,      // Enum: ['SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'ATTORNEY', 'PHYSICIAN', 'TRUSTED_ADVISOR', 'FRIEND', 'OTHER']
  status: String,            // Enum: ['PENDING', 'ACTIVE', 'REVOKED']
  invitationTokenHash: String,// SHA-256 hash of invitation token
  invitationExpiresAt: Date,
  permissions: {
    canViewEmergencyProfile: Boolean,
    canRequestEmergencyAccess: Boolean,
    allowedCategories: [String],
    canDownloadDocuments: Boolean
  },
  securityNote: String,
  lastAccessedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```
**Indexes**:
- `{ userId: 1, contactEmail: 1 }` (Unique)

---

### 2.4 Collection: `shares` (Model: `Share`)
Governs time-limited, view-limited, scoped document sharing links.

```javascript
{
  _id: ObjectId,
  documentId: ObjectId,      // Ref: 'Document', indexed
  userId: ObjectId,          // Ref: 'User', indexed
  recipientEmail: String,    // Optional specific recipient restriction
  tokenHash: String,         // SHA-256 hash of URL token (unique index)
  permission: String,        // Enum: ['VIEW', 'DOWNLOAD']
  isPasswordProtected: Boolean,
  passphraseSalt: String,
  passphraseHash: String,    // Bcrypt hash if password protected
  encryptedItemKey: String,  // Optional password-derived key envelope
  maxViews: Number,          // Maximum allowed access count
  currentViews: Number,      // Current view counter
  expiresAt: Date,           // Hard expiration timestamp
  isRevoked: Boolean,        // Revocation flag (indexed)
  revokedAt: Date,
  accessLog: [
    {
      accessedAt: Date,
      ipHash: String,
      userAgentSummary: String
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```
**Indexes**:
- `{ tokenHash: 1 }` (Unique lookup)
- `{ expiresAt: 1 }`
- `{ userId: 1, isRevoked: 1 }`

---

### 2.5 Collection: `accessrequests` (Model: `AccessRequest`)
Tracks emergency access requests lodged by trusted contacts.

```javascript
{
  _id: ObjectId,
  targetUserId: ObjectId,    // Ref: 'User', vault owner whose data is requested
  requesterUserId: ObjectId, // Optional ref to user account if registered
  requesterEmail: String,
  requesterName: String,
  trustedContactId: ObjectId,// Ref: 'TrustedContact'
  requestType: String,       // Enum: ['EMERGENCY', 'LEGAL', 'GENERAL']
  justification: String,     // Max 2000 chars
  status: String,            // Enum: ['PENDING', 'APPROVED', 'REJECTED', 'REVOKED', 'EXPIRED']
  requestTokenHash: String,  // SHA-256 hash of recipient response token
  expiresAt: Date,           // Request decision window
  accessGrantedAt: Date,
  accessExpiresAt: Date,     // Access validity window (e.g. 24h after approval)
  responseNote: String,
  respondedAt: Date,
  designatedCategories: [String],
  createdAt: Date,
  updatedAt: Date
}
```
**Indexes**:
- `{ targetUserId: 1, status: 1 }`
- `{ requestTokenHash: 1 }`
- `{ requesterEmail: 1 }`

---

### 2.6 Collection: `emergencyprofiles` (Model: `EmergencyProfile`)
Stores encrypted medical health directives, living wills, and designated emergency document associations.

```javascript
{
  _id: ObjectId,
  userId: ObjectId,          // Ref: 'User', unique index
  bloodType: String,         // Enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'UNKNOWN']
  allergies: [String],
  chronicConditions: [String],
  medications: [String],
  primaryPhysician: {
    name: String,
    phone: String,
    clinic: String
  },
  insurancePolicy: {
    provider: String,
    policyNumber: String,
    groupNumber: String,
    emergencyPhone: String
  },
  emergencyInstructions: String,
  designatedContactIds: [ObjectId], // Refs to 'TrustedContact'
  emergencyDocumentIds: [ObjectId], // Refs to 'Document'
  autoGrantAfterHours: Number,      // Default 24 hours
  isProfileEnabled: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```
**Indexes**:
- `{ userId: 1 }` (Unique)

---

### 2.7 Collection: `auditlogs` (Model: `AuditLog`)
Maintains an immutable forensic audit trail anchored by SHA-256 hash chaining.

```javascript
{
  _id: ObjectId,
  userId: ObjectId,          // Ref: 'User', null for anonymous events
  actionType: String,        // e.g. 'AUTH_LOGIN', 'DOC_UPLOAD', 'SHARE_ACCESS'
  entityType: String,        // e.g. 'DOCUMENT', 'USER', 'SHARE', 'EMERGENCY'
  entityId: String,          // Identifier of target resource
  ipHash: String,            // SHA-256 salted hash of client IP
  userAgentSummary: String,
  status: String,            // Enum: ['SUCCESS', 'FAILURE', 'BLOCKED']
  metadata: Mixed,           // Context parameters (excluding secrets)
  previousLogHash: String,   // SHA-256 hash of preceding audit record
  logHash: String,           // SHA-256 digest of this block (unique index)
  createdAt: Date,
  updatedAt: Date
}
```
**Indexes**:
- `{ logHash: 1 }` (Unique)
- `{ createdAt: -1 }` (Reverse chronological sorting)
- `{ userId: 1, createdAt: -1 }`

