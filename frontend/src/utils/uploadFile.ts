export interface UploadResult {
  filename: string;
  storagePath: string;
  sizeBytes: number;
}

export interface UploadOptions {
  apiBaseUrl?: string;
  onProgress?: (percent: number) => void;
}

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export function validatePythonFile(file: File): string | null {
  if (!file.name.toLowerCase().endsWith('.py')) {
    return 'Only .py files are allowed';
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'File size must be 5 MB or less';
  }
  return null;
}

export function uploadFile(file: File, options: UploadOptions = {}): Promise<UploadResult> {
  const { apiBaseUrl = '', onProgress } = options;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress?.(percent);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const response = JSON.parse(xhr.responseText) as { file: UploadResult };
        resolve(response.file);
      } else {
        try {
          const response = JSON.parse(xhr.responseText) as { error: string };
          reject(new Error(response.error || 'Upload failed'));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error')));
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

    xhr.open('POST', `${apiBaseUrl}/files/upload`);
    xhr.send(formData);
  });
}
