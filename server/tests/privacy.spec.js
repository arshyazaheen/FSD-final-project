import { describe, it, expect } from 'vitest';
import {
  validateLuhn,
  validateIBAN,
  maskEntity,
  scanTextForPII,
} from '../utils/piiRules.js';
import { calculatePrivacyScore } from '../utils/privacyScorer.js';

describe('Privacy Engine — PII Detection, Validation & Scoring', () => {
  describe('Luhn MOD-10 Algorithm', () => {
    it('should validate authentic synthetic payment card checksums', () => {
      const validVisa = '4532015012345671';
      const validMastercard = '5425233430109903';
      const validAmex = '378282246310005';

      expect(validateLuhn(validVisa)).toBe(true);
      expect(validateLuhn(validMastercard)).toBe(true);
      expect(validateLuhn(validAmex)).toBe(true);
    });

    it('should reject invalid or corrupted card numbers where Luhn fails', () => {
      const invalidVisa = '4532015012345679';
      const invalidMastercard = '5425233430109904';
      const random16Digits = '1111222233334445';

      expect(validateLuhn(invalidVisa)).toBe(false);
      expect(validateLuhn(invalidMastercard)).toBe(false);
      expect(validateLuhn(random16Digits)).toBe(false);
    });
  });

  describe('IBAN Validation', () => {
    it('should validate conforming IBANs', () => {
      const validGermanIBAN = 'DE89370400440532013000';
      const validFrenchIBAN = 'FR1420041010050500013M02606';

      expect(validateIBAN(validGermanIBAN)).toBe(true);
      expect(validateIBAN(validFrenchIBAN)).toBe(true);
    });

    it('should reject corrupted IBAN checksums', () => {
      const corruptedGerman = 'DE88370400440532013000';
      const corruptedFrench = 'FR0020041010050500013M02606';

      expect(validateIBAN(corruptedGerman)).toBe(false);
      expect(validateIBAN(corruptedFrench)).toBe(false);
    });
  });

  describe('Entity Masking', () => {
    it('should securely mask payment cards leaving only last 4 digits', () => {
      expect(maskEntity('4532015012345671', 'PAYMENT_CARD')).toBe('****-****-****-5671');
    });

    it('should securely mask US SSNs', () => {
      expect(maskEntity('123-45-6789', 'US_SSN')).toBe('***-**-6789');
    });

    it('should securely mask emails preserving domain', () => {
      expect(maskEntity('alexander@vaultverse.io', 'EMAIL')).toBe('a***r@vaultverse.io');
    });

    it('should mask API secrets leaving only minimal edge identifiers', () => {
      expect(maskEntity('AKIAIOSFODNN7EXAMPLE', 'SECRET_KEY')).toBe('AKIA...MPLE');
    });
  });

  describe('Full Unstructured Text PII Scanner', () => {
    it('should detect multiple sensitive entities in realistic text', () => {
      const sampleText = `
        Employee Statement:
        Name: John Doe
        SSN: 123-45-6789
        Email: employee@company.com
        Primary Card: 4532015012345671
        AWS Access: AKIAIOSFODNN7EXAMPLE
      `;

      const result = scanTextForPII(sampleText);
      expect(result.totalEntities).toBeGreaterThanOrEqual(4);
      expect(result.entitiesByType['US_SSN']).toBe(1);
      expect(result.entitiesByType['EMAIL']).toBe(1);
      expect(result.entitiesByType['PAYMENT_CARD']).toBe(1);
      expect(result.entitiesByType['SECRET_KEY']).toBe(1);
      expect(result.highestSeverity).toBe('CRITICAL');
    });

    it('should return clean scan for innocuous text', () => {
      const cleanText = 'The quarterly roadmap meeting has been scheduled for next Tuesday in the main auditorium.';
      const result = scanTextForPII(cleanText);
      expect(result.totalEntities).toBe(0);
      expect(result.highestSeverity).toBe('LOW');
    });
  });

  describe('Deterministic Privacy Health Scorer', () => {
    it('should assign optimal 100 score to clean documents', () => {
      const cleanScan = {
        totalEntities: 0,
        entitiesByType: {},
        highestSeverity: 'LOW',
      };
      const report = calculatePrivacyScore(cleanScan, { hasRetentionExpiry: true });
      expect(report.score).toBe(100);
      expect(report.grade).toBe('EXCELLENT');
      expect(report.riskLevel).toBe('LOW');
      expect(report.deductions).toHaveLength(0);
    });

    it('should deduct points and assign CRITICAL tier for unredacted financial and identity secrets', () => {
      const criticalScan = {
        totalEntities: 3,
        entitiesByType: {
          PAYMENT_CARD: 1,
          US_SSN: 1,
          SECRET_KEY: 1,
        },
        highestSeverity: 'CRITICAL',
      };
      const report = calculatePrivacyScore(criticalScan, {
        hasRetentionExpiry: false,
        hasActiveShareLink: true,
        isSharePasswordProtected: false,
      });

      expect(report.score).toBeLessThan(50);
      expect(report.grade).toBe('CRITICAL');
      expect(report.deductions.length).toBeGreaterThanOrEqual(2);
      expect(report.remediationChecklist.length).toBeGreaterThanOrEqual(2);
    });
  });
});
