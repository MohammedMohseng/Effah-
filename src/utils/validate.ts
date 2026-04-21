// src/utils/validate.ts
import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

export function validateRequest(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: 'بيانات غير صالحة',
      errors: errors.array().map(e => e.msg),
    });
    return;
  }
  next();
}
