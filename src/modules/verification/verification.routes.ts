// src/modules/verification/verification.routes.ts
import { Router, Response, NextFunction } from 'express';
import { authenticate, requireSupervisor } from '../../middleware/auth.middleware';
import { uploadDocument } from '../../middleware/upload.middleware';
import { AuthRequest } from '../../types';
import * as VerificationService from './verification.service';

const router = Router();

// ── المستخدم: رفع وثائق ──────────────────────

// POST /api/verification/id
router.post('/id', authenticate, uploadDocument.single('file'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) { res.status(400).json({ success: false, message: 'الملف مطلوب' }); return; }
      const result = await VerificationService.submitIdDocument(
        req.user!.userId, `/uploads/${req.file.filename}`
      );
      res.status(201).json({ success: true, message: 'تم رفع وثيقة الهوية بنجاح', data: result });
    } catch (err) { next(err); }
  }
);

// POST /api/verification/payment
router.post('/payment', authenticate, uploadDocument.single('file'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) { res.status(400).json({ success: false, message: 'الملف مطلوب' }); return; }
      const { amount } = req.body;
      const result = await VerificationService.submitPaymentProof(
        req.user!.userId, `/uploads/${req.file.filename}`, parseFloat(amount)
      );
      res.status(201).json({ success: true, message: 'تم رفع إيصال الدفع بنجاح', data: result });
    } catch (err) { next(err); }
  }
);

// ── المشرف: مراجعة الوثائق ───────────────────

// GET /api/verification/pending
router.get('/pending', authenticate, requireSupervisor,
  async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await VerificationService.getPendingDocuments();
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

// PATCH /api/verification/id/:userId/review
router.patch('/id/:userId/review', authenticate, requireSupervisor,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { approved, note } = req.body;
      const result = await VerificationService.reviewIdDocument(
        req.user!.userId, req.params.userId, approved === true || approved === 'true', note
      );
      res.json({ success: true, message: approved ? 'تمت الموافقة على الهوية' : 'تم رفض الهوية', data: result });
    } catch (err) { next(err); }
  }
);

// PATCH /api/verification/payment/:proofId/review
router.patch('/payment/:proofId/review', authenticate, requireSupervisor,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { approved, note } = req.body;
      const result = await VerificationService.reviewPaymentProof(
        req.user!.userId, req.params.proofId, approved === true || approved === 'true', note
      );
      res.json({ success: true, message: approved ? 'تمت الموافقة على الدفع وتفعيل الحساب' : 'تم رفض إيصال الدفع', data: result });
    } catch (err) { next(err); }
  }
);

export default router;
