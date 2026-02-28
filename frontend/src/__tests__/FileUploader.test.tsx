import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FileUploader } from '../components/FileUploader';

vi.mock('../utils/uploadFile', async (importOriginal) => {
  const original = await importOriginal<typeof import('../utils/uploadFile')>();
  return {
    ...original,
    uploadFile: vi.fn(),
  };
});

import { uploadFile as mockUploadFile } from '../utils/uploadFile';
const mockedUpload = vi.mocked(mockUploadFile);

function createPyFile(name = 'script.py', content = 'print("hello")', size?: number) {
  const fileContent = size ? 'x'.repeat(size) : content;
  return new File([fileContent], name, { type: 'text/x-python' });
}

describe('FileUploader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the drop zone with instructions', () => {
    render(<FileUploader />);

    expect(screen.getByText(/drag & drop your python file/i)).toBeInTheDocument();
    expect(screen.getByText(/\.py files only, up to 5 MB/i)).toBeInTheDocument();
    expect(screen.getByText(/browse/i)).toBeInTheDocument();
  });

  it('should have a hidden file input that accepts only .py files', () => {
    render(<FileUploader />);

    const input = screen.getByTestId('file-input') as HTMLInputElement;
    expect(input).toHaveAttribute('accept', '.py');
    expect(input).toHaveClass('hidden');
  });

  it('should show error for non-.py files via drop', async () => {
    render(<FileUploader />);
    const dropZone = screen.getByTestId('drop-zone');

    const txtFile = new File(['content'], 'readme.txt', { type: 'text/plain' });
    fireEvent.drop(dropZone, { dataTransfer: { files: [txtFile] } });

    await waitFor(() => {
      expect(screen.getByText(/only \.py files are allowed/i)).toBeInTheDocument();
    });
  });

  it('should show error for files exceeding 5 MB', async () => {
    render(<FileUploader />);
    const dropZone = screen.getByTestId('drop-zone');

    const bigFile = createPyFile('big.py', undefined, 6 * 1024 * 1024);
    fireEvent.drop(dropZone, { dataTransfer: { files: [bigFile] } });

    await waitFor(() => {
      expect(screen.getByText(/file size must be 5 MB or less/i)).toBeInTheDocument();
    });
  });

  it('should show uploading state for valid .py files', async () => {
    mockedUpload.mockReturnValue(new Promise(() => {})); // never resolves

    render(<FileUploader />);
    const dropZone = screen.getByTestId('drop-zone');

    const pyFile = createPyFile();
    fireEvent.drop(dropZone, { dataTransfer: { files: [pyFile] } });

    await waitFor(() => {
      expect(screen.getByTestId('upload-progress')).toBeInTheDocument();
      expect(screen.getByText(/uploading/i)).toBeInTheDocument();
    });
  });

  it('should show success state after upload completes', async () => {
    mockedUpload.mockResolvedValue({
      filename: 'script.py',
      storagePath: 'user/uuid_script.py',
      sizeBytes: 1024,
    });

    const onComplete = vi.fn();
    render(<FileUploader onUploadComplete={onComplete} />);
    const dropZone = screen.getByTestId('drop-zone');

    const pyFile = createPyFile();
    fireEvent.drop(dropZone, { dataTransfer: { files: [pyFile] } });

    await waitFor(() => {
      expect(screen.getByTestId('upload-success')).toBeInTheDocument();
      expect(screen.getByText(/upload complete/i)).toBeInTheDocument();
      expect(screen.getByText('script.py')).toBeInTheDocument();
    });

    expect(onComplete).toHaveBeenCalledWith({
      filename: 'script.py',
      storagePath: 'user/uuid_script.py',
      sizeBytes: 1024,
    });
  });

  it('should show error state when upload fails', async () => {
    mockedUpload.mockRejectedValue(new Error('Network error'));

    render(<FileUploader />);
    const dropZone = screen.getByTestId('drop-zone');

    const pyFile = createPyFile();
    fireEvent.drop(dropZone, { dataTransfer: { files: [pyFile] } });

    await waitFor(() => {
      expect(screen.getByTestId('upload-error')).toBeInTheDocument();
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  it('should accept files via the file input', async () => {
    mockedUpload.mockResolvedValue({
      filename: 'main.py',
      storagePath: 'user/uuid_main.py',
      sizeBytes: 256,
    });

    render(<FileUploader />);
    const input = screen.getByTestId('file-input');

    const pyFile = createPyFile('main.py');
    fireEvent.change(input, { target: { files: [pyFile] } });

    await waitFor(() => {
      expect(screen.getByTestId('upload-success')).toBeInTheDocument();
      expect(screen.getByText('main.py')).toBeInTheDocument();
    });
  });

  it('should reset to idle state when "Try again" is clicked', async () => {
    mockedUpload.mockRejectedValue(new Error('Server error'));

    render(<FileUploader />);
    const dropZone = screen.getByTestId('drop-zone');

    fireEvent.drop(dropZone, { dataTransfer: { files: [createPyFile()] } });

    await waitFor(() => {
      expect(screen.getByTestId('upload-error')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/try again/i));

    expect(screen.getByText(/drag & drop your python file/i)).toBeInTheDocument();
  });

  it('should reset to idle state when "Upload another file" is clicked', async () => {
    mockedUpload.mockResolvedValue({
      filename: 'done.py',
      storagePath: 'user/uuid_done.py',
      sizeBytes: 100,
    });

    render(<FileUploader />);
    const dropZone = screen.getByTestId('drop-zone');

    fireEvent.drop(dropZone, { dataTransfer: { files: [createPyFile('done.py')] } });

    await waitFor(() => {
      expect(screen.getByTestId('upload-success')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/upload another file/i));

    expect(screen.getByText(/drag & drop your python file/i)).toBeInTheDocument();
  });

  it('should visually indicate drag-over state', () => {
    render(<FileUploader />);
    const dropZone = screen.getByTestId('drop-zone');

    fireEvent.dragEnter(dropZone, { dataTransfer: { files: [] } });

    expect(screen.getByText(/drop your file here/i)).toBeInTheDocument();
  });
});

describe('validatePythonFile', () => {
  let validatePythonFile: typeof import('../utils/uploadFile').validatePythonFile;

  beforeEach(async () => {
    const mod = await vi.importActual<typeof import('../utils/uploadFile')>('../utils/uploadFile');
    validatePythonFile = mod.validatePythonFile;
  });

  it('should return null for valid .py files', () => {
    const file = createPyFile('valid.py');
    expect(validatePythonFile(file)).toBeNull();
  });

  it('should return error for non-.py files', () => {
    const file = new File(['data'], 'data.csv', { type: 'text/csv' });
    expect(validatePythonFile(file)).toBe('Only .py files are allowed');
  });

  it('should return error for oversized files', () => {
    const file = createPyFile('huge.py', undefined, 6 * 1024 * 1024);
    expect(validatePythonFile(file)).toBe('File size must be 5 MB or less');
  });
});
