// src/server.ts
import 'dotenv/config';
import http from 'http';
import { Server } from 'socket.io';
import app from './app';
import { connectDatabases, disconnectDatabases } from './config/database';
import { initChatGateway } from './modules/chat/chat.gateway';
import { logger } from './utils/logger';
import { ServerToClientEvents, ClientToServerEvents } from './types';
import fs from 'fs';

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  // التأكد من وجود مجلد الرفع
  if (!fs.existsSync('uploads')) fs.mkdirSync('uploads', { recursive: true });
  if (!fs.existsSync('logs'))    fs.mkdirSync('logs',    { recursive: true });

  // الاتصال بقواعد البيانات
  await connectDatabases();

  // إنشاء HTTP Server + Socket.io
  const httpServer = http.createServer(app);
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
  });

  // تهيئة Chat Gateway
  initChatGateway(io);

  // تشغيل الخادم
  httpServer.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT}`);
    logger.info(`📡 Environment: ${process.env.NODE_ENV}`);
    logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
  });

  // إيقاف نظيف
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received - shutting down gracefully`);
    httpServer.close(async () => {
      await disconnectDatabases();
      logger.info('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});
