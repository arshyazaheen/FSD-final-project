/**
 * VaultVerse Privacy Health Scorer — Deterministic Posture Calculation
 */

export function calculatePrivacyScore(scanResult, context = {}) {
  let score = 100;
  const deductions = [];
  const checklist = [];

  const entitiesByType = scanResult.entitiesByType || {};

  // 1. Critical entities deduction (Cards, SSNs, API secrets)
  const criticalCount =
    (entitiesByType.PAYMENT_CARD || 0) +
    (entitiesByType.US_SSN || 0) +
    (entitiesByType.SECRET_KEY || 0);

  if (criticalCount > 0) {
    const criticalDeduction = Math.min(45, criticalCount * 15);
    score -= criticalDeduction;
    deductions.push({
      factor: 'Critical Financial / Identity Secrets',
      pointsDeducted: criticalDeduction,
      reason: `Found ${criticalCount} critical secret(s) (cards, SSNs, or cloud API tokens).`,
      remediation: 'Redact or tokenize sensitive card numbers and rotate exposed secret keys.',
    });
    checklist.push('Rotate or redact exposed financial and authentication credentials.');
  }

  // 2. High-severity entities deduction (IBANs, Passports)
  const highCount =
    (entitiesByType.IBAN || 0) +
    (entitiesByType.PASSPORT || 0);

  if (highCount > 0) {
    const highDeduction = Math.min(24, highCount * 8);
    score -= highDeduction;
    deductions.push({
      factor: 'Government / Bank Identifiers',
      pointsDeducted: highDeduction,
      reason: `Found ${highCount} high-sensitivity identifier(s) (passports or bank account numbers).`,
      remediation: 'Apply encrypted storage policies and verify access controls.',
    });
    checklist.push('Ensure government and banking documents are encrypted at rest with AES-256-GCM.');
  }

  // 3. Contact information density deduction
  const contactCount =
    (entitiesByType.EMAIL || 0) +
    (entitiesByType.PHONE || 0);

  if (contactCount > 5) {
    const contactDeduction = Math.min(10, Math.floor(contactCount / 5) * 2);
    score -= contactDeduction;
    deductions.push({
      factor: 'Contact Information Density',
      pointsDeducted: contactDeduction,
      reason: `High concentration of contact details (${contactCount} emails/phones detected).`,
      remediation: 'Review document retention policy to comply with data minimization principles.',
    });
    checklist.push('Minimize unencrypted contact lists and verify user consent records.');
  }

  // 4. Document retention check
  if (context.hasRetentionExpiry === false && (criticalCount > 0 || highCount > 0)) {
    score -= 6;
    deductions.push({
      factor: 'Missing Auto-Retention Expiration',
      pointsDeducted: 6,
      reason: 'Sensitive document has indefinite retention without an automated expiration date.',
      remediation: 'Configure automated document self-destruction / expiration policy.',
    });
    checklist.push('Set an expiration date for sensitive documents to prevent stale data accumulation.');
  }

  // 5. Active public share link risk
  if (context.hasActiveShareLink && !context.isSharePasswordProtected) {
    score -= 15;
    deductions.push({
      factor: 'Unprotected Sharing Link',
      pointsDeducted: 15,
      reason: 'Active share link exists without passphrase protection.',
      remediation: 'Add password protection and strict view limits to share links.',
    });
    checklist.push('Protect active sharing links with strong passphrases and limited view counts.');
  }

  // Bound score between 0 and 100
  score = Math.max(0, Math.min(100, score));

  // Determine Grade
  let grade = 'EXCELLENT';
  let riskLevel = 'LOW';

  if (score >= 85) {
    grade = 'EXCELLENT';
    riskLevel = 'LOW';
  } else if (score >= 70) {
    grade = 'GOOD';
    riskLevel = 'MEDIUM';
  } else if (score >= 50) {
    grade = 'ATTENTION';
    riskLevel = 'HIGH';
  } else {
    grade = 'CRITICAL';
    riskLevel = 'CRITICAL';
  }

  return {
    score,
    grade,
    riskLevel,
    totalEntities: scanResult.totalEntities || 0,
    deductions,
    remediationChecklist: checklist,
    calculatedAt: new Date().toISOString(),
  };
}

