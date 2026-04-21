// src/modules/chat/chat.routes.ts
import { Router, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { AuthRequest } from '../../types';
import { Message } from '../../config/mongo.schemas';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/error.middleware';

const router = Router();

// GET /api/chat/:groupId/messages - سجل الرسائل
router.get('/:groupId/messages', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { groupId } = req.params;
    const page  = parseInt(req.query.page  as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    // التحقق من الصلاحية
    const isMember = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: req.user!.userId } },
    });
    const isAdmin = ['SUPERVISOR', 'PRESIDENT'].includes(req.user!.role);

    if (!isMember && !isAdmin) throw new AppError(403, 'ليس لديك صلاحية لعرض هذه المحادثة');

    const total = await Message.countDocuments({ groupId, isDeleted: false });
    const messages = await Message.find({ groupId, isDeleted: false })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({
      success: true,
      data: messages.reverse(),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) { next(err); }
});

// DELETE /api/chat/message/:messageId - المشرف يحذف رسالة
router.delete('/message/:messageId', authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!['SUPERVISOR', 'PRESIDENT'].includes(req.user!.role)) {
        throw new AppError(403, 'المشرفون فقط يمكنهم حذف الرسائل');
      }

      await Message.findByIdAndUpdate(req.params.messageId, {
        isDeleted: true,
        deletedAt: new Date(),
        content: '[تم حذف هذه الرسالة من قِبل المشرف]',
      });

      res.json({ success: true, message: 'تم حذف الرسالة' });
    } catch (err) { next(err); }
  }
);

export default router;
