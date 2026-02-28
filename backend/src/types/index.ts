import { Request } from 'express';

export interface JwtPayload {
  userId: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export interface FileRecord {
  id: string;
  userId: string;
  fileName: string;
  storagePath: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface FileUploadResponse {
  id: string;
  fileName: string;
  sizeBytes: number;
  uploadedAt: string;
}
