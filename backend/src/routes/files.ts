import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth';
import { handleFileUpload } from '../controllers/fileController';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

export const fileRoutes = Router();

fileRoutes.post('/', authenticate, upload.single('file'), handleFileUpload);
