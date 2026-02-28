import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';

export function multerErrorHandler(
  err: Error,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ error: 'File size must be 5 MB or less' });
      return;
    }
    res.status(400).json({ error: err.message });
    return;
  }

  if (err.message === 'Only .py files are allowed') {
    res.status(422).json({ error: err.message });
    return;
  }

  next(err);
}
