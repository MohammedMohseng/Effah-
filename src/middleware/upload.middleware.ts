// src/middleware/upload.middleware.ts
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { Request } from 'express';
import { AppError } from './error.middleware';

const ALLOWED_ID_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, process.env.UPLOAD_DIR || 'uploads');
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuid()}${ext}`);
  },
});

// للوثائق الرسمية (هوية، إيصال دفع)
export const uploadDocument = multer({
  storage,
  limits: { fileSize: Number(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 },
  fileFilter: (_req: Request, file, cb: FileFilterCallback) => {
    if (ALLOWED_ID_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(400, 'نوع الملف غير مسموح به. يُقبل: JPG، PNG، PDF فقط'));
    }
  },
});

// للصور الشخصية
export const uploadPhoto = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req: Request, file, cb: FileFilterCallback) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(400, 'نوع الملف غير مسموح به. يُقبل: JPG، PNG، WEBP فقط'));
    }
  },
});
