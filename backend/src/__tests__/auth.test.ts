import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authenticate } from '../middleware/auth';
import type { AuthenticatedRequest } from '../types';
import type { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const TEST_SECRET = 'test-jwt-secret';

function createMockReqRes(authHeader?: string) {
  const req = {
    headers: {
      authorization: authHeader,
    },
  } as AuthenticatedRequest;

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;

  const next: NextFunction = vi.fn();

  return { req, res, next };
}

describe('authenticate middleware', () => {
  beforeEach(() => {
    vi.stubEnv('JWT_SECRET', TEST_SECRET);
  });

  it('returns 401 when no authorization header is present', () => {
    const { req, res, next } = createMockReqRes(undefined);

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Missing or invalid authorization header',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when authorization header does not start with Bearer', () => {
    const { req, res, next } = createMockReqRes('Basic abc123');

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token is invalid', () => {
    const { req, res, next } = createMockReqRes('Bearer invalid-token');

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Invalid or expired token',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token is expired', () => {
    const expired = jwt.sign(
      { userId: 'u1', email: 'a@b.com' },
      TEST_SECRET,
      { expiresIn: '-1s' }
    );
    const { req, res, next } = createMockReqRes(`Bearer ${expired}`);

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('sets req.user and calls next() with a valid token', () => {
    const payload = { userId: 'user-123', email: 'test@example.com' };
    const token = jwt.sign(payload, TEST_SECRET);
    const { req, res, next } = createMockReqRes(`Bearer ${token}`);

    authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toMatchObject(payload);
    expect(res.status).not.toHaveBeenCalled();
  });
});
