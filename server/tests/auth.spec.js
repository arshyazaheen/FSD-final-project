import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import User from '../models/User.js';
import { connectTestDB, closeTestDB, clearTestDB } from './dbHandler.js';

describe('Authentication & User Management Integration Tests', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  it('should successfully register a new user and hash their password', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Alexander Stone',
      email: 'alexander@vaultverse.io',
      password: 'StrongPassword123!',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('alexander@vaultverse.io');
    expect(res.body.user.password).toBeUndefined();

    // Verify password is encrypted in database with bcrypt
    const storedUser = await User.findOne({ email: 'alexander@vaultverse.io' });
    expect(storedUser).toBeDefined();
    expect(storedUser.password).not.toBe('StrongPassword123!');
    expect(storedUser.password.startsWith('$2')).toBe(true); // bcrypt prefix
  });

  it('should reject registration with duplicate email address', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'User One',
      email: 'duplicate@vaultverse.io',
      password: 'Password123!',
    });

    const res = await request(app).post('/api/auth/register').send({
      name: 'User Two',
      email: 'duplicate@vaultverse.io',
      password: 'Password123!',
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('EMAIL_IN_USE');
  });

  it('should reject registration with passwords shorter than 8 characters', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Short Pass User',
      email: 'short@vaultverse.io',
      password: 'short',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should authenticate user with valid credentials and return JWT', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Login User',
      email: 'login@vaultverse.io',
      password: 'CorrectPassword123!',
    });

    const res = await request(app).post('/api/auth/login').send({
      email: 'login@vaultverse.io',
      password: 'CorrectPassword123!',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.name).toBe('Login User');
  });

  it('should reject login with incorrect password and increment failed attempts', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Failed User',
      email: 'failed@vaultverse.io',
      password: 'RealPassword123!',
    });

    const res = await request(app).post('/api/auth/login').send({
      email: 'failed@vaultverse.io',
      password: 'WrongPassword999!',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);

    const user = await User.findOne({ email: 'failed@vaultverse.io' });
    expect(user.failedLoginAttempts).toBe(1);
  });

  it('should lock account after 5 consecutive failed login attempts', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Brute Force Target',
      email: 'brute@vaultverse.io',
      password: 'ValidPassword123!',
    });

    // 5 failed login attempts
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/auth/login').send({
        email: 'brute@vaultverse.io',
        password: `WrongGuess${i}!`,
      });
    }

    const lockedRes = await request(app).post('/api/auth/login').send({
      email: 'brute@vaultverse.io',
      password: 'ValidPassword123!',
    });

    expect(lockedRes.status).toBe(403);
    expect(lockedRes.body.code).toBe('ACCOUNT_LOCKED');
  });

  it('should protect /api/auth/me and reject requests without valid JWT', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHENTICATED');
  });

  it('should return profile for authenticated user with valid Bearer token', async () => {
    const regRes = await request(app).post('/api/auth/register').send({
      name: 'Profile Tester',
      email: 'profile@vaultverse.io',
      password: 'Password123!',
    });

    const token = regRes.body.token;

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe('profile@vaultverse.io');
  });
});

