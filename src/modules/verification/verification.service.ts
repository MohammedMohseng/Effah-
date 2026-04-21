// src/modules/verification/verification.service.ts
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/error.middleware';

// ── رفع وثيقة الهوية ─────────────────────────
export async function submitIdDocument(userId: string, fileUrl: string) {
  // إذا كان هناك وثيقة سابقة مرفوضة، نُحدّثها
  const existing = await prisma.idDocument.findUnique({ where: { userId } });

  if (existing) {
    if (existing.status === 'APPROVED') {
      throw new AppError(400, 'تم التحقق من هويتك مسبقاً');
    }
    return prisma.idDocument.update({
      where: { userId },
      data: { fileUrl, status: 'PENDING', reviewedBy: null, reviewNote: null, reviewedAt: null },
    });
  }

  return prisma.idDocument.create({ data: { userId, fileUrl } });
}

// ── رفع إيصال الدفع ──────────────────────────
export async function submitPaymentProof(userId: string, fileUrl: string, amount: number) {
  return prisma.paymentProof.create({
    data: { userId, fileUrl, amount },
  });
}

// ── مراجعة المشرف: الهوية ─────────────────────
export async function reviewIdDocument(
  supervisorId: string,
  userId: string,
  approved: boolean,
  note?: string
) {
  const doc = await prisma.idDocument.findUnique({ where: { userId } });
  if (!doc) throw new AppError(404, 'وثيقة الهوية غير موجودة');
  if (doc.status === 'APPROVED') throw new AppError(400, 'تمت مراجعة هذه الوثيقة مسبقاً');

  return prisma.idDocument.update({
    where: { userId },
    data: {
      status: approved ? 'APPROVED' : 'REJECTED',
      reviewedBy: supervisorId,
      reviewNote: note,
      reviewedAt: new Date(),
    },
  });
}

// ── مراجعة المشرف: الدفع ─────────────────────
export async function reviewPaymentProof(
  supervisorId: string,
  proofId: string,
  approved: boolean,
  note?: string
) {
  const proof = await prisma.paymentProof.findUnique({ where: { id: proofId } });
  if (!proof) throw new AppError(404, 'إيصال الدفع غير موجود');

  const updated = await prisma.paymentProof.update({
    where: { id: proofId },
    data: {
      status: approved ? 'APPROVED' : 'REJECTED',
      reviewedBy: supervisorId,
      reviewNote: note,
      reviewedAt: new Date(),
    },
  });

  // إذا تمت الموافقة → فعّل الحساب
  if (approved) {
    await prisma.user.update({
      where: { id: proof.userId },
      data: { accountStatus: 'ACTIVE' },
    });
  }

  return updated;
}

// ── جلب الوثائق المعلّقة (للمشرف) ────────────
export async function getPendingDocuments() {
  const [idDocs, payments] = await Promise.all([
    prisma.idDocument.findMany({
      where: { status: 'PENDING' },
      include: { user: { include: { profile: true } } },
      orderBy: { submittedAt: 'asc' },
    }),
    prisma.paymentProof.findMany({
      where: { status: 'PENDING' },
      include: { user: { include: { profile: true } } },
      orderBy: { submittedAt: 'asc' },
    }),
  ]);
  return { idDocs, payments };
}
