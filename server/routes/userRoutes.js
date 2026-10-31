import express from 'express';
import { getMe, updateProfile, changePassword } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/profile', getMe);
router.put('/profile', updateProfile);
router.post('/change-password', changePassword);

export default router;

