import { supabase } from '../lib/supabase';
import { FileRecord } from '../types';
import path from 'path';
import crypto from 'crypto';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_EXTENSION = '.py';
const STORAGE_BUCKET = 'py-files';

export class FileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileValidationError';
  }
}

export function validateFile(
  originalName: string,
  sizeBytes: number
): void {
  const ext = path.extname(originalName).toLowerCase();
  if (ext !== ALLOWED_EXTENSION) {
    throw new FileValidationError(
      `Only .py files are allowed. Received: ${ext || 'no extension'}`
    );
  }

  if (sizeBytes > MAX_FILE_SIZE) {
    throw new FileValidationError(
      `File size exceeds 5 MB limit. Received: ${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`
    );
  }

  if (sizeBytes === 0) {
    throw new FileValidationError('File is empty');
  }
}

export async function uploadFile(
  userId: string,
  originalName: string,
  buffer: Buffer
): Promise<FileRecord> {
  validateFile(originalName, buffer.length);

  const uniqueId = crypto.randomUUID();
  const storagePath = `${userId}/${uniqueId}${path.extname(originalName)}`;

  const { error: storageError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType: 'text/x-python',
      upsert: false,
    });

  if (storageError) {
    throw new Error(`Storage upload failed: ${storageError.message}`);
  }

  const { data, error: dbError } = await supabase
    .from('files')
    .insert({
      id: uniqueId,
      user_id: userId,
      file_name: originalName,
      storage_path: storagePath,
      size_bytes: buffer.length,
    })
    .select()
    .single();

  if (dbError) {
    await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
    throw new Error(`Database insert failed: ${dbError.message}`);
  }

  return {
    id: data.id,
    userId: data.user_id,
    fileName: data.file_name,
    storagePath: data.storage_path,
    sizeBytes: data.size_bytes,
    uploadedAt: data.uploaded_at,
  };
}
