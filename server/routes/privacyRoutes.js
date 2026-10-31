import express from 'express';
import { getVaultPrivacyOverview, analyzeText } from '../controllers/privacyController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/analyze', analyzeText); // Local stateless scan
router.get('/overview', authenticate, getVaultPrivacyOverview); // User vault aggregated posture

export default router;

