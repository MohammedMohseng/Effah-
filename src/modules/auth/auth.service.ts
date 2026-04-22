// src/modules/auth/auth.service.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/error.middleware';
import { JwtPayload } from '../../types';
import { Gender } from '@prisma/client';

export interface RegisterDto {
  email: string;
  phone: string;
  password: string;
  gender: Gender;
  fullName: string;
  dateOfBirth: string;
  state: string;
  city: string;
  educationLevel: string;
  financialLevel: string;
  maritalStatus: string;
  occupation?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

function generateTokens(payload: JwtPayload) {
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any,
  });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '30d') as any,
  });
  return { accessToken, refreshToken };
}

export async function register(dto: RegisterDto) {
  // تحقق من عدم التكرار
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: dto.email }, { phone: dto.phone }] },
  });
  if (existing) {
    throw new AppError(409, 'البريد الإلكتروني أو رقم الهاتف مسجّل مسبقاً');
  }

  const passwordHash = await bcrypt.hash(dto.password, 12);

  const user = await prisma.user.create({
    data: {
      email: dto.email,
      phone: dto.phone,
      passwordHash,
      gender: dto.gender,
      accountStatus: 'INACTIVE',
      profile: {
        create: {
          fullName: dto.fullName,
          dateOfBirth: new Date(dto.dateOfBirth),
          state: dto.state,
          city: dto.city,
          educationLevel: dto.educationLevel as any,
          financialLevel: dto.financialLevel as any,
          maritalStatus: dto.maritalStatus as any,
          occupation: dto.occupation,
          nationality: 'سوداني',
        },
      },
    },
    include: { profile: true },
  });

  const payload: JwtPayload = { userId: user.id, role: user.role, email: user.email };
  const tokens = generateTokens(payload);

  return { user: sanitizeUser(user), ...tokens };
}

export async function login(dto: LoginDto) {
  const user = await prisma.user.findUnique({
    where: { email: dto.email },
    include: { profile: true },
  });

  if (!user) throw new AppError(401, 'بيانات الدخول غير صحيحة');

  const isValid = await bcrypt.compare(dto.password, user.passwordHash);
  if (!isValid) throw new AppError(401, 'بيانات الدخول غير صحيحة');

  if (user.accountStatus === 'BANNED') throw new AppError(403, 'تم حظر هذا الحساب');
  if (user.accountStatus === 'SUSPENDED') throw new AppError(403, 'تم إيقاف هذا الحساب مؤقتاً');

  const payload: JwtPayload = { userId: user.id, role: user.role, email: user.email };
  const tokens = generateTokens(payload);

  return { user: sanitizeUser(user), ...tokens };
}

export async function refreshToken(token: string) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as JwtPayload;
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) throw new AppError(401, 'المستخدم غير موجود');

    const payload: JwtPayload = { userId: user.id, role: user.role, email: user.email };
    const tokens = generateTokens(payload);
    return tokens;
  } catch {
    throw new AppError(401, 'رمز التحديث غير صالح أو منتهي');
  }
}

export async function changePassword(userId: string, oldPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'المستخدم غير موجود');

  const isValid = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!isValid) throw new AppError(400, 'كلمة المرور الحالية غير صحيحة');

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

function sanitizeUser(user: any) {
  const { passwordHash, ...safe } = user;
  return safe;
}
