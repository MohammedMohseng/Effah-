// src/modules/groups/groups.service.ts
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/error.middleware';
import { calculateCompatibility } from '../matching/matching.service';

// ── إرسال طلب مطابقة ─────────────────────────
export async function sendMatchRequest(senderId: string, receiverId: string, message?: string) {
  const [sender, receiver] = await Promise.all([
    prisma.user.findUnique({ where: { id: senderId }, include: { profile: true } }),
    prisma.user.findUnique({ where: { id: receiverId }, include: { profile: true } }),
  ]);

  if (!sender || !receiver) throw new AppError(404, 'المستخدم غير موجود');
  if (sender.accountStatus !== 'ACTIVE') throw new AppError(403, 'حسابك غير مفعّل');
  if (sender.gender === receiver.gender) throw new AppError(400, 'لا يمكن إرسال طلب لنفس الجنس');

  const existing = await prisma.matchRequest.findUnique({
    where: { senderId_receiverId: { senderId, receiverId } },
  });
  if (existing) throw new AppError(409, 'طلب موجود مسبقاً');

  const compat = calculateCompatibility(sender.profile, receiver.profile);

  // الطلب يذهب أولاً للولي (إذا كانت الأنثى لديها ولي)
  const female = sender.gender === 'FEMALE' ? sender : receiver;

  return prisma.matchRequest.create({
    data: {
      senderId,
      receiverId,
      message,
      compatibilityScore: compat.score,
      guardianId: female.guardianId || null,
      status: 'PENDING',
    },
  });
}

// ── الولي: الموافقة أو الرفض ──────────────────
export async function guardianReview(
  guardianId: string,
  requestId: string,
  approved: boolean,
  supervisorId?: string
) {
  const request = await prisma.matchRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new AppError(404, 'الطلب غير موجود');
  if (request.guardianId !== guardianId) throw new AppError(403, 'ليس لديك صلاحية');
  if (request.status !== 'PENDING') throw new AppError(400, 'تمت معالجة هذا الطلب مسبقاً');

  if (!approved) {
    return prisma.matchRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED' },
    });
  }

  // إذا وافق الولي → أنشئ المجموعة (تنتظر المشرف)
  if (!supervisorId) throw new AppError(400, 'مطلوب تحديد المشرف عند الموافقة');

  const [updatedRequest, group] = await prisma.$transaction([
    prisma.matchRequest.update({
      where: { id: requestId },
      data: { status: 'APPROVED', assignedSupervisorId: supervisorId },
    }),
    prisma.group.create({
      data: {
        matchRequestId: requestId,
        name: `مجموعة طلب ${requestId.slice(0, 8)}`,
        supervisorId,
        status: 'PENDING',
        members: {
          create: [
            { userId: request.senderId },
            { userId: request.receiverId },
          ],
        },
      },
    }),
  ]);

  return { request: updatedRequest, group };
}

// ── المشرف: تفعيل المجموعة ───────────────────
export async function activateGroup(supervisorId: string, groupId: string) {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) throw new AppError(404, 'المجموعة غير موجودة');
  if (group.supervisorId !== supervisorId) throw new AppError(403, 'ليس لديك صلاحية');
  if (group.status !== 'PENDING') throw new AppError(400, 'المجموعة ليست في حالة انتظار');

  return prisma.group.update({
    where: { id: groupId },
    data: { status: 'ACTIVE', activatedAt: new Date() },
  });
}

// ── جلب مجموعات المستخدم ─────────────────────
export async function getUserGroups(userId: string) {
  return prisma.group.findMany({
    where: { members: { some: { userId } } },
    include: {
      members: { include: { user: { include: { profile: true } } } },
      supervisor: { include: { profile: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

// ── إغلاق المجموعة ────────────────────────────
export async function closeGroup(supervisorId: string, groupId: string) {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) throw new AppError(404, 'المجموعة غير موجودة');
  if (group.supervisorId !== supervisorId) throw new AppError(403, 'ليس لديك صلاحية');

  return prisma.group.update({
    where: { id: groupId },
    data: { status: 'CLOSED', closedAt: new Date() },
  });
}
