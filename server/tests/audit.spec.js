import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import AuditLog from '../models/AuditLog.js';
import { verifyAuditChain } from '../services/auditService.js';
import { connectTestDB, closeTestDB, clearTestDB } from './dbHandler.js';

describe('Forensic Audit Logging & SHA-256 Hash Chaining Tests', () => {
  let userToken;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();

    const reg = await request(app).post('/api/auth/register').send({
      name: 'Audited User',
      email: 'audited@vaultverse.io',
      password: 'Password123!',
    });
    userToken = reg.body.token;
  });

  it('should record audit events with anonymized IP and SHA-256 hash', async () => {
    const logs = await AuditLog.find();
    expect(logs.length).toBeGreaterThanOrEqual(1);

    const firstLog = logs[0];
    expect(firstLog.actionType).toBe('AUTH_REGISTER');
    expect(firstLog.ipHash).toBeDefined();
    expect(firstLog.ipHash).not.toBe('127.0.0.1'); // Ensure IP is salted & hashed
    expect(firstLog.logHash).toHaveLength(64);
    expect(firstLog.previousLogHash).toBeDefined();
  });

  it('should maintain tamper-evident hash chaining across multiple operations', async () => {
    // 1. Upload a document
    await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${userToken}`)
      .field('title', 'Chain Test Doc')
      .attach('file', Buffer.from('Chain test content'), 'chain.txt');

    // 2. Update profile
    await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'Audited User Updated' });

    // 3. Verify audit chain integrity
    const verification = await verifyAuditChain();
    expect(verification.valid).toBe(true);
    expect(verification.totalChecked).toBeGreaterThanOrEqual(3);
    expect(verification.brokenAt).toBeNull();
  });

  it('should immediately detect tampering when an audit log entry is modified in database', async () => {
    // Generate events
    await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${userToken}`)
      .field('title', 'Tamper Target')
      .attach('file', Buffer.from('Sample content'), 'sample.txt');

    const logs = await AuditLog.find().sort({ createdAt: 1 });
    expect(logs.length).toBeGreaterThanOrEqual(2);

    // Tamper with the action type of the second log record directly in database
    const targetLog = logs[1];
    targetLog.actionType = 'FORGED_ADMIN_ACCESS';
    await targetLog.save();

    // Verify chain detects tampering
    const verification = await verifyAuditChain();
    expect(verification.valid).toBe(false);
    expect(verification.brokenAt).toBe(1);
    expect(verification.reason).toContain('Data tampering detected');
  });

  it('should allow authenticated users to view their audit history and trigger verification via API', async () => {
    const listRes = await request(app)
      .get('/api/audit')
      .set('Authorization', `Bearer ${userToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.success).toBe(true);
    expect(listRes.body.logs.length).toBeGreaterThanOrEqual(1);

    const verifyRes = await request(app)
      .get('/api/audit/verify')
      .set('Authorization', `Bearer ${userToken}`);

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.verification.valid).toBe(true);
  });
});

