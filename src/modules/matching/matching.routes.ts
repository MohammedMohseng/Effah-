// src/modules/matching/matching.routes.ts
import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { getPotentialMatches } from './matching.service';
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';

const router = Router();

// GET /api/matching/candidates
router.get('/candidates', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page  = parseInt(req.query.page  as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const result = await getPotentialMatches(req.user!.userId, page, limit);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
});

export default router;
