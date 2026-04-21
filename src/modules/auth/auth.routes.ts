// src/modules/auth/auth.routes.ts
import { Router } from 'express';
import { body } from 'express-validator';
import * as AuthController from './auth.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validateRequest } from '../../utils/validate';

const router = Router();

router.post('/register',
  [
    body('email').isEmail().withMessage('بريد إلكتروني غير صالح'),
    body('phone').isMobilePhone('any').withMessage('رقم هاتف غير صالح'),
    body('password').isLength({ min: 8 }).withMessage('كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
    body('gender').isIn(['MALE', 'FEMALE']).withMessage('الجنس مطلوب'),
    body('fullName').notEmpty().withMessage('الاسم الكامل مطلوب'),
    body('dateOfBirth').isISO8601().withMessage('تاريخ الميلاد غير صالح'),
    body('state').notEmpty().withMessage('الولاية مطلوبة'),
    body('city').notEmpty().withMessage('المدينة مطلوبة'),
    body('educationLevel').notEmpty().withMessage('المستوى التعليمي مطلوب'),
    body('financialLevel').notEmpty().withMessage('المستوى المادي مطلوب'),
    body('maritalStatus').notEmpty().withMessage('الحالة الاجتماعية مطلوبة'),
  ],
  validateRequest,
  AuthController.register
);

router.post('/login',
  [
    body('email').isEmail().withMessage('بريد إلكتروني غير صالح'),
    body('password').notEmpty().withMessage('كلمة المرور مطلوبة'),
  ],
  validateRequest,
  AuthController.login
);

router.post('/refresh', AuthController.refresh);

router.post('/change-password',
  authenticate,
  [
    body('oldPassword').notEmpty().withMessage('كلمة المرور الحالية مطلوبة'),
    body('newPassword').isLength({ min: 8 }).withMessage('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل'),
  ],
  validateRequest,
  AuthController.changePassword
);

router.get('/me', authenticate, AuthController.me);

export default router;
