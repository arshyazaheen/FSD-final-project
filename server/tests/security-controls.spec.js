import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { connectTestDB, closeTestDB, clearTestDB } from './dbHandler.js';
import { unwrapKey } from '../utils/cryptoEngine.js';

describe('Security Hardening, File Filters & Envelope Controls', () => {
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
      name: 'Security User',
      email: 'secuser@vaultverse.io',
      password: 'Password123!',
    });
    userToken = reg.body.token;
  });

  it('should reject executable files (.exe, .sh) to prevent malware uploads', async () => {
    const res = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${userToken}`)
      .field('title', 'Malicious Script')
      .attach('file', Buffer.from('#!/bin/bash\nrm -rf /'), 'exploit.sh');

    expect(res.status).toBe(500); // Caught by fileFilter and passed to error handler
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('prohibited');
  });

  it('should reject double-extension malicious payloads (e.g. exploit.exe.pdf)', async () => {
    const res = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${userToken}`)
      .field('title', 'Disguised Malware')
      .attach('file', Buffer.from('malicious payload bytes'), 'invoice.exe.pdf');

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('double-extension');
  });

  it('should sanitize NoSQL injection operator keys from request payload', async () => {
    // Register user with normal string credentials
    const attackRes = await request(app).post('/api/auth/login').send({
      email: { $gt: '' },
      password: 'Password123!',
    });

    // Since $gt is stripped by mongoSanitizer, email becomes undefined/empty, rejecting the injection attack cleanly
    expect(attackRes.status).toBe(400);
    expect(attackRes.body.success).toBe(false);
  });

  it('should strictly isolate documents between users and prevent IDOR attacks', async () => {
    // 1. User A uploads a document
    const uploadRes = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${userToken}`)
      .field('title', 'User A Secret Document')
      .field('category', 'FINANCIAL')
      .attach('file', Buffer.from('Confidential financial sheet for User A'), 'finances.txt');

    expect(uploadRes.status).toBe(201);
    const docId = uploadRes.body.document._id;

    // 2. Register User B
    const userBRes = await request(app).post('/api/auth/register').send({
      name: 'Attacker Bob',
      email: 'bob@attacker.io',
      password: 'StrongPassword123!',
    });
    const userBToken = userBRes.body.token;

    // 3. User B attempts to access User A's document details (IDOR)
    const accessRes = await request(app)
      .get(`/api/documents/${docId}`)
      .set('Authorization', `Bearer ${userBToken}`);

    expect(accessRes.status).toBe(404); // Document not found for User B
    expect(accessRes.body.success).toBe(false);

    // 4. User B attempts to download User A's document (IDOR)
    const downloadRes = await request(app)
      .get(`/api/documents/${docId}/download`)
      .set('Authorization', `Bearer ${userBToken}`);

    expect(downloadRes.status).toBe(403); // Forbidden
    expect(downloadRes.body.success).toBe(false);
  });

  it('should throw error when attempting to unwrap corrupted DEK envelope', () => {
    const corruptedEnvelope = JSON.stringify({
      iv: '0123456789abcdef01234567',
      tag: '0123456789abcdef0123456789abcdef',
      data: 'deadbeefcafe',
    });

    expect(() => {
      unwrapKey(corruptedEnvelope);
    }).toThrow();
  });

  it('should prevent path traversal attacks in download endpoint', async () => {
    const res = await request(app)
      .get('/api/documents/../../etc/passwd/download')
      .set('Authorization', `Bearer ${userToken}`);

    expect([400, 404]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  it('should return health check with security metadata', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('HEALTHY');
    expect(res.body.security.encryption).toBe('AES-256-GCM');
    expect(res.body.security.auditHashChain).toBe('Tamper-Evident SHA-256');
  });
});

