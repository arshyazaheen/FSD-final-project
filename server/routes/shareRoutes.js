import express from 'express';
import {
  create,
  access,
  download,
  revoke,
  list,
} from '../controllers/shareController.js';
import { authenticate } from '../middleware/auth.js';
import { shareAccessLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Public share link access endpoints (rate-limited)
router.get('/access/:token', shareAccessLimiter, access);
router.get('/access/:token/download', shareAccessLimiter, download);

// Authenticated vault owner share management endpoints
router.post('/', authenticate, create);
router.get('/my-shares', authenticate, list);
router.delete('/:id', authenticate, revoke);

export default router;

