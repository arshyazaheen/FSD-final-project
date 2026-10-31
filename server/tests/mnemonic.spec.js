import { describe, it, expect } from 'vitest';
import {
  generateMnemonic,
  entropyToMnemonic,
  mnemonicToEntropy,
  validateMnemonic,
} from '../utils/mnemonic.js';
import crypto from 'crypto';

describe('BIP-39 Mnemonic Recovery System', () => {
  it('should generate a valid 12-word recovery mnemonic', () => {
    const mnemonic = generateMnemonic();
    expect(typeof mnemonic).toBe('string');
    const words = mnemonic.split(' ');
    expect(words).toHaveLength(12);
    expect(validateMnemonic(mnemonic)).toBe(true);
  });

  it('should deterministically convert entropy to mnemonic and back to entropy', () => {
    const entropy = crypto.randomBytes(16);
    const mnemonic = entropyToMnemonic(entropy);
    const recoveredEntropy = mnemonicToEntropy(mnemonic);

    expect(recoveredEntropy).toEqual(entropy);
  });

  it('should reject corrupted or transposed mnemonic words', () => {
    const mnemonic = generateMnemonic();
    const words = mnemonic.split(' ');

    // Transpose two words (breaks 4-bit checksum)
    const temp = words[0];
    words[0] = words[1];
    words[1] = temp;
    const corrupted = words.join(' ');

    expect(validateMnemonic(corrupted)).toBe(false);
  });

  it('should reject mnemonics with invalid non-dictionary words', () => {
    const invalidPhrase = 'abandon ability able about above absent absorb abstract absurd abuse access notaword';
    expect(validateMnemonic(invalidPhrase)).toBe(false);
  });
});

