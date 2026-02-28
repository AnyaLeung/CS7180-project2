import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileUploader } from '../components/FileUploader';
import type { UploadState } from '../hooks/useFileUpload';

function renderUploader(overrides: {
  uploadState?: Partial<UploadState>;
  files?: { id: string; fileName: string; sizeBytes: number; uploadedAt: string }[];
  selectedFileId?: string | null;
} = {}) {
  const defaultState: UploadState = {
    isUploading: false,
    progress: 0,
    error: null,
    ...overrides.uploadState,
  };

  const props = {
    uploadState: defaultState,
    uploadedFiles: overrides.files ?? [],
    onUpload: vi.fn<(file: File) => Promise<void>>().mockResolvedValue(undefined),
    onClearError: vi.fn(),
    selectedFileId: overrides.selectedFileId ?? null,
    onSelectFile: vi.fn(),
  };

  render(<FileUploader {...props} />);
  return props;
}

describe('FileUploader', () => {
  it('renders the FILES heading', () => {
    renderUploader();
    expect(screen.getByText('Files')).toBeInTheDocument();
  });

  it('renders the upload drop zone with "Upload .py" text', () => {
    renderUploader();
    expect(screen.getByText('Upload .py')).toBeInTheDocument();
  });

  it('renders uploaded files in the list', () => {
    renderUploader({
      files: [
        { id: '1', fileName: 'main.py', sizeBytes: 512, uploadedAt: '2026-02-27T00:00:00Z' },
        { id: '2', fileName: 'utils.py', sizeBytes: 1024, uploadedAt: '2026-02-27T00:00:00Z' },
      ],
    });

    expect(screen.getByText('main.py')).toBeInTheDocument();
    expect(screen.getByText('utils.py')).toBeInTheDocument();
  });

  it('highlights the selected file', () => {
    renderUploader({
      files: [
        { id: '1', fileName: 'main.py', sizeBytes: 512, uploadedAt: '2026-02-27T00:00:00Z' },
      ],
      selectedFileId: '1',
    });

    const btn = screen.getByText('main.py');
    expect(btn.className).toContain('border-purple-500');
  });

  it('calls onSelectFile when a file is clicked', () => {
    const props = renderUploader({
      files: [
        { id: 'abc', fileName: 'main.py', sizeBytes: 512, uploadedAt: '2026-02-27T00:00:00Z' },
      ],
    });

    fireEvent.click(screen.getByText('main.py'));
    expect(props.onSelectFile).toHaveBeenCalledWith('abc');
  });

  it('shows progress bar when uploading', () => {
    renderUploader({
      uploadState: { isUploading: true, progress: 45 },
    });

    expect(screen.getByText('Uploading…')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
  });

  it('shows error message when upload fails', () => {
    renderUploader({
      uploadState: { error: 'Only .py files are allowed' },
    });

    expect(screen.getByText('Only .py files are allowed')).toBeInTheDocument();
  });

  it('opens file picker when drop zone is clicked', () => {
    renderUploader();

    const dropZone = screen.getByRole('button', { name: /upload/i });
    fireEvent.click(dropZone);
    // file input exists and is hidden
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.accept).toBe('.py');
  });

  it('triggers upload when a file is selected via input', () => {
    const props = renderUploader();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    const file = new File(['print("hi")'], 'test.py', { type: 'text/x-python' });
    fireEvent.change(input, { target: { files: [file] } });

    expect(props.onClearError).toHaveBeenCalled();
    expect(props.onUpload).toHaveBeenCalledWith(file);
  });
});
