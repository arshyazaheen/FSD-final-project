import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { connectTestDB, closeTestDB, clearTestDB } from './dbHandler.js';

describe('Emergency Access & Trusted Contact Management Tests', () => {
  let ownerToken;
  let ownerId;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();

    const ownerRes = await request(app).post('/api/auth/register').send({
      name: 'Owner Jane',
      email: 'jane@vaultverse.io',
      password: 'Password123!',
    });
    ownerToken = ownerRes.body.token;
    ownerId = ownerRes.body.user.id;
  });

  it('should configure and update emergency health profile', async () => {
    const updateRes = await request(app)
      .put('/api/emergency/profile')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        bloodType: 'O+',
        allergies: ['Penicillin', 'Sulfa drugs'],
        chronicConditions: ['Asthma'],
        primaryPhysician: {
          name: 'Dr. Gregory House',
          phone: '+1-555-0199',
          clinic: 'Princeton Plainsboro',
        },
        emergencyInstructions: 'In emergency, administer inhaler and notify primary contact.',
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.profile.bloodType).toBe('O+');
    expect(updateRes.body.profile.allergies).toContain('Penicillin');
    expect(updateRes.body.profile.primaryPhysician.name).toBe('Dr. Gregory House');
  });

  it('should add and manage trusted contacts', async () => {
    const addRes = await request(app)
      .post('/api/trusted-contacts')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        contactName: 'Robert Jane',
        contactEmail: 'robert@family.com',
        phone: '+1-555-9876',
        relationship: 'SPOUSE',
        permissions: {
          canViewEmergencyProfile: true,
          canRequestEmergencyAccess: true,
          allowedCategories: ['EMERGENCY', 'MEDICAL'],
        },
      });

    expect(addRes.status).toBe(201);
    expect(addRes.body.success).toBe(true);
    expect(addRes.body.contact.contactEmail).toBe('robert@family.com');

    // List contacts
    const listRes = await request(app)
      .get('/api/trusted-contacts')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.contacts.length).toBe(1);
    expect(listRes.body.contacts[0].contactName).toBe('Robert Jane');
  });

  it('should handle complete emergency access request and approval workflow', async () => {
    // 1. Owner adds emergency contact
    await request(app)
      .post('/api/trusted-contacts')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        contactName: 'Emergency Proxy',
        contactEmail: 'proxy@trusted.com',
        relationship: 'ATTORNEY',
      });

    // 2. Owner uploads medical document
    const docRes = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${ownerToken}`)
      .field('title', 'Emergency Medical Directive')
      .field('category', 'EMERGENCY')
      .attach('file', Buffer.from('Power of Attorney and DNR Directive 2026'), 'directive.txt');

    const docId = docRes.body.document._id;

    // 3. Attach document to emergency profile
    await request(app)
      .put('/api/emergency/profile')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        bloodType: 'A-',
        emergencyDocumentIds: [docId],
      });

    // 4. Contact initiates emergency access request
    const requestRes = await request(app)
      .post('/api/emergency/request-access')
      .send({
        targetUserId: ownerId,
        requesterEmail: 'proxy@trusted.com',
        requesterName: 'Emergency Proxy',
        justification: 'Vault owner has been admitted to intensive care. Medical records urgently needed.',
      });

    expect(requestRes.status).toBe(201);
    expect(requestRes.body.success).toBe(true);
    const requestId = requestRes.body.requestId;
    const requestToken = requestRes.body.requestToken;

    // 5. Unapproved access attempt is rejected
    const unapprovedAccess = await request(app)
      .get(`/api/emergency/access/${requestId}`)
      .query({ token: requestToken });
    expect(unapprovedAccess.status).toBe(403);

    // 6. Vault owner reviews and approves request
    const approveRes = await request(app)
      .post(`/api/emergency/requests/${requestId}/review`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        approve: true,
        responseNote: 'Approved for 24 hours access.',
        grantHours: 24,
      });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.accessRequest.status).toBe('APPROVED');

    // 7. Requester accesses emergency profile and authorized documents
    const approvedAccess = await request(app)
      .get(`/api/emergency/access/${requestId}`)
      .query({ token: requestToken });

    expect(approvedAccess.status).toBe(200);
    expect(approvedAccess.body.emergencyProfile.bloodType).toBe('A-');
    expect(approvedAccess.body.documents.length).toBeGreaterThanOrEqual(1);

    // 7b. Access without valid token or credentials is strictly rejected (Anti-IDOR)
    const unauthorizedAccess = await request(app).get(`/api/emergency/access/${requestId}`);
    expect(unauthorizedAccess.status).toBe(401);

    const wrongTokenAccess = await request(app)
      .get(`/api/emergency/access/${requestId}`)
      .query({ token: 'invalid_forged_emergency_token_hex_12345' });
    expect(wrongTokenAccess.status).toBe(403);

    // 8. Owner revokes access
    const revokeRes = await request(app)
      .delete(`/api/emergency/requests/${requestId}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(revokeRes.status).toBe(200);

    // 9. Subsequent access is blocked
    const postRevoke = await request(app)
      .get(`/api/emergency/access/${requestId}`)
      .query({ token: requestToken });

    expect(postRevoke.status).toBe(403);
  });
});

