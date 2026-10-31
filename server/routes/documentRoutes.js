import express from 'express';
import {
  upload,
  getDocuments,
  getDocument,
  download,
  updateMetadata,
  remove,
  scanPrivacy,
} from '../controllers/documentController.js';
import { authenticate } from '../middleware/auth.js';
import { uploadMiddleware } from '../middleware/upload.js';

const router = express.Router();

router.use(authenticate);

router.post('/upload', uploadMiddleware.single('file'), upload);
router.get('/', getDocuments);
router.get('/:id', getDocument);
router.get('/:id/download', download);
router.put('/:id', updateMetadata);
router.delete('/:id', remove);
router.post('/:id/scan', scanPrivacy);

export default router;

