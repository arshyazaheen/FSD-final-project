import crypto from 'crypto';

export const AES_KEY_LENGTH_BYTES = 32; // 256-bit AES key
export const AES_GCM_IV_LENGTH_BYTES = 12; // 96-bit IV standard for GCM
export const AES_GCM_TAG_LENGTH_BYTES = 16; // 128-bit auth tag standard

/**
 * Obtain the server Key Encryption Key (KEK) / Master Key
 */
export function getMasterKey() {
  const masterKeyHex = process.env.VAULT_MASTER_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  if (masterKeyHex.length !== 64) {
    // Derive standard 32 bytes using SHA-256 if custom length provided
    return crypto.createHash('sha256').update(masterKeyHex).digest();
  }
  return Buffer.from(masterKeyHex, 'hex');
}

/**
 * Generate a cryptographically secure 256-bit AES Data Encryption Key (DEK)
 */
export function generateDEK() {
  return crypto.randomBytes(AES_KEY_LENGTH_BYTES);
}

/**
 * Generate a 96-bit Initialization Vector (IV)
 */
export function generateIV() {
  return crypto.randomBytes(AES_GCM_IV_LENGTH_BYTES);
}

/**
 * Compute SHA-256 hex checksum of a buffer or string
 */
export function computeSHA256(data) {
  const hash = crypto.createHash('sha256');
  hash.update(data);
  return hash.digest('hex');
}

/**
 * Generate a cryptographically secure URL-safe random token
 */
export function generateSecureToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Hash a token with SHA-256 before database storage (prevents token leakage from DB dumps)
 */
export function hashToken(token) {
  return computeSHA256(token);
}

/**
 * Encrypt a binary buffer using AES-256-GCM
 * @param {Buffer} plaintextBuffer
 * @param {Buffer} key 32-byte AES key
 * @param {Buffer} [customIV] optional 12-byte IV
 * @param {Buffer|string} [aad] optional additional authenticated data
 * @returns {{ ciphertextBuffer: Buffer, ivHex: string, authTagHex: string }}
 */
export function encryptBufferAESGCM(plaintextBuffer, key, customIV = null, aad = null) {
  if (!Buffer.isBuffer(plaintextBuffer)) {
    plaintextBuffer = Buffer.from(plaintextBuffer);
  }
  if (key.length !== AES_KEY_LENGTH_BYTES) {
    throw new Error(`Invalid key length. Expected ${AES_KEY_LENGTH_BYTES} bytes, got ${key.length}`);
  }

  const iv = customIV || generateIV();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv, {
    authTagLength: AES_GCM_TAG_LENGTH_BYTES,
  });

  if (aad) {
    cipher.setAAD(Buffer.isBuffer(aad) ? aad : Buffer.from(aad));
  }

  const ciphertext = Buffer.concat([cipher.update(plaintextBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertextBuffer: ciphertext,
    ivHex: iv.toString('hex'),
    authTagHex: authTag.toString('hex'),
  };
}

/**
 * Decrypt AES-256-GCM ciphertext buffer
 * @param {Buffer} ciphertextBuffer
 * @param {Buffer} key 32-byte AES key
 * @param {string|Buffer} ivHex 12-byte IV
 * @param {string|Buffer} authTagHex 16-byte Auth Tag
 * @param {Buffer|string} [aad] optional additional authenticated data
 * @returns {Buffer} decrypted plaintext buffer
 */
export function decryptBufferAESGCM(ciphertextBuffer, key, ivHex, authTagHex, aad = null) {
  if (key.length !== AES_KEY_LENGTH_BYTES) {
    throw new Error(`Invalid key length. Expected ${AES_KEY_LENGTH_BYTES} bytes, got ${key.length}`);
  }

  const iv = Buffer.isBuffer(ivHex) ? ivHex : Buffer.from(ivHex, 'hex');
  const authTag = Buffer.isBuffer(authTagHex) ? authTagHex : Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv, {
    authTagLength: AES_GCM_TAG_LENGTH_BYTES,
  });

  decipher.setAuthTag(authTag);

  if (aad) {
    decipher.setAAD(Buffer.isBuffer(aad) ? aad : Buffer.from(aad));
  }

  const decrypted = Buffer.concat([decipher.update(ciphertextBuffer), decipher.final()]);
  return decrypted;
}

/**
 * Wrap (encrypt) a Data Encryption Key (DEK) with Key Encryption Key (KEK / Master Key)
 * Returns a JSON envelope string: { iv, tag, ciphertext }
 */
export function wrapKey(dekBuffer, kekBuffer = null) {
  const kek = kekBuffer || getMasterKey();
  const { ciphertextBuffer, ivHex, authTagHex } = encryptBufferAESGCM(dekBuffer, kek);
  return JSON.stringify({
    iv: ivHex,
    tag: authTagHex,
    data: ciphertextBuffer.toString('hex'),
  });
}

/**
 * Unwrap (decrypt) an encrypted DEK envelope using Key Encryption Key (KEK / Master Key)
 * Returns raw 32-byte Buffer DEK
 */
export function unwrapKey(envelopeJsonString, kekBuffer = null) {
  const kek = kekBuffer || getMasterKey();
  const envelope = typeof envelopeJsonString === 'string' ? JSON.parse(envelopeJsonString) : envelopeJsonString;
  const ciphertextBuffer = Buffer.from(envelope.data, 'hex');
  return decryptBufferAESGCM(ciphertextBuffer, kek, envelope.iv, envelope.tag);
}

/**
 * Derive 256-bit key from passphrase using PBKDF2
 */
export function deriveKeyPBKDF2(passphrase, saltHex, iterations = 100000) {
  const salt = Buffer.isBuffer(saltHex) ? saltHex : Buffer.from(saltHex, 'hex');
  return crypto.pbkdf2Sync(passphrase, salt, iterations, AES_KEY_LENGTH_BYTES, 'sha256');
}

