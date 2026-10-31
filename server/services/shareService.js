import bcrypt from 'bcryptjs';
import Share from '../models/Share.js';
import Document from '../models/Document.js';
import {
  generateSecureToken,
  hashToken,
  unwrapKey,
  decryptBufferAESGCM,
  computeSHA256,
} from '../utils/cryptoEngine.js';
import { recordAuditEvent, anonymizeIp } from './auditService.js';
import path from 'path';
import fs from 'fs/promises';

const VAULT_STORAGE_DIR = path.resolve(process.env.STORAGE_DIR || './uploads', 'vault');

/**
 * Create a scoped, time-limited, and optionally password-protected share link
 */
export async function createShareLink({
  documentId,
  userId,
  recipientEmail = null,
  permission = 'VIEW',
  maxViews = 5,
  expiresInHours = 24,
  passphrase = null,
  ipAddress = '127.0.0.1',
  userAgent = 'Unknown',
}) {
  const doc = await Document.findOne({ _id: documentId, userId, isDeleted: false });
  if (!doc) {
    const err = new Error('Document not found or access denied');
    err.statusCode = 404;
    throw err;
  }

  // Generate high-entropy 256-bit raw token
  const rawToken = generateSecureToken(32);
  const tokenHash = hashToken(rawToken);

  let isPasswordProtected = false;
  let passphraseSalt = null;
  let passphraseHash = null;

  if (passphrase && passphrase.trim().length > 0) {
    isPasswordProtected = true;
    const salt = await bcrypt.genSalt(10);
    passphraseSalt = salt;
    passphraseHash = await bcrypt.hash(passphrase.trim(), salt);
  }

  const hours = Number(expiresInHours) || 24;
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

  const share = await Share.create({
    documentId,
    userId,
    recipientEmail: recipientEmail ? recipientEmail.toLowerCase().trim() : null,
    tokenHash,
    permission,
    isPasswordProtected,
    passphraseSalt,
    passphraseHash,
    maxViews: Number(maxViews) || 5,
    expiresAt,
  });

  await recordAuditEvent({
    userId,
    actionType: 'SHARE_CREATE',
    entityType: 'SHARE',
    entityId: share._id.toString(),
    ipAddress,
    userAgent,
    status: 'SUCCESS',
    metadata: {
      documentId: doc._id.toString(),
      recipientEmail,
      permission,
      maxViews,
      expiresAt: expiresAt.toISOString(),
      isPasswordProtected,
    },
  });

  return {
    shareId: share._id,
    token: rawToken,
    permission: share.permission,
    isPasswordProtected: share.isPasswordProtected,
    maxViews: share.maxViews,
    expiresAt: share.expiresAt,
    documentTitle: doc.title,
    originalFilename: doc.originalFilename,
  };
}

/**
 * Access a shared document via raw token
 */
