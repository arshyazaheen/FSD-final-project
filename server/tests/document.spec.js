import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { connectTestDB, closeTestDB, clearTestDB } from './dbHandler.js';

describe('Document Management & AES-256-GCM Encryption Tests', () => {
  let userAToken;
  let userBToken;
  let userAId;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();

    // Register User A
    const resA = await request(app).post('/api/auth/register').send({
      name: 'User A',
      email: 'usera@vaultverse.io',
      password: 'Password123!',
    });
    userAToken = resA.body.token;
    userAId = resA.body.user.id;

    // Register User B
    const resB = await request(app).post('/api/auth/register').send({
      name: 'User B',
      email: 'userb@vaultverse.io',
      password: 'Password123!',
    });
    userBToken = resB.body.token;
  });

  it('should upload, encrypt with AES-256-GCM, and store a document', async () => {
    const fileContent = 'Sensitive confidential client tax filing details for 2026.';
    const res = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${userAToken}`)
      .field('title', 'Tax Filing 2026')
      .field('category', 'FINANCIAL')
      .field('tags', 'tax, 2026, confidential')
      .attach('file', Buffer.from(fileContent), 'tax_filing.txt');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.document).toBeDefined();
    expect(res.body.document.title).toBe('Tax Filing 2026');
    expect(res.body.document.originalFilename).toBe('tax_filing.txt');
    expect(res.body.document.encryptedDek).toBeDefined();
    expect(res.body.document.iv).toBeDefined();
    expect(res.body.document.authTag).toBeDefined();
    expect(res.body.document.checksumSha256).toBeDefined();
  });

  it('should download and accurately decrypt an encrypted document', async () => {
    const fileContent = 'Medical History: Blood type O positive, allergy to penicillin.';
    const uploadRes = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${userAToken}`)
      .field('title', 'Medical Record')
      .field('category', 'MEDICAL')
      .attach('file', Buffer.from(fileContent), 'medical.txt');

    const docId = uploadRes.body.document._id;

    const downloadRes = await request(app)
      .get(`/api/documents/${docId}/download`)
      .set('Authorization', `Bearer ${userAToken}`);

    expect(downloadRes.status).toBe(200);
    expect(downloadRes.text).toBe(fileContent);
    expect(downloadRes.headers['content-disposition']).toContain('medical.txt');
  });

  it('should strictly enforce document ownership and prevent unauthorized access by other users', async () => {
    const uploadRes = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${userAToken}`)
      .field('title', 'Private Document')
      .attach('file', Buffer.from('User A Private Secret'), 'private.txt');

    const docId = uploadRes.body.document._id;

    // User B attempts to access User A document
    const getRes = await request(app)
      .get(`/api/documents/${docId}`)
      .set('Authorization', `Bearer ${userBToken}`);

    expect(getRes.status).toBe(404);

    // User B attempts to download User A document
    const downloadRes = await request(app)
      .get(`/api/documents/${docId}/download`)
      .set('Authorization', `Bearer ${userBToken}`);

    expect(downloadRes.status).toBe(403);
  });

  it('should update document metadata successfully', async () => {
    const uploadRes = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${userAToken}`)
      .field('title', 'Initial Title')
      .attach('file', Buffer.from('Draft notes'), 'draft.txt');

    const docId = uploadRes.body.document._id;

    const updateRes = await request(app)
      .put(`/api/documents/${docId}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        title: 'Updated Final Title',
        category: 'LEGAL',
        notes: 'Reviewed by counsel',
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.document.title).toBe('Updated Final Title');
    expect(updateRes.body.document.category).toBe('LEGAL');
    expect(updateRes.body.document.notes).toBe('Reviewed by counsel');
  });

  it('should soft-delete document and reclaim storage quota', async () => {
    const uploadRes = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${userAToken}`)
      .field('title', 'To Delete')
      .attach('file', Buffer.from('Temporary data'), 'temp.txt');

    const docId = uploadRes.body.document._id;

    const delRes = await request(app)
      .delete(`/api/documents/${docId}`)
      .set('Authorization', `Bearer ${userAToken}`);

    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);

    // Verify document no longer appears in active listing
    const listRes = await request(app)
      .get('/api/documents')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(listRes.body.documents.some((d) => d._id === docId)).toBe(false);
  });
});

