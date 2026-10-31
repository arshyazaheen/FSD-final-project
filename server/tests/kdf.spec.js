import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { deriveKeyPBKDF2 } from '../utils/cryptoEngine.js';

describe('PBKDF2 Key Derivation Function (KDF)', () => {
  it('should derive deterministic 256-bit key from passphrase and salt', () => {
    const password = 'CorrectHorseBatteryStaple2026!';
    const salt = crypto.randomBytes(16);

    const keyA = deriveKeyPBKDF2(password, salt, 10000);
    const keyB = deriveKeyPBKDF2(password, salt, 10000);

    expect(keyA).toEqual(keyB);
    expect(keyA.length).toBe(32);
  });

  it('should derive distinctly different keys with different salts', () => {
    const password = 'SamePasswordEverywhere';
    const salt1 = crypto.randomBytes(16);
    const salt2 = crypto.randomBytes(16);

    const key1 = deriveKeyPBKDF2(password, salt1, 10000);
    const key2 = deriveKeyPBKDF2(password, salt2, 10000);

    expect(key1).not.toEqual(key2);
  });

  it('should derive distinctly different keys with different passwords', () => {
    const salt = crypto.randomBytes(16);
    const key1 = deriveKeyPBKDF2('PasswordOne!', salt, 10000);
    const key2 = deriveKeyPBKDF2('PasswordTwo!', salt, 10000);

    expect(key1).not.toEqual(key2);
  });

  it('should produce different keys with different iteration counts', () => {
    const password = 'TestIterationCount';
    const salt = crypto.randomBytes(16);

    const keyLow = deriveKeyPBKDF2(password, salt, 1000);
    const keyHigh = deriveKeyPBKDF2(password, salt, 5000);

    expect(keyLow).not.toEqual(keyHigh);
  });
});

