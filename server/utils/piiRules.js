/**
 * VaultVerse Privacy Engine — Deterministic PII Identification & Validation Rules
 */

export function validateLuhn(cardNumber) {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;

  let sum = 0;
  let alternate = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }

  return sum % 10 === 0;
}

export function validateIBAN(iban) {
  const clean = iban.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (clean.length < 15 || clean.length > 34) return false;

  const rearranged = clean.slice(4) + clean.slice(0, 4);
  let numericString = '';
  for (let i = 0; i < rearranged.length; i++) {
    const code = rearranged.charCodeAt(i);
    if (code >= 65 && code <= 90) {
      numericString += (code - 55).toString();
    } else {
      numericString += rearranged[i];
    }
  }

  let remainder = 0;
  for (let i = 0; i < numericString.length; i += 7) {
    const chunk = remainder.toString() + numericString.substring(i, i + 7);
    remainder = parseInt(chunk, 10) % 97;
  }

  return remainder === 1;
}

export function maskEntity(value, type) {
  const clean = value.trim();
  switch (type) {
    case 'PAYMENT_CARD': {
      const digits = clean.replace(/\D/g, '');
      if (digits.length < 4) return '****';
      return `****-****-****-${digits.slice(-4)}`;
    }
    case 'US_SSN': {
      const digits = clean.replace(/\D/g, '');
      if (digits.length < 4) return '***-**-****';
      return `***-**-${digits.slice(-4)}`;
    }
    case 'IBAN': {
      const cleanIban = clean.replace(/[^A-Za-z0-9]/g, '');
      if (cleanIban.length < 6) return '****';
      return `${cleanIban.slice(0, 2)}****${cleanIban.slice(-4)}`;
    }
    case 'SECRET_KEY': {
      if (clean.length < 8) return '****';
      return `${clean.slice(0, 4)}...${clean.slice(-4)}`;
    }
    case 'EMAIL': {
      const parts = clean.split('@');
      if (parts.length !== 2) return '***@***.***';
      const name = parts[0];
      const domain = parts[1];
      const maskedName = name.length > 2 ? `${name[0]}***${name[name.length - 1]}` : `${name[0]}***`;
      return `${maskedName}@${domain}`;
    }
    case 'PHONE': {
      const digits = clean.replace(/\D/g, '');
      if (digits.length < 4) return '***-***-****';
      return `(***) ***-${digits.slice(-4)}`;
    }
    case 'PASSPORT': {
      if (clean.length < 3) return '****';
      return `${clean.slice(0, 1)}*****${clean.slice(-2)}`;
    }
    default:
      return '********';
  }
}

export const PII_PATTERNS = [
  {
    type: 'PAYMENT_CARD',
    label: 'Payment Card (Visa / MC / Amex / Discover)',
    regex: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
    severity: 'CRITICAL',
    remediation: 'Redact or tokenize full primary account number (PAN).',
    validator: validateLuhn,
  },
  {
    type: 'US_SSN',
    label: 'US Social Security Number',
    regex: /\b(?!000|666|9\d{2})\d{3}[-\s]?(?!00)\d{2}[-\s]?(?!0000)\d{4}\b/g,
    severity: 'CRITICAL',
    remediation: 'Store encrypted; mask middle and first five digits.',
    validator: (val) => {
      const digits = val.replace(/\D/g, '');
      if (digits.length !== 9) return false;
      const area = parseInt(digits.substring(0, 3), 10);
      const group = parseInt(digits.substring(3, 5), 10);
      const serial = parseInt(digits.substring(5, 9), 10);
      return area !== 0 && area !== 666 && area < 900 && group !== 0 && serial !== 0;
    },
  },
  {
    type: 'IBAN',
    label: 'International Bank Account Number',
    regex: /\b[A-Z]{2}[0-9]{2}(?:[ ]?[0-9A-Z]{4}){3,7}(?:[ ]?[0-9A-Z]{1,2})?\b/gi,
    severity: 'HIGH',
    remediation: 'Mask intermediate clearing and account digits.',
    validator: validateIBAN,
  },
  {
    type: 'SECRET_KEY',
    label: 'High-Entropy Secret Key / API Token',
    regex: /\b(?:ghp_[a-zA-Z0-9]{36}|AKIA[0-9A-Z]{16}|ey[A-Za-z0-9_-]{20,}\.ey[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}|-----BEGIN PRIVATE KEY-----)\b/g,
    severity: 'CRITICAL',
    remediation: 'Revoke key immediately, migrate to secure secret manager.',
    validator: () => true,
  },
  {
    type: 'PASSPORT',
    label: 'Passport Number',
    regex: /\b[A-Z]{1,2}[0-9]{7,9}\b/g,
    severity: 'HIGH',
    remediation: 'Restrict access to trusted identity verification services.',
    validator: (val) => /^[A-Z]{1,2}\d{7,9}$/.test(val.trim()),
  },
  {
    type: 'EMAIL',
    label: 'Personal Email Address',
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    severity: 'LOW',
    remediation: 'Ensure consent under GDPR/CCPA regulations.',
    validator: () => true,
  },
  {
    type: 'PHONE',
    label: 'Telephone Number',
    regex: /(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})\b/g,
    severity: 'LOW',
    remediation: 'Mask all but last four digits for display.',
    validator: () => true,
  },
];

export function scanTextForPII(text) {
  const startTime = Date.now();
  if (!text || typeof text !== 'string') {
    return {
      entities: [],
      totalEntities: 0,
      entitiesByType: {},
      highestSeverity: 'LOW',
      scanDurationMs: 0,
      textLength: 0,
    };
  }

  const entities = [];
  const entitiesByType = {};
  let highestSeverity = 'LOW';
  const severityRank = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };

  for (const rule of PII_PATTERNS) {
    const matches = text.matchAll(rule.regex);
    for (const match of matches) {
      const rawValue = match[0];
      const isValid = rule.validator(rawValue);
      if (!isValid) continue;

      const maskedValue = maskEntity(rawValue, rule.type);
      entities.push({
        type: rule.type,
        label: rule.label,
        maskedValue,
        severity: rule.severity,
        confidence: 'CONFIRMED',
        isValidChecksum: true,
        remediation: rule.remediation,
        startIndex: match.index,
        endIndex: match.index + rawValue.length,
      });

      entitiesByType[rule.type] = (entitiesByType[rule.type] || 0) + 1;
      if (severityRank[rule.severity] > severityRank[highestSeverity]) {
        highestSeverity = rule.severity;
      }
    }
  }

  return {
    entities,
    totalEntities: entities.length,
    entitiesByType,
    highestSeverity,
    scanDurationMs: Date.now() - startTime,
    textLength: text.length,
  };
}

