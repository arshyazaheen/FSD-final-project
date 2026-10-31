import {
  uploadAndEncryptDocument,
  downloadAndDecryptDocument,
  getUserDocuments,
  getDocumentById,
  updateDocumentMetadata,
  deleteDocument,
} from '../services/documentService.js';
import Document from '../models/Document.js';
import { scanTextForPII } from '../utils/piiRules.js';
import { calculatePrivacyScore } from '../utils/privacyScorer.js';
import { recordAuditEvent } from '../services/auditService.js';
import path from 'path';
import fs from 'fs/promises';
import { unwrapKey, decryptBufferAESGCM } from '../utils/cryptoEngine.js';

const VAULT_STORAGE_DIR = path.resolve(process.env.STORAGE_DIR || './uploads', 'vault');

export async function upload(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided for upload',
        code: 'MISSING_FILE',
      });
    }

    const { title, category, tags, notes, retentionDays } = req.body;

    const document = await uploadAndEncryptDocument({
      file: req.file,
      userId: req.user._id,
      title,
      category,
      tags,
      notes,
      retentionDays,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || 'Unknown',
    });

    res.status(201).json({
      success: true,
      message: 'Document encrypted with AES-256-GCM and stored securely in vault.',
      document,
    });
  } catch (error) {
    next(error);
  }
}

export async function getDocuments(req, res, next) {
  try {
    const { category, search, page, limit } = req.query;
    const result = await getUserDocuments({
      userId: req.user._id,
      category,
      search,
      page,
      limit,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getDocument(req, res, next) {
  try {
    const doc = await getDocumentById({
      documentId: req.params.id,
      userId: req.user._id,
    });

    res.json({
      success: true,
      document: doc,
    });
  } catch (error) {
    next(error);
  }
}

export async function download(req, res, next) {
  try {
    const { buffer, originalFilename, mimeType } = await downloadAndDecryptDocument({
      documentId: req.params.id,
      userId: req.user._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || 'Unknown',
    });

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(originalFilename)}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
}

export async function updateMetadata(req, res, next) {
  try {
    const { title, category, tags, notes, retentionDays } = req.body;
    const doc = await updateDocumentMetadata({
      documentId: req.params.id,
      userId: req.user._id,
      title,
      category,
      tags,
      notes,
      retentionDays,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || 'Unknown',
    });

    res.json({
      success: true,
      message: 'Document metadata updated successfully',
      document: doc,
    });
  } catch (error) {
    next(error);
  }
}

export async function remove(req, res, next) {
  try {
    const result = await deleteDocument({
      documentId: req.params.id,
      userId: req.user._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || 'Unknown',
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export async function scanPrivacy(req, res, next) {
  try {
    const doc = await Document.findOne({ _id: req.params.id, userId: req.user._id, isDeleted: false });
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    const storageFilePath = path.join(VAULT_STORAGE_DIR, doc.storageFilename);
    const ciphertext = await fs.readFile(storageFilePath);
    const dek = unwrapKey(doc.encryptedDek);
    const plaintext = decryptBufferAESGCM(ciphertext, dek, doc.iv, doc.authTag);

    const text = plaintext.toString('utf-8');
    const scanResult = scanTextForPII(text);
    const scoreReport = calculatePrivacyScore(scanResult, {
      hasRetentionExpiry: !!doc.retentionExpiresAt,
      hasActiveShareLink: false,
    });

    doc.privacyAssessment = {
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

    await doc.save();

    await recordAuditEvent({
      userId: req.user._id,
      actionType: 'PRIVACY_SCAN_TRIGGERED',
      entityType: 'DOCUMENT',
      entityId: doc._id.toString(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || 'Unknown',
      status: 'SUCCESS',
      metadata: { score: scoreReport.score, grade: scoreReport.grade },
    });

    res.json({
      success: true,
      assessment: doc.privacyAssessment,
      report: scoreReport,
    });
  } catch (error) {
    next(error);
  }
}

