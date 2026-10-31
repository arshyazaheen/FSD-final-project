import crypto from 'crypto';
import { BIP39_WORDLIST } from './bip39Words.js';

/**
 * Generate 128 bits of cryptographically secure entropy and map to a 12-word mnemonic
 */
export function generateMnemonic() {
  const entropy = crypto.randomBytes(16); // 128 bits
  return entropyToMnemonic(entropy);
}

/**
 * Convert 16 bytes (128 bits) of entropy to a 12-word BIP-39 mnemonic phrase
 */
export function entropyToMnemonic(entropy) {
  if (entropy.length !== 16) {
    throw new Error('Entropy must be exactly 16 bytes (128 bits)');
  }

  // 1. Compute SHA-256 of entropy to obtain 4-bit checksum
  const hash = crypto.createHash('sha256').update(entropy).digest();
  const checksumBits = hash[0] >> 4; // Top 4 bits

  // 2. Combine 128 bits + 4 checksum bits = 132 bits = 12 words * 11 bits
  let binaryString = '';
  for (let i = 0; i < entropy.length; i++) {
    binaryString += entropy[i].toString(2).padStart(8, '0');
  }
  binaryString += checksumBits.toString(2).padStart(4, '0');

  // 3. Slice into 12 11-bit chunks
  const words = [];
  for (let i = 0; i < 12; i++) {
    const chunk = binaryString.substring(i * 11, (i + 1) * 11);
    const index = parseInt(chunk, 2);
    words.push(BIP39_WORDLIST[index]);
  }

  return words.join(' ');
}

/**
 * Convert 12-word BIP-39 mnemonic back to 16 bytes (128 bits) of entropy
 */
export function mnemonicToEntropy(mnemonic) {
  const words = mnemonic.trim().toLowerCase().split(/\s+/);
  if (words.length !== 12) {
    throw new Error(`Invalid mnemonic word count. Expected 12 words, received ${words.length}`);
  }

  let binaryString = '';
  for (const word of words) {
    const index = BIP39_WORDLIST.indexOf(word);
    if (index === -1) {
      throw new Error(`Invalid word in mnemonic: "${word}"`);
    }
    binaryString += index.toString(2).padStart(11, '0');
  }

  const entropyBits = binaryString.substring(0, 128);
  const checksumBits = binaryString.substring(128, 132);

  const entropy = Buffer.alloc(16);
  for (let i = 0; i < 16; i++) {
    entropy[i] = parseInt(entropyBits.substring(i * 8, (i + 1) * 8), 2);
  }

  const hash = crypto.createHash('sha256').update(entropy).digest();
  const calculatedChecksum = (hash[0] >> 4).toString(2).padStart(4, '0');

  if (checksumBits !== calculatedChecksum) {
    throw new Error('Mnemonic checksum mismatch. Phrase may be corrupted or transposed.');
  }

  return entropy;
}

/**
 * Validate a 12-word mnemonic phrase
 */
export function validateMnemonic(mnemonic) {
  try {
    mnemonicToEntropy(mnemonic);
    return true;
  } catch {
    return false;
  }
}

