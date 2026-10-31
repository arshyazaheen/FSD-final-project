import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { connectTestDB, closeTestDB, clearTestDB } from './dbHandler.js';

describe('Privacy API & Dynamic Scanning Endpoints', () => {
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
      name: 'Privacy User',
      email: 'privacyuser@vaultverse.io',
      password: 'Password123!',
    });
    userToken = reg.body.token;
  });

  it('should return default optimal privacy score when vault is empty', async () => {
    const res = await request(app)
      .get('/api/privacy/overview')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.overview.overallScore).toBe(100);
    expect(res.body.overview.overallGrade).toBe('EXCELLENT');
    expect(res.body.overview.totalDocuments).toBe(0);
  });

  it('should perform stateless text privacy analysis via /api/privacy/analyze', async () => {
    const res = await request(app)
      .post('/api/privacy/analyze')
      .send({
        text: 'Taxpayer SSN is 123-45-6789 and email is alex@vaultverse.io',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.scanResult.totalEntities).toBe(2);
    expect(res.body.scanResult.entitiesByType.US_SSN).toBe(1);
    expect(res.body.scanResult.entitiesByType.EMAIL).toBe(1);
    expect(res.body.scoreReport.score).toBeLessThan(100);
  });

  it('should reflect high-risk documents in /api/privacy/overview after upload', async () => {
    // Upload text file with credit card and secret key
    const sensitiveContent = `
      Payment Card: 4532015012345671
      API Secret: AKIAIOSFODNN7EXAMPLE
    `;

    await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${userToken}`)
      .field('title', 'Sensitive File')
      .field('category', 'FINANCIAL')
      .attach('file', Buffer.from(sensitiveContent), 'sensitive.txt');

    const res = await request(app)
      .get('/api/privacy/overview')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.overview.scannedDocuments).toBe(1);
    expect(res.body.overview.overallScore).toBeLessThan(80);
    expect(res.body.overview.highRiskDocuments.length).toBe(1);
    expect(res.body.overview.recommendedActions.length).toBeGreaterThanOrEqual(1);
  });
});

