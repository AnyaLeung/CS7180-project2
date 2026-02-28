import { supabase } from '../config/supabase.js';
import crypto from 'crypto';

const BUCKET_NAME = 'python-files';

export interface UploadResult {
  storagePath: string;
  filename: string;
  sizeBytes: number;
}

export async function uploadFileToStorage(
  file: Express.Multer.File,
  userId: string
): Promise<UploadResult> {
  const uniqueName = `${userId}/${crypto.randomUUID()}_${file.originalname}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(uniqueName, file.buffer, {
      contentType: 'text/x-python',
      upsert: false,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  return {
    storagePath: uniqueName,
    filename: file.originalname,
    sizeBytes: file.size,
  };
}
