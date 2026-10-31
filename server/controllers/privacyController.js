import Document from '../models/Document.js';
import { scanTextForPII } from '../utils/piiRules.js';
import { calculatePrivacyScore } from '../utils/privacyScorer.js';

export async function getVaultPrivacyOverview(req, res, next) {
  try {
    const docs = await Document.find({ userId: req.user._id, isDeleted: false });

    if (docs.length === 0) {
      return res.json({
        success: true,
        overview: {
          overallScore: 100,
          overallGrade: 'EXCELLENT',
          totalDocuments: 0,
          scannedDocuments: 0,
          totalEntitiesDetected: 0,
          riskBreakdown: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
          entityTypeCounts: {},
          highRiskDocuments: [],
          recommendedActions: ['Upload your sensitive documents to analyze and protect personal data.'],
        },
      });
    }

    let totalScore = 0;
    let scannedCount = 0;
    let totalEntities = 0;
    const entityTypeCounts = {};
    const riskBreakdown = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    const highRiskDocuments = [];
    const recommendedActionsSet = new Set();

    for (const doc of docs) {
      const assessment = doc.privacyAssessment;
      if (assessment && assessment.scanned) {
        scannedCount++;
        totalScore += assessment.score;
        riskBreakdown[assessment.riskLevel] = (riskBreakdown[assessment.riskLevel] || 0) + 1;

        if (assessment.entityCounts) {
          for (const [type, count] of Object.entries(assessment.entityCounts)) {
            entityTypeCounts[type] = (entityTypeCounts[type] || 0) + count;
            totalEntities += count;
          }
        }

        if (assessment.riskLevel === 'CRITICAL' || assessment.riskLevel === 'HIGH') {
          highRiskDocuments.push({
            id: doc._id,
            title: doc.title,
            category: doc.category,
            score: assessment.score,
            riskLevel: assessment.riskLevel,
            entitiesCount: assessment.detectedEntities ? assessment.detectedEntities.length : 0,
          });
          recommendedActionsSet.add(`Review document "${doc.title}" for exposed credentials or personal IDs.`);
        }
      }
    }

    const overallScore = scannedCount > 0 ? Math.round(totalScore / scannedCount) : 100;
    let overallGrade = 'EXCELLENT';
    if (overallScore < 50) overallGrade = 'CRITICAL';
    else if (overallScore < 70) overallGrade = 'ATTENTION';
    else if (overallScore < 85) overallGrade = 'GOOD';

    if (entityTypeCounts['SECRET_KEY']) {
      recommendedActionsSet.add('Rotate leaked cloud API tokens and credentials detected in your documents.');
    }
    if (entityTypeCounts['PAYMENT_CARD']) {
      recommendedActionsSet.add('Redact full credit card numbers to comply with PCI-DSS guidelines.');
    }
    if (entityTypeCounts['US_SSN']) {
      recommendedActionsSet.add('Ensure Social Security Numbers are strictly restricted to emergency and legal vaults.');
    }

    res.json({
      success: true,
      overview: {
        overallScore,
        overallGrade,
        totalDocuments: docs.length,
        scannedDocuments: scannedCount,
        totalEntitiesDetected: totalEntities,
        riskBreakdown,
        entityTypeCounts,
        highRiskDocuments,
        recommendedActions: Array.from(recommendedActionsSet),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function analyzeText(req, res, next) {
  try {
    const { text, context } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ success: false, error: 'Text string is required for privacy analysis' });
    }

    const scanResult = scanTextForPII(text);
    const scoreReport = calculatePrivacyScore(scanResult, context || {});

    res.json({
      success: true,
      scanResult,
      scoreReport,
    });
  } catch (error) {
    next(error);
  }
}

