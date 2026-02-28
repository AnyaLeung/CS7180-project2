import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUpload = vi.fn();

vi.mock('../config/supabase.js', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({ upload: mockUpload })),
    },
  },
}));

import { uploadFileToStorage } from '../services/fileService.js';

describe('uploadFileToStorage', () => {
  const mockFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'test.py',
    encoding: '7bit',
    mimetype: 'text/x-python',
    buffer: Buffer.from('print("hello")'),
    size: 15,
    stream: null as never,
    destination: '',
    filename: '',
    path: '',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should upload file and return metadata', async () => {
    mockUpload.mockResolvedValue({ data: { path: 'ok' }, error: null });

    const result = await uploadFileToStorage(mockFile, 'user-123');

    expect(result.filename).toBe('test.py');
    expect(result.sizeBytes).toBe(15);
    expect(result.storagePath).toMatch(/^user-123\//);
    expect(result.storagePath).toContain('_test.py');
  });

  it('should include a UUID in the storage path', async () => {
    mockUpload.mockResolvedValue({ data: { path: 'ok' }, error: null });

    const result = await uploadFileToStorage(mockFile, 'user-456');

    const uuidPattern =
      /^user-456\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_test\.py$/;
    expect(result.storagePath).toMatch(uuidPattern);
  });

  it('should pass correct options to Supabase upload', async () => {
    mockUpload.mockResolvedValue({ data: { path: 'ok' }, error: null });

    await uploadFileToStorage(mockFile, 'user-789');

    expect(mockUpload).toHaveBeenCalledWith(
      expect.stringContaining('user-789/'),
      mockFile.buffer,
      { contentType: 'text/x-python', upsert: false }
    );
  });

  it('should throw when Supabase returns an error', async () => {
    mockUpload.mockResolvedValue({
      data: null,
      error: { message: 'Bucket not found' },
    });

    await expect(uploadFileToStorage(mockFile, 'user-123')).rejects.toThrow(
      'Storage upload failed: Bucket not found'
    );
  });
});
