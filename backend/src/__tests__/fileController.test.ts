import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

const mockUploadFileToStorage = vi.fn();

vi.mock('../services/fileService.js', () => ({
  uploadFileToStorage: (...args: unknown[]) => mockUploadFileToStorage(...args),
}));

import { handleFileUpload } from '../controllers/fileController.js';

function createMockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

describe('handleFileUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 when no file is provided', async () => {
    const req = { file: undefined } as Request;
    const res = createMockRes();

    await handleFileUpload(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'No file provided' });
  });

  it('should return 201 with file info on successful upload', async () => {
    mockUploadFileToStorage.mockResolvedValue({
      storagePath: 'anonymous/uuid_test.py',
      filename: 'test.py',
      sizeBytes: 42,
    });

    const req = {
      file: { originalname: 'test.py', size: 42 } as Express.Multer.File,
    } as Request;
    const res = createMockRes();

    await handleFileUpload(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: 'File uploaded successfully',
      file: {
        filename: 'test.py',
        storagePath: 'anonymous/uuid_test.py',
        sizeBytes: 42,
      },
    });
  });

  it('should return 500 when the service throws an error', async () => {
    mockUploadFileToStorage.mockRejectedValue(new Error('Storage upload failed: timeout'));

    const req = {
      file: { originalname: 'test.py' } as Express.Multer.File,
    } as Request;
    const res = createMockRes();

    await handleFileUpload(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Storage upload failed: timeout' });
  });

  it('should default userId to anonymous when no auth context', async () => {
    mockUploadFileToStorage.mockResolvedValue({
      storagePath: 'anonymous/uuid_test.py',
      filename: 'test.py',
      sizeBytes: 10,
    });

    const req = {
      file: { originalname: 'test.py', size: 10 } as Express.Multer.File,
    } as Request;
    const res = createMockRes();

    await handleFileUpload(req, res);

    expect(mockUploadFileToStorage).toHaveBeenCalledWith(req.file, 'anonymous');
  });
});
