// src/modules/notifications/notifications.routes.ts
import { Router, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { AuthRequest } from '../../types';
import { prisma } from '../../config/database';

const router = Router();

// GET /api/notifications - جلب إشعاراتي
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const unreadCount = notifications.filter(n => !n.isRead).length;
    res.json({ success: true, data: { notifications, unreadCount } });
  } catch (err) { next(err); }
});

// PATCH /api/notifications/:id/read - وضع علامة مقروء
router.patch('/:id/read', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user!.userId },
      data: { isRead: true },
    });
    res.json({ success: true, message: 'تم التحديث' });
  } catch (err) { next(err); }
});

// PATCH /api/notifications/read-all - قراءة كل الإشعارات
router.patch('/read-all', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.userId, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true, message: 'تم تحديث جميع الإشعارات' });
  } catch (err) { next(err); }
});

export default router;
