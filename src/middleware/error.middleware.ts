// src/middleware/error.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public errors?: string[]
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
    return;
  }

  // Prisma errors
  if (err.message.includes('Unique constraint')) {
    res.status(409).json({ success: false, message: 'البيانات موجودة مسبقاً' });
    return;
  }

  logger.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'حدث خطأ داخلي في الخادم' });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ success: false, message: `المسار ${req.originalUrl} غير موجود` });
}
