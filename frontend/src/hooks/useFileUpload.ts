import { useState, useCallback } from 'react';
import { uploadPyFile, type FileUploadResponse } from '../utils/api';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
}

export interface UseFileUploadReturn {
  uploadState: UploadState;
  uploadedFiles: FileUploadResponse[];
  handleUpload: (file: File) => Promise<void>;
  clearError: () => void;
}

function validateClientSide(file: File): string | null {
  if (!file.name.endsWith('.py')) {
    return 'Only .py files are allowed';
  }
  if (file.size > MAX_FILE_SIZE) {
    return `File exceeds 5 MB limit (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
  }
  if (file.size === 0) {
    return 'File is empty';
  }
  return null;
}

export function useFileUpload(token: string): UseFileUploadReturn {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
  });
  const [uploadedFiles, setUploadedFiles] = useState<FileUploadResponse[]>([]);

  const clearError = useCallback(() => {
    setUploadState((prev) => ({ ...prev, error: null }));
  }, []);

  const handleUpload = useCallback(
    async (file: File) => {
      const validationError = validateClientSide(file);
      if (validationError) {
        setUploadState({ isUploading: false, progress: 0, error: validationError });
        return;
      }

      setUploadState({ isUploading: true, progress: 0, error: null });

      try {
        const result = await uploadPyFile(file, token, (progress) => {
          setUploadState((prev) => ({ ...prev, progress }));
        });

        setUploadedFiles((prev) => [result, ...prev]);
        setUploadState({ isUploading: false, progress: 100, error: null });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        setUploadState({ isUploading: false, progress: 0, error: message });
      }
    },
    [token]
  );

  return { uploadState, uploadedFiles, handleUpload, clearError };
}
