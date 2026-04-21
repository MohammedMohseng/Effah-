// src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';

import authRoutes         from './modules/auth/auth.routes';
import matchingRoutes     from './modules/matching/matching.routes';
import verificationRoutes from './modules/verification/verification.routes';
import groupsRoutes       from './modules/groups/groups.routes';
import chatRoutes         from './modules/chat/chat.routes';
import notificationRoutes from './modules/notifications/notifications.routes';
import adminRoutes        from './modules/admin/admin.routes';

import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { logger } from './utils/logger';

const app = express();

// ── Security & Middleware ─────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev', { stream: { write: (msg) => logger.http(msg.trim()) } }));

// ── Rate Limiting ─────────────────────────────
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  message: { success: false, message: 'طلبات كثيرة جداً، يرجى المحاولة لاحقاً' },
});
app.use('/api', limiter);

// ── Static Files (Uploads) ────────────────────
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ── Routes ────────────────────────────────────
app.use('/api/auth',         authRoutes);
app.use('/api/matching',     matchingRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/groups',       groupsRoutes);
app.use('/api/chat',         chatRoutes);
app.use('/api/notifications',notificationRoutes);
app.use('/api/admin',        adminRoutes);

// ── Health Check ──────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// ── Error Handlers ────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
