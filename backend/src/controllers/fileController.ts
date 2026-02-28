import type { Request, Response } from 'express';
import { uploadFileToStorage } from '../services/fileService.js';

export async function handleFileUpload(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    res.status(400).json({ error: 'No file provided' });
    return;
  }

  try {
    // TODO(#7): Extract userId from JWT token via auth middleware
    const userId = (req as Request & { userId?: string }).userId ?? 'anonymous';

    const result = await uploadFileToStorage(req.file, userId);

    res.status(201).json({
      message: 'File uploaded successfully',
      file: {
        filename: result.filename,
        storagePath: result.storagePath,
        sizeBytes: result.sizeBytes,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    res.status(500).json({ error: message });
  }
}
