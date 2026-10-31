import express from 'express';
import { list, add, update, remove } from '../controllers/trustedContactController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', list);
router.post('/', add);
router.put('/:id', update);
router.delete('/:id', remove);

export default router;