export async function accessSharedDocument({
  rawToken,
  passphrase = null,
  ipAddress = '127.0.0.1',
  userAgent = 'Unknown',
}) {
  if (!rawToken) {
    const err = new Error('Share token is required');
    err.statusCode = 400;
    throw err;
  }

  const tokenHash = hashToken(rawToken);
  const share = await Share.findOne({ tokenHash }).populate('documentId');

  if (!share) {
    const err = new Error('Invalid or expired share link');
    err.statusCode = 404;
    throw err;
  }

  const validity = share.isValid();
  if (!validity.valid) {
    await recordAuditEvent({
      userId: share.userId,
      actionType: 'SHARE_ACCESS_REJECTED',
      entityType: 'SHARE',
      entityId: share._id.toString(),
      ipAddress,
      userAgent,
      status: 'BLOCKED',
      metadata: { reason: validity.reason },
    });

    const err = new Error(`Share link is ${validity.reason.toLowerCase().replace('_', ' ')}.`);
    err.statusCode = 410; // Gone
    throw err;
  }

  // Validate passphrase if protected
  if (share.isPasswordProtected) {
    if (!passphrase) {
      const err = new Error('This shared document is password-protected. Please provide passphrase.');
      err.statusCode = 401;
      err.code = 'PASSPHRASE_REQUIRED';
      throw err;
    }
    const isMatch = await bcrypt.compare(passphrase, share.passphraseHash);
    if (!isMatch) {
      await recordAuditEvent({
        userId: share.userId,
        actionType: 'SHARE_PASSPHRASE_FAILED',
        entityType: 'SHARE',
        entityId: share._id.toString(),
        ipAddress,
        userAgent,
        status: 'BLOCKED',
      });
      const err = new Error('Incorrect passphrase for shared resource.');
      err.statusCode = 403;
      err.code = 'INVALID_PASSPHRASE';
      throw err;
    }
  }

  const doc = share.documentId;
  if (!doc || doc.isDeleted) {
    const err = new Error('The requested document is no longer available');
    err.statusCode = 404;
    throw err;
  }

  // Increment view count and record access
  share.currentViews += 1;
  share.accessLog.push({
    accessedAt: new Date(),
    ipHash: anonymizeIp(ipAddress),
    userAgentSummary: userAgent.substring(0, 128),
  });
  await share.save();

  await recordAuditEvent({
    userId: share.userId,
    actionType: 'SHARE_ACCESS',
    entityType: 'SHARE',
    entityId: share._id.toString(),
    ipAddress,
    userAgent,
    status: 'SUCCESS',
    metadata: {
      documentId: doc._id.toString(),
      viewsRemaining: share.maxViews - share.currentViews,
    },
  });

  return {
    shareId: share._id,
    permission: share.permission,
    currentViews: share.currentViews,
    maxViews: share.maxViews,
    expiresAt: share.expiresAt,
    document: {
      id: doc._id,
      title: doc.title,
      originalFilename: doc.originalFilename,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      category: doc.category,
      createdAt: doc.createdAt,
    },
  };
}

/**
 * Download document content from shared link if permission allows
 */
export async function downloadSharedDocumentContent({
  rawToken,
  passphrase = null,
  ipAddress = '127.0.0.1',
  userAgent = 'Unknown',
}) {
  const tokenHash = hashToken(rawToken);
  const share = await Share.findOne({ tokenHash }).populate('documentId');

  if (!share) {
    const err = new Error('Invalid or expired share link');
    err.statusCode = 404;
    throw err;
  }

  const validity = share.isValid();
  if (!validity.valid) {
    const err = new Error(`Share link is ${validity.reason.toLowerCase()}`);
    err.statusCode = 410;
    throw err;
  }

  if (share.permission !== 'DOWNLOAD') {
    const err = new Error('Download permission not granted for this share link');
    err.statusCode = 403;
    throw err;
  }

  if (share.isPasswordProtected) {
    if (!passphrase) {
      const err = new Error('Passphrase required');
      err.statusCode = 401;
      throw err;
    }
    const isMatch = await bcrypt.compare(passphrase, share.passphraseHash);
    if (!isMatch) {
      const err = new Error('Invalid passphrase');
      err.statusCode = 403;
      throw err;
    }
  }

  const doc = share.documentId;
  const storageFilePath = path.join(VAULT_STORAGE_DIR, doc.storageFilename);
  const ciphertextBuffer = await fs.readFile(storageFilePath);
  const dek = unwrapKey(doc.encryptedDek);
  const decryptedBuffer = decryptBufferAESGCM(ciphertextBuffer, dek, doc.iv, doc.authTag);

  return {
    buffer: decryptedBuffer,
    originalFilename: doc.originalFilename,
    mimeType: doc.mimeType,
  };
}

/**
 * Revoke an active share link
 */
export async function revokeShareLink({ shareId, userId, ipAddress = '127.0.0.1', userAgent = 'Unknown' }) {
  const share = await Share.findOne({ _id: shareId, userId });
  if (!share) {
    const err = new Error('Share link not found or unauthorized');
    err.statusCode = 404;
    throw err;
  }

  share.isRevoked = true;
  share.revokedAt = new Date();
  await share.save();

  await recordAuditEvent({
    userId,
    actionType: 'SHARE_REVOKE',
    entityType: 'SHARE',
    entityId: share._id.toString(),
    ipAddress,
    userAgent,
    status: 'SUCCESS',
    metadata: { documentId: share.documentId.toString() },
  });

  return { success: true, message: 'Share link revoked successfully' };
}

/**
 * List all share links created by a user
 */
export async function getUserShareLinks({ userId }) {
  return Share.find({ userId })
    .populate('documentId', 'title originalFilename mimeType category')
    .sort({ createdAt: -1 });
}

