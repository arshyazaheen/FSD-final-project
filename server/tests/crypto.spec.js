import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import {
  generateDEK,
  generateIV,
  computeSHA256,
  generateSecureToken,
  hashToken,
  encryptBufferAESGCM,
  decryptBufferAESGCM,
  wrapKey,
  unwrapKey,
  deriveKeyPBKDF2,
  AES_KEY_LENGTH_BYTES,
  AES_GCM_IV_LENGTH_BYTES,
} from '../utils/cryptoEngine.js';

describe('Cryptographic Engine — AES-256-GCM & Envelope Encryption', () => {
  it('should generate valid 256-bit DEK and 96-bit IV', () => {
    const dek = generateDEK();
    const iv = generateIV();

    expect(dek).toBeInstanceOf(Buffer);
    expect(dek.length).toBe(AES_KEY_LENGTH_BYTES); // 32 bytes = 256 bits

    expect(iv).toBeInstanceOf(Buffer);
    expect(iv.length).toBe(AES_GCM_IV_LENGTH_BYTES); // 12 bytes = 96 bits
  });

  it('should encrypt and decrypt plaintext accurately with AES-256-GCM', () => {
    const dek = generateDEK();
    const originalText = 'VaultVerse Top Secret Personal Financial Record 2026';
    const plaintextBuffer = Buffer.from(originalText, 'utf-8');

    const { ciphertextBuffer, ivHex, authTagHex } = encryptBufferAESGCM(plaintextBuffer, dek);

    expect(ciphertextBuffer).not.toEqual(plaintextBuffer);
    expect(ivHex).toHaveLength(24); // 12 bytes hex
    expect(authTagHex).toHaveLength(32); // 16 bytes hex

    const decryptedBuffer = decryptBufferAESGCM(ciphertextBuffer, dek, ivHex, authTagHex);
    expect(decryptedBuffer.toString('utf-8')).toBe(originalText);
  });

  it('should reject decryption when ciphertext is tampered with', () => {
    const dek = generateDEK();
    const plaintextBuffer = Buffer.from('Confidential Medical Records', 'utf-8');

    const { ciphertextBuffer, ivHex, authTagHex } = encryptBufferAESGCM(plaintextBuffer, dek);

    // Tamper with one byte in ciphertext
    const tampered = Buffer.from(ciphertextBuffer);
    tampered[0] ^= 0xff;

    expect(() => {
      decryptBufferAESGCM(tampered, dek, ivHex, authTagHex);
    }).toThrow();
  });

  it('should reject decryption when authentication tag is invalid', () => {
    const dek = generateDEK();
    const plaintextBuffer = Buffer.from('Confidential Medical Records', 'utf-8');

    const { ciphertextBuffer, ivHex } = encryptBufferAESGCM(plaintextBuffer, dek);
    const bogusTag = crypto.randomBytes(16).toString('hex');

    expect(() => {
      decryptBufferAESGCM(ciphertextBuffer, dek, ivHex, bogusTag);
    }).toThrow();
  });

  it('should support envelope encryption (wrap and unwrap DEK)', () => {
    const masterKey = crypto.randomBytes(32);
    const dek = generateDEK();

    const wrappedEnvelope = wrapKey(dek, masterKey);
    expect(typeof wrappedEnvelope).toBe('string');

    const unwrappedDek = unwrapKey(wrappedEnvelope, masterKey);
    expect(unwrappedDek).toEqual(dek);
  });

  it('should compute consistent SHA-256 checksums', () => {
    const buffer = Buffer.from('IntegrityCheckData2026', 'utf-8');
    const hash1 = computeSHA256(buffer);
    const hash2 = computeSHA256(buffer);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('should hash security tokens consistently', () => {
    const token = generateSecureToken(32);
    expect(token).toHaveLength(64);

    const tokenHash = hashToken(token);
    expect(tokenHash).toHaveLength(64);
    expect(tokenHash).toBe(computeSHA256(token));
  });

  it('should derive deterministic keys using PBKDF2', () => {
    const password = 'UserMasterPassphrase!';
    const salt = crypto.randomBytes(16).toString('hex');

    const key1 = deriveKeyPBKDF2(password, salt, 1000);
    const key2 = deriveKeyPBKDF2(password, salt, 1000);

    expect(key1).toEqual(key2);
    expect(key1.length).toBe(32);
  });
});

