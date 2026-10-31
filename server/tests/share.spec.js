import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import Share from '../models/Share.js';
import { connectTestDB, closeTestDB, clearTestDB } from './dbHandler.js';

describe('Scoped Sharing, Time-Limited Links & Expiration Tests', () => {
  let userToken;
  let documentId;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();

    const userRes = await request(app).post('/api/auth/register').send({
      name: 'Owner User',
      email: 'owner@vaultverse.io',
      password: 'Password123!',
    });
    userToken = userRes.body.token;

    const docRes = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${userToken}`)
      .field('title', 'Shared Agreement')
      .attach('file', Buffer.from('Non-disclosure mutual agreement terms.'), 'nda.txt');

    documentId = docRes.body.document._id;
  });

  it('should generate time-limited share link with hashed storage token', async () => {
    const res = await request(app)
      .post('/api/share')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        documentId,
        recipientEmail: 'partner@client.com',
        permission: 'VIEW',
        maxViews: 3,
        expiresInHours: 48,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.share.token).toBeDefined();

    // Verify token is stored as a SHA-256 hash in database, not as plaintext raw token
    const rawToken = res.body.share.token;
    const shareInDb = await Share.findById(res.body.share.shareId);
    expect(shareInDb.tokenHash).not.toBe(rawToken);
    expect(shareInDb.tokenHash).toHaveLength(64);
  });

  it('should allow public access to shared document metadata via valid token', async () => {
    const createRes = await request(app)
      .post('/api/share')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        documentId,
        permission: 'VIEW',
        maxViews: 5,
        expiresInHours: 24,
      });

    const token = createRes.body.share.token;

    const accessRes = await request(app).get(`/api/share/access/${token}`);
    expect(accessRes.status).toBe(200);
    expect(accessRes.body.success).toBe(true);
    expect(accessRes.body.document.title).toBe('Shared Agreement');
    expect(accessRes.body.currentViews).toBe(1);
  });

  it('should enforce password protection on secured share links', async () => {
    const createRes = await request(app)
      .post('/api/share')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        documentId,
        permission: 'VIEW',
        passphrase: 'ProtectedPassphrase99',
      });

    const token = createRes.body.share.token;

    // Access without passphrase should be rejected with 401
    const noPassRes = await request(app).get(`/api/share/access/${token}`);
    expect(noPassRes.status).toBe(401);
    expect(noPassRes.body.code).toBe('PASSPHRASE_REQUIRED');

    // Access with wrong passphrase should be rejected with 403
    const wrongPassRes = await request(app)
      .get(`/api/share/access/${token}`)
      .query({ passphrase: 'WrongPassword!' });
    expect(wrongPassRes.status).toBe(403);

    // Access with correct passphrase succeeds
    const correctPassRes = await request(app)
      .get(`/api/share/access/${token}`)
      .query({ passphrase: 'ProtectedPassphrase99' });
    expect(correctPassRes.status).toBe(200);
    expect(correctPassRes.body.success).toBe(true);
  });

  it('should enforce max view limits and reject access when views are exhausted', async () => {
    const createRes = await request(app)
      .post('/api/share')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        documentId,
        permission: 'VIEW',
        maxViews: 2,
      });

    const token = createRes.body.share.token;

    // View 1
    const v1 = await request(app).get(`/api/share/access/${token}`);
    expect(v1.status).toBe(200);

    // View 2
    const v2 = await request(app).get(`/api/share/access/${token}`);
    expect(v2.status).toBe(200);

    // View 3 should be rejected with 410 Gone
    const v3 = await request(app).get(`/api/share/access/${token}`);
    expect(v3.status).toBe(410);
  });

  it('should reject access to expired share links', async () => {
    const createRes = await request(app)
      .post('/api/share')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        documentId,
        permission: 'VIEW',
        maxViews: 5,
        expiresInHours: 1,
      });

    const shareId = createRes.body.share.shareId;
    const token = createRes.body.share.token;

    // Artificially simulate expiration in DB
    await Share.findByIdAndUpdate(shareId, {
      expiresAt: new Date(Date.now() - 1000 * 60 * 60),
    });

    const accessRes = await request(app).get(`/api/share/access/${token}`);
    expect(accessRes.status).toBe(410);
  });

  it('should enforce revocation of share links by vault owner', async () => {
    const createRes = await request(app)
      .post('/api/share')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        documentId,
        permission: 'VIEW',
      });

    const shareId = createRes.body.share.shareId;
    const token = createRes.body.share.token;

    // Owner revokes link
    const revokeRes = await request(app)
      .delete(`/api/share/${shareId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(revokeRes.status).toBe(200);
    expect(revokeRes.body.success).toBe(true);

    // Access after revocation must be blocked
    const accessRes = await request(app).get(`/api/share/access/${token}`);
    expect(accessRes.status).toBe(410);
  });
});

