import crypto from 'crypto';
import AuditLog from '../models/AuditLog.js';
import { computeSHA256 } from '../utils/cryptoEngine.js';

export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Anonymize client IP address with SHA-256 and server salt for GDPR compliance
 */
export function anonymizeIp(ip) {
  if (!ip) return computeSHA256('127.0.0.1:salt').substring(0, 32);
  const cleanIp = ip.replace(/^::ffff:/, ''); // normalize IPv4-mapped IPv6
  const salt = process.env.JWT_SECRET || 'vaultverse-ip-salt-2026';
  return computeSHA256(`${cleanIp}:${salt}`).substring(0, 32);
}

// Global promise queue to serialize audit records and prevent hash chain forks
let auditQueue = Promise.resolve();

/**
 * Record a tamper-evident audit event bound to the cryptographic hash chain
 */
export async function recordAuditEvent({
  userId = null,
  actionType,
  entityType = 'SYSTEM',
  entityId = null,
  ipAddress = '127.0.0.1',
  userAgent = 'Unknown',
  status = 'SUCCESS',
  metadata = {},
}) {
  return new Promise((resolve, reject) => {
    auditQueue = auditQueue.then(async () => {
      try {
        const result = await internalRecordAuditEvent({
          userId,
          actionType,
          entityType,
          entityId,
          ipAddress,
          userAgent,
          status,
          metadata,
        });
        resolve(result);
      } catch (err) {
        console.error('[AuditService] Failed to record audit event:', err.message);
        reject(err);
      }
    });
  });
}

async function internalRecordAuditEvent(params) {
  // 1. Fetch latest audit log to obtain previous hash
  const lastLog = await AuditLog.findOne().sort({ createdAt: -1 }).select('logHash');
  const previousLogHash = lastLog ? lastLog.logHash : GENESIS_HASH;

  const ipHash = anonymizeIp(params.ipAddress);
  const now = new Date();
  const metadataStr = JSON.stringify(params.metadata || {});
  const userAgentSummary = (params.userAgent || 'Unknown').substring(0, 128);
  const uid = params.userId ? params.userId.toString() : 'anonymous';
  const eid = params.entityId ? params.entityId.toString() : 'none';

  // 2. Compute cryptographic logHash binding all record fields
  const payloadToHash = `${previousLogHash}|${params.actionType}|${params.entityType}|${eid}|${uid}|${ipHash}|${params.status}|${metadataStr}|${now.toISOString()}`;
  const logHash = computeSHA256(payloadToHash);

  // 3. Persist record in database
  const logEntry = await AuditLog.create({
    userId: params.userId || null,
    actionType: params.actionType,
    entityType: params.entityType,
    entityId: eid !== 'none' ? eid : null,
    ipHash,
    userAgentSummary,
    status: params.status,
    metadata: params.metadata,
    previousLogHash,
    logHash,
    createdAt: now,
  });

  return logEntry;
}

/**
 * Verify complete audit log tamper-evident hash chain integrity
 * Returns { valid: boolean, totalChecked: number, brokenAt: number | null, reason: string | null }
 */
export async function verifyAuditChain() {
  const logs = await AuditLog.find().sort({ createdAt: 1 });
  if (logs.length === 0) {
    return { valid: true, totalChecked: 0, brokenAt: null, reason: 'Empty chain is valid' };
  }

  let expectedPrevHash = GENESIS_HASH;

  for (let i = 0; i < logs.length; i++) {
    const entry = logs[i];

    // Check link to previous hash
    if (entry.previousLogHash !== expectedPrevHash) {
      return {
        valid: false,
        totalChecked: i,
        brokenAt: i,
        reason: `Chain broken at index ${i}: previousLogHash ${entry.previousLogHash} does not match expected ${expectedPrevHash}`,
      };
    }

    // Recompute payload hash
    const metadataStr = JSON.stringify(entry.metadata || {});
    const uid = entry.userId ? entry.userId.toString() : 'anonymous';
    const eid = entry.entityId ? entry.entityId.toString() : 'none';
    const payloadToHash = `${entry.previousLogHash}|${entry.actionType}|${entry.entityType}|${eid}|${uid}|${entry.ipHash}|${entry.status}|${metadataStr}|${entry.createdAt.toISOString()}`;
    const calculatedHash = computeSHA256(payloadToHash);

    if (calculatedHash !== entry.logHash) {
      return {
        valid: false,
        totalChecked: i,
        brokenAt: i,
        reason: `Data tampering detected at index ${i}: stored hash ${entry.logHash} does not match recalculated ${calculatedHash}`,
      };
    }

    expectedPrevHash = entry.logHash;
  }

  return { valid: true, totalChecked: logs.length, brokenAt: null, reason: 'Chain integrity verified' };
}

