import { Response } from 'express';
import { AuthenticatedRequest, FileUploadResponse } from '../types';
import { uploadFile, FileValidationError } from '../services/fileService';

export async function handleFileUpload(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: 'User not authenticated' });
    return;
  }

  const file = req.file;
  if (!file) {
    res.status(400).json({ error: 'No file provided' });
    return;
  }

  try {
    const record = await uploadFile(user.userId, file.originalname, file.buffer);

    const response: FileUploadResponse = {
      id: record.id,
      fileName: record.fileName,
      sizeBytes: record.sizeBytes,
      uploadedAt: record.uploadedAt,
    };

    res.status(201).json(response);
  } catch (err) {
    if (err instanceof FileValidationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error('File upload error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
