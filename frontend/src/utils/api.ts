const API_BASE = '/api';

export interface FileUploadResponse {
  id: string;
  fileName: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface UploadProgressCallback {
  (progress: number): void;
}

export async function uploadPyFile(
  file: File,
  token: string,
  onProgress?: UploadProgressCallback
): Promise<FileUploadResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 201) {
        resolve(JSON.parse(xhr.responseText) as FileUploadResponse);
      } else {
        const body = JSON.parse(xhr.responseText) as { error: string };
        reject(new Error(body.error ?? `Upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during file upload'));
    });

    xhr.open('POST', `${API_BASE}/files`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
}
