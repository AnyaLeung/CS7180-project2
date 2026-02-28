import { describe, it, expect, vi } from 'vitest';

vi.mock('../lib/supabase', () => ({
  supabase: {},
}));

import { validateFile, FileValidationError } from '../services/fileService';

describe('validateFile', () => {
  it('accepts a valid .py file within size limit', () => {
    expect(() => validateFile('main.py', 1024)).not.toThrow();
  });

  it('accepts a .py file at exactly 5 MB', () => {
    const fiveMB = 5 * 1024 * 1024;
    expect(() => validateFile('script.py', fiveMB)).not.toThrow();
  });

  it('rejects a non-.py file extension', () => {
    expect(() => validateFile('data.txt', 100)).toThrow(FileValidationError);
    expect(() => validateFile('data.txt', 100)).toThrow('Only .py files are allowed');
  });

  it('rejects a .js file', () => {
    expect(() => validateFile('index.js', 500)).toThrow(FileValidationError);
  });

  it('rejects a file with no extension', () => {
    expect(() => validateFile('README', 100)).toThrow('no extension');
  });

  it('rejects a file exceeding 5 MB', () => {
    const overLimit = 5 * 1024 * 1024 + 1;
    expect(() => validateFile('big.py', overLimit)).toThrow(FileValidationError);
    expect(() => validateFile('big.py', overLimit)).toThrow('exceeds 5 MB limit');
  });

  it('rejects an empty file (0 bytes)', () => {
    expect(() => validateFile('empty.py', 0)).toThrow(FileValidationError);
    expect(() => validateFile('empty.py', 0)).toThrow('File is empty');
  });

  it('is case-insensitive for .PY extension', () => {
    expect(() => validateFile('Script.PY', 200)).not.toThrow();
  });
});
