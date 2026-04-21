// src/utils/logger.ts
import winston from 'winston';

const { combine, timestamp, colorize, printf, json } = winston.format;

const devFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
  return `${timestamp} [${level}]: ${message} ${metaStr}`;
});

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })),
  transports: [
    // Console - ملوّن في dev، JSON في prod
    new winston.transports.Console({
      format:
        process.env.NODE_ENV === 'production'
          ? combine(json())
          : combine(colorize(), devFormat),
    }),
    // ملف للأخطاء فقط
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    // ملف لكل شيء
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});
