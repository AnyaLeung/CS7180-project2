import { Router } from 'express';
import { upload } from '../middleware/upload.js';
import { multerErrorHandler } from '../middleware/errorHandler.js';
import { handleFileUpload } from '../controllers/fileController.js';

const router = Router();

// TODO(#7): Add JWT auth middleware before upload.single
router.post('/upload', upload.single('file'), handleFileUpload);

router.use(multerErrorHandler);

export default router;
