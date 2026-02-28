import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { validatePythonFile, MAX_FILE_SIZE } from '../middleware/upload.js';
import { multerErrorHandler } from '../middleware/errorHandler.js';
import multer from 'multer';

describe('validatePythonFile', () => {
  it('should enforce 5 MB max file size', () => {
    expect(MAX_FILE_SIZE).toBe(5 * 1024 * 1024);
  });

  it('should accept .py files', () => {
    const cb = vi.fn();
    const file = { originalname: 'script.py' } as Express.Multer.File;
    validatePythonFile({} as Request, file, cb);
    expect(cb).toHaveBeenCalledWith(null, true);
  });

  it('should accept .PY files (case insensitive)', () => {
    const cb = vi.fn();
    const file = { originalname: 'Script.PY' } as Express.Multer.File;
    validatePythonFile({} as Request, file, cb);
    expect(cb).toHaveBeenCalledWith(null, true);
  });

  it('should reject .txt files', () => {
    const cb = vi.fn();
    const file = { originalname: 'readme.txt' } as Express.Multer.File;
    validatePythonFile({} as Request, file, cb);
    expect(cb).toHaveBeenCalledWith(expect.any(Error));
  });

  it('should reject .js files', () => {
    const cb = vi.fn();
    const file = { originalname: 'index.js' } as Express.Multer.File;
    validatePythonFile({} as Request, file, cb);
    expect(cb).toHaveBeenCalledWith(expect.any(Error));
  });

  it('should reject files with no extension', () => {
    const cb = vi.fn();
    const file = { originalname: 'Makefile' } as Express.Multer.File;
    validatePythonFile({} as Request, file, cb);
    expect(cb).toHaveBeenCalledWith(expect.any(Error));
  });

  it('should reject .pyc files', () => {
    const cb = vi.fn();
    const file = { originalname: 'cache.pyc' } as Express.Multer.File;
    validatePythonFile({} as Request, file, cb);
    expect(cb).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('multerErrorHandler', () => {
  function createMockRes() {
    return {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;
  }

  it('should return 413 for LIMIT_FILE_SIZE error', () => {
    const err = new multer.MulterError('LIMIT_FILE_SIZE');
    const res = createMockRes();
    const next = vi.fn();

    multerErrorHandler(err, {} as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.json).toHaveBeenCalledWith({ error: 'File size must be 5 MB or less' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 422 for Python file validation error', () => {
    const err = new Error('Only .py files are allowed');
    const res = createMockRes();
    const next = vi.fn();

    multerErrorHandler(err, {} as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({ error: 'Only .py files are allowed' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should forward unknown errors to next()', () => {
    const err = new Error('Something unexpected');
    const res = createMockRes();
    const next: NextFunction = vi.fn();

    multerErrorHandler(err, {} as Request, res, next);

    expect(next).toHaveBeenCalledWith(err);
    expect(res.status).not.toHaveBeenCalled();
  });
});
