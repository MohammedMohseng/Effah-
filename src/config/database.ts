// src/config/database.ts
import { PrismaClient } from '@prisma/client';
import mongoose from 'mongoose';
import { logger } from '../utils/logger';

// ── PostgreSQL via Prisma ─────────────────────
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
});

export async function connectPostgres(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('✅ PostgreSQL connected');
  } catch (error) {
    logger.error('❌ PostgreSQL connection failed:', error);
    process.exit(1);
  }
}

// ── MongoDB via Mongoose (اختياري) ───────────
export async function connectMongo(): Promise<void> {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    logger.warn('⚠️  MONGO_URI not set — chat features disabled');
    return;
  }
  try {
    await mongoose.connect(uri, { dbName: 'nikah_chat' });
    logger.info('✅ MongoDB connected');
  } catch (error) {
    logger.warn('⚠️  MongoDB connection failed — chat features disabled:', error);
  }
}

export async function connectDatabases(): Promise<void> {
  await connectPostgres();
  await connectMongo();
}

export async function disconnectDatabases(): Promise<void> {
  await prisma.$disconnect();
  await mongoose.disconnect();
}
