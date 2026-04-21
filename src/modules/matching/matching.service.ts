// src/modules/matching/matching.service.ts
import { prisma } from '../../config/database';
import { CompatibilityResult, CompatibilityLevel, PaginatedResult } from '../../types';
import { AppError } from '../../middleware/error.middleware';

// ──────────────────────────────────────────────
// محرك التوافق - يحسب النسبة بين مستخدمَين
// ──────────────────────────────────────────────

const WEIGHTS = {
  location:    30,  // الموقع (الولاية/المدينة)
  education:   20,  // المستوى التعليمي
  financial:   20,  // المستوى المادي
  age:         20,  // الفارق العمري
  preferences: 10,  // التفضيلات الإضافية
};

const EDUCATION_ORDER = ['NONE','PRIMARY','SECONDARY','DIPLOMA','BACHELOR','MASTER','PHD'];
const FINANCIAL_ORDER = ['LOW','MEDIUM','HIGH','VERY_HIGH'];

function getLevel(score: number): CompatibilityLevel {
  if (score >= 80) return 'VERY_HIGH';
  if (score >= 60) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  if (score >= 20) return 'LOW';
  return 'VERY_LOW';
}

function calcLocationScore(p1: any, p2: any): number {
  if (p1.city === p2.city) return 100;
  if (p1.state === p2.state) return 60;
  return 20;
}

function calcEducationScore(p1: any, p2: any): number {
  const i1 = EDUCATION_ORDER.indexOf(p1.educationLevel);
  const i2 = EDUCATION_ORDER.indexOf(p2.educationLevel);
  const diff = Math.abs(i1 - i2);
  if (diff === 0) return 100;
  if (diff === 1) return 75;
  if (diff === 2) return 50;
  return 20;
}

function calcFinancialScore(p1: any, p2: any): number {
  const i1 = FINANCIAL_ORDER.indexOf(p1.financialLevel);
  const i2 = FINANCIAL_ORDER.indexOf(p2.financialLevel);
  const diff = Math.abs(i1 - i2);
  if (diff === 0) return 100;
  if (diff === 1) return 70;
  return 30;
}

function calcAgeScore(p1: any, p2: any): number {
  const age1 = new Date().getFullYear() - new Date(p1.dateOfBirth).getFullYear();
  const age2 = new Date().getFullYear() - new Date(p2.dateOfBirth).getFullYear();
  const diff = Math.abs(age1 - age2);
  if (diff <= 2)  return 100;
  if (diff <= 5)  return 80;
  if (diff <= 10) return 55;
  if (diff <= 15) return 30;
  return 10;
}

export function calculateCompatibility(profile1: any, profile2: any): CompatibilityResult {
  const breakdown = {
    location:    calcLocationScore(profile1, profile2),
    education:   calcEducationScore(profile1, profile2),
    financial:   calcFinancialScore(profile1, profile2),
    age:         calcAgeScore(profile1, profile2),
    preferences: 50, // سيتوسع لاحقاً
  };

  const score = Math.round(
    (breakdown.location    * WEIGHTS.location    +
     breakdown.education   * WEIGHTS.education   +
     breakdown.financial   * WEIGHTS.financial   +
     breakdown.age         * WEIGHTS.age         +
     breakdown.preferences * WEIGHTS.preferences) / 100
  );

  return { score, level: getLevel(score), breakdown };
}

// ──────────────────────────────────────────────
// جلب قائمة المرشحين للمستخدم
// ──────────────────────────────────────────────
export async function getPotentialMatches(
  userId: string,
  page = 1,
  limit = 10
): Promise<PaginatedResult<any>> {
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });

  if (!currentUser?.profile) throw new AppError(400, 'يرجى إكمال ملفك الشخصي أولاً');
  if (currentUser.accountStatus !== 'ACTIVE') throw new AppError(403, 'حسابك غير مفعّل بعد');

  const oppositeGender = currentUser.gender === 'MALE' ? 'FEMALE' : 'MALE';

  // جلب المستخدمين المناسبين (الجنس المعاكس، مفعّلون)
  const candidates = await prisma.user.findMany({
    where: {
      gender: oppositeGender,
      accountStatus: 'ACTIVE',
      id: { not: userId },
    },
    include: { profile: true },
    skip: (page - 1) * limit,
    take: limit * 3, // نجلب أكثر ثم نرتّب
  });

  const total = await prisma.user.count({
    where: { gender: oppositeGender, accountStatus: 'ACTIVE', id: { not: userId } },
  });

  // حساب التوافق لكل مرشح
  const withScores = candidates
    .filter(c => c.profile)
    .map(candidate => {
      const compat = calculateCompatibility(currentUser.profile, candidate.profile);
      return {
        userId: candidate.id,
        profile: {
          fullName: candidate.profile!.fullName,
          state: candidate.profile!.state,
          city: candidate.profile!.city,
          educationLevel: candidate.profile!.educationLevel,
          financialLevel: candidate.profile!.financialLevel,
          maritalStatus: candidate.profile!.maritalStatus,
          // الصورة تظهر فقط إذا أذن المستخدم
          photoUrl: candidate.profile!.showPhoto ? candidate.profile!.photoUrl : null,
        },
        compatibility: compat,
      };
    })
    .sort((a, b) => b.compatibility.score - a.compatibility.score)
    .slice(0, limit);

  return {
    data: withScores,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}
