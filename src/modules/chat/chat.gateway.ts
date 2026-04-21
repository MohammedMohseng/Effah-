// src/modules/chat/chat.gateway.ts
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { Message } from '../../config/mongo.schemas';
import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import { JwtPayload, ServerToClientEvents, ClientToServerEvents } from '../../types';

// ── التحقق من التوكن عند الاتصال ─────────────
async function authenticate(socket: Socket): Promise<JwtPayload | null> {
  try {
    const token = socket.handshake.auth.token as string;
    if (!token) return null;
    return jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
  } catch {
    return null;
  }
}

// ── التحقق أن المستخدم عضو في المجموعة ───────
async function isMember(userId: string, groupId: string): Promise<boolean> {
  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  return !!member;
}

// ── تهيئة Chat Gateway ────────────────────────
export function initChatGateway(io: Server<ClientToServerEvents, ServerToClientEvents>) {
  // Middleware: التحقق من التوكن قبل الاتصال
  io.use(async (socket, next) => {
    const user = await authenticate(socket);
    if (!user) {
      next(new Error('غير مصرح - يرجى تسجيل الدخول'));
      return;
    }
    (socket as any).user = user;
    next();
  });

  io.on('connection', (socket) => {
    const user: JwtPayload = (socket as any).user;
    logger.info(`🔌 User connected: ${user.userId} (${user.role})`);

    // ── الانضمام لمجموعة ──────────────────────
    socket.on('group:join', async (groupId) => {
      try {
        // التحقق من العضوية أو كونه مشرفاً
        const canJoin =
          user.role === 'SUPERVISOR' || user.role === 'PRESIDENT' ||
          (await isMember(user.userId, groupId));

        if (!canJoin) {
          socket.emit('notification:new', {
            id: 'error',
            type: 'SYSTEM',
            title: 'خطأ',
            body: 'ليس لديك صلاحية للانضمام لهذه المجموعة',
            createdAt: new Date(),
          });
          return;
        }

        socket.join(groupId);
        logger.debug(`User ${user.userId} joined group ${groupId}`);

        // إرسال آخر 50 رسالة
        const messages = await Message.find({ groupId })
          .sort({ createdAt: -1 })
          .limit(50)
          .lean();

        messages.reverse().forEach((msg) => {
          socket.emit('message:new', {
            id: msg._id!.toString(),
            groupId: msg.groupId,
            senderId: msg.senderId,
            senderName: msg.senderName,
            senderRole: msg.senderRole,
            content: msg.content,
            type: msg.type,
            createdAt: msg.createdAt,
          });
        });
      } catch (err) {
        logger.error('group:join error', err);
      }
    });

    // ── إرسال رسالة ───────────────────────────
    socket.on('message:send', async ({ groupId, content, type = 'TEXT' }) => {
      try {
        if (!content?.trim()) return;

        // التحقق من العضوية
        const canSend =
          user.role === 'SUPERVISOR' || user.role === 'PRESIDENT' ||
          (await isMember(user.userId, groupId));

        if (!canSend) return;

        // التحقق من حالة المجموعة (يجب أن تكون ACTIVE)
        const group = await prisma.group.findUnique({ where: { id: groupId } });
        if (!group || group.status !== 'ACTIVE') return;

        // جلب اسم المستخدم
        const userProfile = await prisma.profile.findUnique({
          where: { userId: user.userId },
        });

        const message = await Message.create({
          groupId,
          senderId: user.userId,
          senderName: userProfile?.fullName || 'مستخدم',
          senderRole: user.role,
          content: content.trim(),
          type,
        });

        // بث الرسالة لكل أعضاء المجموعة
        io.to(groupId).emit('message:new', {
          id: message._id!.toString(),
          groupId: message.groupId,
          senderId: message.senderId,
          senderName: message.senderName,
          senderRole: message.senderRole,
          content: message.content,
          type: message.type as 'TEXT' | 'IMAGE' | 'SYSTEM',
          createdAt: message.createdAt,
        });
      } catch (err) {
        logger.error('message:send error', err);
      }
    });

    // ── مؤشر الكتابة ──────────────────────────
    socket.on('typing:start', (groupId) => {
      socket.to(groupId).emit('user:online', user.userId);
    });

    socket.on('typing:stop', (groupId) => {
      socket.to(groupId).emit('user:offline', user.userId);
    });

    socket.on('disconnect', () => {
      logger.info(`🔌 User disconnected: ${user.userId}`);
    });
  });
}
