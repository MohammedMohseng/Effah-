// src/modules/admin/admin.routes.ts
import { Router, Response, NextFunction } from 'express';
import { authenticate, requireSupervisor, requirePresident } from '../../middleware/auth.middleware';
import { AuthRequest } from '../../types';
import { prisma } from '../../config/database';
import bcrypt from 'bcryptjs';

const router = Router();

// ── إحصائيات النظام (للرئيس) ──────────────────
router.get('/stats', authenticate, requirePresident,
  async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const [
        totalUsers, activeUsers, pendingVerification,
        totalGroups, activeGroups, totalSupervisors,
      ] = await Promise.all([
        prisma.user.count({ where: { role: 'USER' } }),
        prisma.user.count({ where: { role: 'USER', accountStatus: 'ACTIVE' } }),
        prisma.user.count({ where: { role: 'USER', accountStatus: 'PENDING_REVIEW' } }),
        prisma.group.count(),
        prisma.group.count({ where: { status: 'ACTIVE' } }),
        prisma.user.count({ where: { role: 'SUPERVISOR' } }),
      ]);

      res.json({
        success: true,
        data: { totalUsers, activeUsers, pendingVerification, totalGroups, activeGroups, totalSupervisors },
      });
    } catch (err) { next(err); }
  }
);

// ── إدارة المستخدمين (للمشرفين) ───────────────
router.get('/users', authenticate, requireSupervisor,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const page   = parseInt(req.query.page   as string) || 1;
      const limit  = parseInt(req.query.limit  as string) || 20;
      const status = req.query.status as string;
      const search = req.query.search as string;

      const where: any = { role: 'USER' };
      if (status) where.accountStatus = status;
      if (search) {
        where.OR = [
          { email: { contains: search, mode: 'insensitive' } },
          { profile: { fullName: { contains: search, mode: 'insensitive' } } },
        ];
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          include: { profile: true, idDocument: true },
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }).then(users => users.map(({ passwordHash, ...u }) => u)),
        prisma.user.count({ where }),
      ]);

      res.json({
        success: true,
        data: users,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (err) { next(err); }
  }
);

// ── تعليق / رفع تعليق مستخدم ─────────────────
router.patch('/users/:userId/status', authenticate, requireSupervisor,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { status } = req.body;
      const allowed = ['ACTIVE', 'SUSPENDED', 'BANNED', 'INACTIVE'];
      if (!allowed.includes(status)) {
        res.status(400).json({ success: false, message: 'حالة غير صالحة' });
        return;
      }
      const user = await prisma.user.update({
        where: { id: req.params.userId },
        data: { accountStatus: status },
      });
      res.json({ success: true, message: 'تم تحديث حالة الحساب', data: { id: user.id, accountStatus: user.accountStatus } });
    } catch (err) { next(err); }
  }
);

// ── إنشاء مشرف جديد (للرئيس فقط) ────────────
router.post('/supervisors', authenticate, requirePresident,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { email, phone, password, fullName, state, city } = req.body;
      const passwordHash = await bcrypt.hash(password, 12);

      const supervisor = await prisma.user.create({
        data: {
          email, phone, passwordHash,
          gender: 'MALE',
          role: 'SUPERVISOR',
          accountStatus: 'ACTIVE',
          profile: { create: {
            fullName, state, city,
            dateOfBirth: new Date('1990-01-01'),
            educationLevel: 'BACHELOR',
            financialLevel: 'MEDIUM',
            maritalStatus: 'married' as any,
          }},
        },
        include: { profile: true },

      });

      res.status(201).json({ success: true, message: 'تم إنشاء حساب المشرف', data: supervisor });
    } catch (err) { next(err); }
  }
);

export default router;
