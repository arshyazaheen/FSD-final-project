import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import mongoose from 'mongoose';
import Document from '../models/Document.js';
import User from '../models/User.js';
import {
  generateDEK,
  encryptBufferAESGCM,
  decryptBufferAESGCM,
  wrapKey,
  unwrapKey,
  computeSHA256,
} from '../utils/cryptoEngine.js';
import { scanTextForPII } from '../utils/piiRules.js';
import { calculatePrivacyScore } from '../utils/privacyScorer.js';
import { recordAuditEvent } from './auditService.js';

const VAULT_STORAGE_DIR = path.resolve(process.env.STORAGE_DIR || './uploads', 'vault');

// Ensure vault directory exists
async function ensureStorageDir() {
  await fs.mkdir(VAULT_STORAGE_DIR, { recursive: true });
}

// Persistent Storage Handlers (supports both Local Disk and MongoDB Atlas GridFS)
async function writeCiphertext(storageFilename, buffer) {
  if (process.env.STORAGE_TYPE === 'gridfs' && mongoose.connection.readyState === 1) {
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'vault_ciphertexts' });
    const uploadStream = bucket.openUploadStream(storageFilename);
    return new Promise((resolve, reject) => {
      uploadStream.end(buffer, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
  await ensureStorageDir();
  const storageFilePath = path.join(VAULT_STORAGE_DIR, storageFilename);
  await fs.writeFile(storageFilePath, buffer);
}

async function readCiphertext(storageFilename) {
  if (process.env.STORAGE_TYPE === 'gridfs' && mongoose.connection.readyState === 1) {
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'vault_ciphertexts' });
    const downloadStream = bucket.openDownloadStreamByName(storageFilename);
    const chunks = [];
    return new Promise((resolve, reject) => {
      downloadStream.on('data', (chunk) => chunks.push(chunk));
      downloadStream.on('error', (err) => reject(err));
      downloadStream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }
  const storageFilePath = path.join(VAULT_STORAGE_DIR, storageFilename);
  return await fs.readFile(storageFilePath);
}

/**
 * Encrypt and store document securely
 */
export async function uploadAndEncryptDocument({
  file,
  userId,
  title,
  category = 'PERSONAL',
  tags = [],
  notes = '',
  retentionDays = 0,
  ipAddress = '127.0.0.1',
  userAgent = 'Unknown',
}) {
  await ensureStorageDir();

  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  // Storage quota validation
  if (user.storageUsedBytes + file.size > user.storageQuotaBytes) {
    throw new Error('Storage quota exceeded. Please upgrade your storage capacity.');
  }

  // 1. Generate unique 256-bit DEK for this document
  const dek = generateDEK();

  // 2. Encrypt buffer using AES-256-GCM
  const { ciphertextBuffer, ivHex, authTagHex } = encryptBufferAESGCM(file.buffer, dek);

  // 3. Compute original file SHA-256 checksum for integrity verification
  const checksumSha256 = computeSHA256(file.buffer);

  // 4. Wrap DEK with server master key (Envelope Encryption)
  const encryptedDek = wrapKey(dek);

  // 5. Generate secure random filename for ciphertext storage
  const storageFilename = `${crypto.randomUUID()}.enc`;

  // 6. Write ciphertext to persistent storage (GridFS on cloud / local disk fallback)
  await writeCiphertext(storageFilename, ciphertextBuffer);

  // 7. Perform privacy analysis if file is text/json/csv/xml/code
  let privacyAssessment = {
    scanned: false,
    score: 100,
    riskLevel: 'LOW',
    grade: 'EXCELLENT',
    entityCounts: {},
    detectedEntities: [],
    scannedAt: null,
    scanDurationMs: 0,
  };

  const isTextual =
    file.mimetype.startsWith('text/') ||
    file.mimetype === 'application/json' ||
    file.mimetype === 'application/xml' ||
    file.mimetype === 'application/javascript' ||
    file.originalname.match(/\.(txt|md|csv|json|xml|log|env|yml|yaml|ts|js|py)$/i);

  if (isTextual) {
    try {
      const textContent = file.buffer.toString('utf-8');
      const scanResult = scanTextForPII(textContent);
      const scoreReport = calculatePrivacyScore(scanResult, {
        hasRetentionExpiry: retentionDays > 0,
        hasActiveShareLink: false,
      });

      privacyAssessment = {
        scanned: true,
        score: scoreReport.score,
        riskLevel: scoreReport.riskLevel,
        grade: scoreReport.grade,
        entityCounts: scanResult.entitiesByType,
        detectedEntities: scanResult.entities.map((e) => ({
          type: e.type,
          label: e.label,
          maskedValue: e.maskedValue,
          severity: e.severity,
          confidence: e.confidence,
          remediation: e.remediation,
        })),
        scannedAt: new Date(),
        scanDurationMs: scanResult.scanDurationMs,
      };
    } catch (scanErr) {
      console.warn('[PrivacyScan] Text scan warning:', scanErr.message);
    }
  }

  // 8. Calculate retention expiration date
  let retentionExpiresAt = null;
  if (retentionDays && Number(retentionDays) > 0) {
    retentionExpiresAt = new Date(Date.now() + Number(retentionDays) * 24 * 60 * 60 * 1000);
  }

  // 9. Persist document metadata in MongoDB
  const normalizedCategory = (category || 'PERSONAL').toUpperCase();
  const doc = await Document.create({
    userId,
    title: title || file.originalname,
    originalFilename: file.originalname,
    storageFilename,
    mimeType: file.mimetype || 'application/octet-stream',
    sizeBytes: file.size,
    checksumSha256,
    iv: ivHex,
    authTag: authTagHex,
    encryptedDek,
    category: normalizedCategory,
    tags: Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(',').map((t) => t.trim()) : [],
    notes,
    privacyAssessment,
    retentionExpiresAt,
  });

  // 10. Update user storage usage
  user.storageUsedBytes += file.size;
  await user.save();

  // 11. Append immutable audit log event
  await recordAuditEvent({
    userId,
    actionType: 'DOC_UPLOAD',
    entityType: 'DOCUMENT',
    entityId: doc._id.toString(),
    ipAddress,
    userAgent,
    status: 'SUCCESS',
    metadata: {
      originalFilename: file.originalname,
      sizeBytes: file.size,
      category,
      checksumSha256,
      privacyScore: privacyAssessment.score,
    },
  });

  return doc;
}

/**
 * Decrypt and retrieve document buffer for download
 */
export async function downloadAndDecryptDocument({
  documentId,
  userId = null,
  ipAddress = '127.0.0.1',
  userAgent = 'Unknown',
  bypassOwnership = false,
}) {
  const doc = await Document.findById(documentId);
  if (!doc || doc.isDeleted) {
    throw new Error('Document not found or has been deleted');
  }

  if (!bypassOwnership && userId && doc.userId.toString() !== userId.toString()) {
    await recordAuditEvent({
      userId,
      actionType: 'UNAUTHORIZED_ACCESS_ATTEMPT',
      entityType: 'DOCUMENT',
      entityId: documentId,
      ipAddress,
      userAgent,
      status: 'BLOCKED',
      metadata: { targetOwner: doc.userId.toString() },
    });
    const err = new Error('Unauthorized: You do not have permission to access this document');
    err.statusCode = 403;
    throw err;
  }

  let ciphertextBuffer;
  try {
    ciphertextBuffer = await readCiphertext(doc.storageFilename);
  } catch (readErr) {
    throw new Error('Ciphertext file missing from secure vault storage');
  }

  // Unwrap DEK and decrypt AES-256-GCM ciphertext
  const dek = unwrapKey(doc.encryptedDek);
  const decryptedBuffer = decryptBufferAESGCM(ciphertextBuffer, dek, doc.iv, doc.authTag);

  // Validate integrity checksum
  const decryptedChecksum = computeSHA256(decryptedBuffer);
  if (decryptedChecksum !== doc.checksumSha256) {
    throw new Error('Cryptographic integrity check failed. Data may have been tampered with.');
  }

  await recordAuditEvent({
    userId: userId || doc.userId,
    actionType: 'DOC_DOWNLOAD',
    entityType: 'DOCUMENT',
    entityId: doc._id.toString(),
    ipAddress,
    userAgent,
    status: 'SUCCESS',
    metadata: { filename: doc.originalFilename },
  });

  return {
    buffer: decryptedBuffer,
    originalFilename: doc.originalFilename,
    mimeType: doc.mimeType,
  };
}

/**
 * Get user document list with filtering, searching, and pagination
 */
export async function getUserDocuments({ userId, category, search, page = 1, limit = 20 }) {
  const query = { userId, isDeleted: false };

  if (category && category !== 'ALL') {
    query.category = category;
  }

  if (search && typeof search === 'string') {
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.$or = [
      { title: { $regex: escapedSearch, $options: 'i' } },
      { originalFilename: { $regex: escapedSearch, $options: 'i' } },
      { tags: { $in: [new RegExp(escapedSearch, 'i')] } },
    ];
  }

  const skip = (Math.max(1, page) - 1) * limit;
  const [documents, total] = await Promise.all([
    Document.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .select('-encryptedDek -iv -authTag'),
    Document.countDocuments(query),
  ]);

  return {
    documents,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Retrieve single document details
 */
export async function getDocumentById({ documentId, userId }) {
  const doc = await Document.findOne({ _id: documentId, userId, isDeleted: false }).select(
    '-encryptedDek -iv -authTag'
  );
  if (!doc) {
    const err = new Error('Document not found');
    err.statusCode = 404;
    throw err;
  }
  return doc;
}

/**
 * Update document metadata (title, category, tags, notes, retention)
 */
export async function updateDocumentMetadata({
  documentId,
  userId,
  title,
  category,
  tags,
  notes,
  retentionDays,
  ipAddress = '127.0.0.1',
  userAgent = 'Unknown',
}) {
  const doc = await Document.findOne({ _id: documentId, userId, isDeleted: false });
  if (!doc) {
    const err = new Error('Document not found');
    err.statusCode = 404;
    throw err;
  }

  if (title !== undefined) doc.title = title.trim();
  if (category !== undefined) doc.category = category.toUpperCase();
  if (tags !== undefined) {
    doc.tags = Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(',').map((t) => t.trim()) : [];
  }
  if (notes !== undefined) doc.notes = notes;
  if (retentionDays !== undefined) {
    doc.retentionExpiresAt =
      retentionDays > 0 ? new Date(Date.now() + Number(retentionDays) * 24 * 60 * 60 * 1000) : null;
  }

  await doc.save();

  await recordAuditEvent({
    userId,
    actionType: 'DOC_UPDATE_METADATA',
    entityType: 'DOCUMENT',
    entityId: doc._id.toString(),
    ipAddress,
    userAgent,
    status: 'SUCCESS',
    metadata: { title: doc.title, category: doc.category },
  });

  return doc;
}

/**
 * Soft delete document and reclaim storage quota
 */
export async function deleteDocument({ documentId, userId, ipAddress = '127.0.0.1', userAgent = 'Unknown' }) {
  const doc = await Document.findOne({ _id: documentId, userId, isDeleted: false });
  if (!doc) {
    const err = new Error('Document not found or already deleted');
    err.statusCode = 404;
    throw err;
  }

  doc.isDeleted = true;
  doc.deletedAt = new Date();
  await doc.save();

  // Adjust user storage
  await User.findByIdAndUpdate(userId, {
    $inc: { storageUsedBytes: -doc.sizeBytes },
  });

  await recordAuditEvent({
    userId,
    actionType: 'DOC_DELETE',
    entityType: 'DOCUMENT',
    entityId: doc._id.toString(),
    ipAddress,
    userAgent,
    status: 'SUCCESS',
    metadata: { filename: doc.originalFilename, sizeBytes: doc.sizeBytes },
  });

  return { success: true, message: 'Document deleted successfully' };
}

