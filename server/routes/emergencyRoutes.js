import express from 'express';
import {
  getProfile,
  updateProfile,
  requestAccess,
  reviewRequest,
  getEmergencyData,
  revokeAccess,
  listRequests,
} from '../controllers/emergencyController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Public emergency request lodging & tokenized data access
router.post('/request-access', requestAccess);
router.get('/access/:id', getEmergencyData);

// Authenticated owner endpoints
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.get('/requests', authenticate, listRequests);
router.post('/requests/:id/review', authenticate, reviewRequest);
router.delete('/requests/:id', authenticate, revokeAccess);

export default router;

