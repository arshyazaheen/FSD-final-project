import express from 'express';
import { getLogs, verifyChain } from '../controllers/auditController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getLogs);
router.get('/verify', verifyChain);

export default router;

