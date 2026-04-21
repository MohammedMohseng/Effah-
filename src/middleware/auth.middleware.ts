// src/middleware/auth.middleware.ts
import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { AuthRequest, JwtPayload } from '../types';

// ── Verify JWT ────────────────────────────────
export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'غير مصرح - يرجى تسجيل الدخول' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'الجلسة منتهية - يرجى تسجيل الدخول مجدداً' });
  }
}

// ── Role-Based Access Control ─────────────────
export function authorize(...roles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'غير مصرح' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'ليس لديك صلاحية للقيام بهذا الإجراء' });
      return;
    }

    next();
  };
}

// ── Shortcuts ─────────────────────────────────
export const requireSupervisor = authorize('SUPERVISOR', 'PRESIDENT');
export const requirePresident  = authorize('PRESIDENT');
export const requireUser       = authorize('USER', 'GUARDIAN', 'SUPERVISOR', 'PRESIDENT');
