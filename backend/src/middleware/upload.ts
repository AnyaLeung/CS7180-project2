import multer from 'multer';
import path from 'path';
import type { Request } from 'express';

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export function validatePythonFile(
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext !== '.py') {
    cb(new Error('Only .py files are allowed'));
    return;
  }
  cb(null, true);
}

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: validatePythonFile,
});
