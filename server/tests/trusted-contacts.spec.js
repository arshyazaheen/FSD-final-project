import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { connectTestDB, closeTestDB, clearTestDB } from './dbHandler.js';

describe('Trusted Contact Management REST Endpoints', () => {
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
      name: 'Contact Owner',
      email: 'ownercontact@vaultverse.io',
      password: 'Password123!',
    });
    userToken = reg.body.token;
  });

  it('should add a new trusted contact with invitation token', async () => {
    const res = await request(app)
      .post('/api/trusted-contacts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        contactName: 'Dr. Michael Chen',
        contactEmail: 'mchen@clinic.com',
        phone: '+1-555-4321',
        relationship: 'PHYSICIAN',
        securityNote: 'Family Doctor',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.contact.contactName).toBe('Dr. Michael Chen');
    expect(res.body.contact.relationship).toBe('PHYSICIAN');
    expect(res.body.inviteToken).toBeDefined();
  });

  it('should reject adding trusted contact with duplicate email for same owner', async () => {
    await request(app)
      .post('/api/trusted-contacts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        contactName: 'Contact First',
        contactEmail: 'duplicate@contact.com',
        relationship: 'FRIEND',
      });

    const dupRes = await request(app)
      .post('/api/trusted-contacts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        contactName: 'Contact Duplicate',
        contactEmail: 'duplicate@contact.com',
        relationship: 'OTHER',
      });

    expect(dupRes.status).toBe(409);
    expect(dupRes.body.success).toBe(false);
  });

  it('should update trusted contact permissions', async () => {
    const addRes = await request(app)
      .post('/api/trusted-contacts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        contactName: 'Attorney Sarah',
        contactEmail: 'sarah@law.com',
        relationship: 'ATTORNEY',
      });

    const contactId = addRes.body.contact._id;

    const updateRes = await request(app)
      .put(`/api/trusted-contacts/${contactId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        permissions: {
          canViewEmergencyProfile: true,
          canRequestEmergencyAccess: true,
          canDownloadDocuments: true,
          allowedCategories: ['ALL'],
        },
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.contact.permissions.canDownloadDocuments).toBe(true);
  });

  it('should remove trusted contact and clean up associations', async () => {
    const addRes = await request(app)
      .post('/api/trusted-contacts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        contactName: 'Temporary Contact',
        contactEmail: 'temp@contact.com',
        relationship: 'FRIEND',
      });

    const contactId = addRes.body.contact._id;

    const delRes = await request(app)
      .delete(`/api/trusted-contacts/${contactId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);

    const listRes = await request(app)
      .get('/api/trusted-contacts')
      .set('Authorization', `Bearer ${userToken}`);

    expect(listRes.body.contacts.some((c) => c._id === contactId)).toBe(false);
  });
});

