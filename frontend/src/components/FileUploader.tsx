import { useCallback, useRef, useState, type DragEvent } from 'react';
import type { FileUploadResponse } from '../utils/api';
import type { UploadState } from '../hooks/useFileUpload';

interface FileUploaderProps {
  uploadState: UploadState;
  uploadedFiles: FileUploadResponse[];
  onUpload: (file: File) => Promise<void>;
  onClearError: () => void;
  selectedFileId: string | null;
  onSelectFile: (id: string) => void;
}

export function FileUploader({
  uploadState,
  uploadedFiles,
  onUpload,
  onClearError,
  selectedFileId,
  onSelectFile,
}: FileUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (file) {
        onClearError();
        void onUpload(file);
      }
    },
    [onUpload, onClearError]
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      handleFile(e.dataTransfer.files[0]);
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFile(e.target.files?.[0]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [handleFile]
  );

  return (
    <aside className="w-48 flex-shrink-0 border-r border-gray-800 flex flex-col">
      <div className="px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Files
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        {uploadedFiles.map((f) => (
          <button
            key={f.id}
            onClick={() => onSelectFile(f.id)}
            className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
              selectedFileId === f.id
                ? 'bg-gray-800 text-white border-l-2 border-purple-500'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
            }`}
          >
            {f.fileName}
          </button>
        ))}
      </div>

      <div className="p-3 border-t border-gray-800">
        <div
          role="button"
          tabIndex={0}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
          }}
          className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 cursor-pointer transition-colors ${
            isDragOver
              ? 'border-purple-500 bg-purple-500/10'
              : 'border-gray-700 hover:border-gray-500'
          } ${uploadState.isUploading ? 'pointer-events-none opacity-60' : ''}`}
        >
          <svg
            className="w-6 h-6 text-gray-500 mb-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span className="text-xs text-gray-500">
            {uploadState.isUploading ? 'Uploading…' : 'Upload .py'}
          </span>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".py"
          onChange={handleInputChange}
          className="hidden"
        />

        {uploadState.isUploading && (
          <div className="mt-2">
            <div className="h-1.5 w-full rounded-full bg-gray-800">
              <div
                className="h-1.5 rounded-full bg-purple-500 transition-all duration-200"
                style={{ width: `${uploadState.progress}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 mt-1">
              {uploadState.progress}%
            </span>
          </div>
        )}

        {uploadState.error && (
          <div className="mt-2 rounded bg-red-900/30 border border-red-800 px-2 py-1">
            <p className="text-xs text-red-400">{uploadState.error}</p>
          </div>
        )}
      </div>
    </aside>
  );
}
