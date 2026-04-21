// src/modules/groups/groups.routes.ts
import { Router, Response, NextFunction } from 'express';
import { authenticate, requireSupervisor } from '../../middleware/auth.middleware';
import { AuthRequest } from '../../types';
import * as GroupsService from './groups.service';

const router = Router();

// POST /api/groups/request - إرسال طلب مطابقة
router.post('/request', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { receiverId, message } = req.body;
    const result = await GroupsService.sendMatchRequest(req.user!.userId, receiverId, message);
    res.status(201).json({ success: true, message: 'تم إرسال الطلب بنجاح', data: result });
  } catch (err) { next(err); }
});

// GET /api/groups/my - مجموعاتي
router.get('/my', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const groups = await GroupsService.getUserGroups(req.user!.userId);
    res.json({ success: true, data: groups });
  } catch (err) { next(err); }
});

// PATCH /api/groups/request/:requestId/guardian-review - موافقة الولي
router.patch('/request/:requestId/guardian-review', authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { approved, supervisorId } = req.body;
      const result = await GroupsService.guardianReview(
        req.user!.userId, req.params.requestId, approved, supervisorId
      );
      res.json({ success: true, message: approved ? 'تمت الموافقة وإنشاء المجموعة' : 'تم الرفض', data: result });
    } catch (err) { next(err); }
  }
);

// PATCH /api/groups/:groupId/activate - المشرف يفعّل المجموعة
router.patch('/:groupId/activate', authenticate, requireSupervisor,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await GroupsService.activateGroup(req.user!.userId, req.params.groupId);
      res.json({ success: true, message: 'تم تفعيل المجموعة', data: result });
    } catch (err) { next(err); }
  }
);

// PATCH /api/groups/:groupId/close - المشرف يغلق المجموعة
router.patch('/:groupId/close', authenticate, requireSupervisor,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await GroupsService.closeGroup(req.user!.userId, req.params.groupId);
      res.json({ success: true, message: 'تم إغلاق المجموعة', data: result });
    } catch (err) { next(err); }
  }
);

export default router;
