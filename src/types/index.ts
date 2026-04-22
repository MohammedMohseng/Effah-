// src/types/index.ts
import { Role } from '@prisma/client';
import { Request } from 'express';

// ── JWT Payload ───────────────────────────────
export interface JwtPayload {
  userId: string;
  role:   Role;
  email:  string;
  iat?:   number;
  exp?:   number;
}

// ── Authenticated Request — يرث كل خصائص Request ──
export interface AuthRequest extends Request {
  user?: JwtPayload;
}

// ── API Response ──────────────────────────────
export interface ApiResponse<T = unknown> {
  success:  boolean;
  message:  string;
  data?:    T;
  errors?:  string[];
  meta?: {
    page?:       number;
    limit?:      number;
    total?:      number;
    totalPages?: number;
  };
}

// ── Compatibility ─────────────────────────────
export type CompatibilityLevel = 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';

export interface CompatibilityResult {
  score:   number;
  level:   CompatibilityLevel;
  breakdown: {
    location:    number;
    education:   number;
    financial:   number;
    age:         number;
    preferences: number;
  };
}

// ── Pagination ────────────────────────────────
export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page:       number;
    limit:      number;
    total:      number;
    totalPages: number;
  };
}

// ── Socket Events ─────────────────────────────
export interface ChatMessage {
  id:         string;
  groupId:    string;
  senderId:   string;
  senderName: string;
  senderRole: string;
  content:    string;
  type:       'TEXT' | 'IMAGE' | 'SYSTEM';
  createdAt:  Date;
}

export interface PushNotification {
  id:        string;
  type:      string;
  title:     string;
  body:      string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface ServerToClientEvents {
  'message:new':        (message: ChatMessage) => void;
  'message:deleted':    (messageId: string) => void;
  'notification:new':   (notification: PushNotification) => void;
  'user:online':        (userId: string) => void;
  'user:offline':       (userId: string) => void;
}

export interface ClientToServerEvents {
  'message:send':  (data: { groupId: string; content: string; type?: 'TEXT' | 'IMAGE' }) => void;
  'group:join':    (groupId: string) => void;
  'group:leave':   (groupId: string) => void;
  'typing:start':  (groupId: string) => void;
  'typing:stop':   (groupId: string) => void;
}
