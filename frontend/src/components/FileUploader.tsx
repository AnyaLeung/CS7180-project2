import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from 'react';
import { uploadFile, validatePythonFile, type UploadResult } from '../utils/uploadFile';

type UploadState = 'idle' | 'dragging' | 'uploading' | 'success' | 'error';

interface FileUploaderProps {
  onUploadComplete?: (result: UploadResult) => void;
  apiBaseUrl?: string;
}

export function FileUploader({ onUploadComplete, apiBaseUrl }: FileUploaderProps) {
  const [state, setState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<UploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const processFile = useCallback(
    async (file: File) => {
      const validationError = validatePythonFile(file);
      if (validationError) {
        setError(validationError);
        setState('error');
        return;
      }

      setError(null);
      setState('uploading');
      setProgress(0);
      setUploadedFile(null);

      try {
        const result = await uploadFile(file, {
          apiBaseUrl,
          onProgress: (p) => setProgress(p),
        });
        setUploadedFile(result);
        setState('success');
        onUploadComplete?.(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        setError(message);
        setState('error');
      }
    },
    [apiBaseUrl, onUploadComplete]
  );

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) {
      setState('dragging');
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      setState((prev) => (prev === 'dragging' ? 'idle' : prev));
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        void processFile(droppedFile);
      } else {
        setError('No file detected');
        setState('error');
      }
    },
    [processFile]
  );

  const handleFileInput = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        void processFile(selectedFile);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [processFile]
  );

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleReset = useCallback(() => {
    setState('idle');
    setError(null);
    setProgress(0);
    setUploadedFile(null);
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <div
        data-testid="drop-zone"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={state === 'idle' || state === 'dragging' ? handleBrowseClick : undefined}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') handleBrowseClick();
        }}
        className={`
          relative rounded-xl border-2 border-dashed p-10 text-center transition-all duration-200
          ${state === 'dragging' ? 'border-indigo-400 bg-indigo-950/40 scale-[1.01]' : ''}
          ${state === 'idle' ? 'border-gray-600 bg-gray-900/50 hover:border-gray-400 hover:bg-gray-900/70 cursor-pointer' : ''}
          ${state === 'uploading' ? 'border-indigo-500 bg-gray-900/50' : ''}
          ${state === 'success' ? 'border-emerald-500 bg-emerald-950/30' : ''}
          ${state === 'error' ? 'border-red-500 bg-red-950/30' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".py"
          onChange={handleFileInput}
          className="hidden"
          data-testid="file-input"
        />

        {(state === 'idle' || state === 'dragging') && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <svg
                className={`w-14 h-14 transition-colors ${state === 'dragging' ? 'text-indigo-400' : 'text-gray-500'}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                />
              </svg>
            </div>
            <div>
              <p className="text-lg font-medium text-gray-200">
                {state === 'dragging' ? 'Drop your file here' : 'Drag & drop your Python file'}
              </p>
              <p className="mt-1 text-sm text-gray-400">
                or{' '}
                <span className="text-indigo-400 underline underline-offset-2">browse</span>{' '}
                to select
              </p>
            </div>
            <p className="text-xs text-gray-500">.py files only, up to 5 MB</p>
          </div>
        )}

        {state === 'uploading' && (
          <div className="space-y-4" data-testid="upload-progress">
            <div className="flex justify-center">
              <svg
                className="w-10 h-10 text-indigo-400 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-200">Uploading...</p>
            <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
                data-testid="progress-bar"
              />
            </div>
            <p className="text-xs text-gray-400">{progress}%</p>
          </div>
        )}

        {state === 'success' && uploadedFile && (
          <div className="space-y-4" data-testid="upload-success">
            <div className="flex justify-center">
              <svg
                className="w-12 h-12 text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-300">Upload complete</p>
              <p className="mt-1 text-sm text-gray-300">{uploadedFile.filename}</p>
              <p className="text-xs text-gray-500">{formatBytes(uploadedFile.sizeBytes)}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleReset();
              }}
              className="mt-2 px-4 py-1.5 text-sm rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
            >
              Upload another file
            </button>
          </div>
        )}

        {state === 'error' && (
          <div className="space-y-4" data-testid="upload-error">
            <div className="flex justify-center">
              <svg
                className="w-12 h-12 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-red-300">{error}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleReset();
              }}
              className="mt-2 px-4 py-1.5 text-sm rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
