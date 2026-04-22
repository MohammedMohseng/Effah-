// src/modules/auth/auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as AuthService from './auth.service';
import { AuthRequest } from '../../types';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await AuthService.register(req.body);
    res.status(201).json({ success: true, message: 'تم التسجيل بنجاح', data: result });
  } catch (err) { next(err); }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await AuthService.login(req.body);
    res.json({ success: true, message: 'تم تسجيل الدخول بنجاح', data: result });
  } catch (err) { next(err); }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ success: false, message: 'رمز التحديث مطلوب' });
      return;
    }
    const tokens = await AuthService.refreshToken(refreshToken);
    res.json({ success: true, message: 'تم تحديث الجلسة', data: tokens });
  } catch (err) { next(err); }
}

export async function changePassword(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { oldPassword, newPassword } = req.body;
    await AuthService.changePassword(req.user!.userId, oldPassword, newPassword);
    res.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح' });
  } catch (err) { next(err); }
}

export async function me(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { prisma } = await import('../../config/database');
    const userRaw = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { profile: true },
    });
    const user = userRaw ? (({ passwordHash, ...rest }) => rest)(userRaw) : null;
    if (!user) { res.status(404).json({ success: false, message: 'المستخدم غير موجود' }); return; }
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
}
