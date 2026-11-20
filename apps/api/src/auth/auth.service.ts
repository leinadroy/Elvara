import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MFA_RECOMMENDED_ROLES, type LoginInput, type Me, type MfaSetup, type MfaStatus, type RoleKey } from '@smart-school/contracts';
import { AuditService } from '../audit/audit.service.js';
import { validationFailed } from '../common/api-exception.filter.js';
import type { RequestMeta } from '../common/request-meta.js';
import type { Env } from '../config/env.js';
import type { User, UserRole } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthContext } from './auth.types.js';
import { hashPassword, hashToken, newToken, verifyPassword } from './crypto.js';
import { SessionService } from './session.service.js';
import { generateTotpSecret, openSecret, otpauthUrl, sealSecret, verifyTotp } from './totp.js';

const INVALID_LOGIN = 'Email atau kata sandi salah.';
const INVALID_CODE = 'Kode verifikasi salah atau sudah kedaluwarsa.';
const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const CHALLENGE_MAX_ATTEMPTS = 5;

export type LoginResult =
  | { kind: 'session'; token: string; expiresAt: Date; me: Me }
  | { kind: 'mfa'; challenge: string };

@Injectable()
export class AuthService {
  private readonly appSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionService,
    private readonly audit: AuditService,
    config: ConfigService<Env, true>,
  ) {
    this.appSecret = config.get('APP_SECRET', { infer: true });
  }

  /** Tahap 1: email + kata sandi. Bila MFA aktif, hasilnya tantangan, bukan sesi. */
  async login(input: LoginInput, meta: RequestMeta): Promise<LoginResult> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email }, include: { roles: true } });
    const ok = await verifyPassword(input.password, user?.passwordHash);

    if (!user || !ok || user.status !== 'ACTIVE') {
      await this.audit.record({
        schoolId: user?.roles[0]?.schoolId,
        actorUserId: user?.id,
        action: 'auth.login_failed',
        entityType: 'user',
        entityId: user?.id,
        requestId: meta.requestId,
        ip: meta.ip,
        metadata: { reason: !user ? 'unknown_email' : !ok ? 'bad_password' : 'disabled' },
      });
      throw new UnauthorizedException(INVALID_LOGIN);
    }
    if (!user.roles.length) throw new ForbiddenException('Akun ini belum memiliki peran. Hubungi admin sekolah.');

    if (user.mfaSecret) {
      const { token, hash } = newToken();
      await this.prisma.mfaChallenge.deleteMany({ where: { userId: user.id } });
      await this.prisma.mfaChallenge.create({ data: { tokenHash: hash, userId: user.id, expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS) } });
      return { kind: 'mfa', challenge: token };
    }
    return this.completeLogin(user, meta, 'password');
  }

  /** Tahap 2: kode TOTP. Tantangan berlaku 5 menit dan gugur setelah 5 kode salah. */
  async verifyMfaLogin(challenge: string, code: string, meta: RequestMeta): Promise<LoginResult> {
    const row = await this.prisma.mfaChallenge.findUnique({ where: { tokenHash: hashToken(challenge) }, include: { user: { include: { roles: true } } } });
    if (!row || row.expiresAt.getTime() <= Date.now() || row.attempts >= CHALLENGE_MAX_ATTEMPTS || row.user.status !== 'ACTIVE' || !row.user.mfaSecret) {
      if (row) await this.prisma.mfaChallenge.deleteMany({ where: { id: row.id } });
      throw new UnauthorizedException('Sesi verifikasi berakhir. Masuk ulang dengan email dan kata sandi.');
    }
    if (!verifyTotp(openSecret(row.user.mfaSecret, this.appSecret), code)) {
      await this.prisma.mfaChallenge.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
      await this.audit.record({
        schoolId: row.user.roles[0]?.schoolId,
        actorUserId: row.userId,
        action: 'auth.mfa_failed',
        entityType: 'user',
        entityId: row.userId,
        requestId: meta.requestId,
        ip: meta.ip,
      });
      throw new UnauthorizedException(INVALID_CODE);
    }
    await this.prisma.mfaChallenge.deleteMany({ where: { id: row.id } });
    return this.completeLogin(row.user, meta, 'password+totp');
  }

  private async completeLogin(user: User & { roles: UserRole[] }, meta: RequestMeta, method: string): Promise<LoginResult> {
    const activeRole = this.sessions.pickDefaultRole(user.roles.map((r) => r.role))!;
    const session = await this.sessions.create(user.id, activeRole, meta);
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await this.audit.record({
      schoolId: user.roles[0]!.schoolId,
      actorUserId: user.id,
      action: 'auth.login',
      entityType: 'user',
      entityId: user.id,
      requestId: meta.requestId,
      ip: meta.ip,
      metadata: { activeRole, method },
    });
    const ctx = await this.sessions.resolve(session.token);
    return { kind: 'session', token: session.token, expiresAt: session.expiresAt, me: await this.me(ctx!) };
  }

  async logout(auth: AuthContext, meta: RequestMeta): Promise<void> {
    await this.sessions.revoke(auth.sessionId);
    await this.audit.record({
      schoolId: auth.schoolId,
      actorUserId: auth.userId,
      action: 'auth.logout',
      entityType: 'user',
      entityId: auth.userId,
      requestId: meta.requestId,
      ip: meta.ip,
    });
  }

  async me(auth: AuthContext): Promise<Me> {
    const [person, school] = await Promise.all([
      auth.personId ? this.prisma.person.findUnique({ where: { id: auth.personId }, select: { id: true, fullName: true } }) : null,
      this.prisma.school.findUniqueOrThrow({ where: { id: auth.schoolId }, select: { id: true, name: true } }),
    ]);
    return {
      user: { id: auth.userId, email: auth.email },
      person,
      school,
      roles: auth.roles,
      activeRole: auth.activeRole,
      permissions: [...auth.permissions],
    };
  }

  async switchRole(auth: AuthContext, role: RoleKey, meta: RequestMeta): Promise<void> {
    if (!auth.roles.includes(role)) throw new ForbiddenException('Anda tidak memiliki peran tersebut.');
    await this.prisma.session.update({ where: { id: auth.sessionId }, data: { activeRole: role } });
    await this.audit.record({
      schoolId: auth.schoolId,
      actorUserId: auth.userId,
      action: 'auth.switch_role',
      entityType: 'user',
      entityId: auth.userId,
      requestId: meta.requestId,
      metadata: { from: auth.activeRole, to: role },
    });
  }

  /** Ganti kata sandi: wajib kata sandi lama; semua sesi lain diakhiri. */
  async changePassword(auth: AuthContext, current: string, next: string, meta: RequestMeta): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: auth.userId } });
    if (!(await verifyPassword(current, user.passwordHash))) {
      throw validationFailed('Kata sandi saat ini salah.', { currentPassword: ['Kata sandi saat ini salah.'] });
    }
    if (current === next) throw validationFailed('Kata sandi baru harus berbeda.', { newPassword: ['Gunakan kata sandi yang berbeda dari sebelumnya.'] });
    const passwordHash = await hashPassword(next);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
      await tx.session.deleteMany({ where: { userId: user.id, id: { not: auth.sessionId } } });
      await this.audit.record(
        { schoolId: auth.schoolId, actorUserId: auth.userId, action: 'auth.password_change', entityType: 'user', entityId: auth.userId, requestId: meta.requestId, ip: meta.ip },
        tx,
      );
    });
  }

  // ───────────── MFA ─────────────

  async mfaStatus(auth: AuthContext): Promise<MfaStatus> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: auth.userId } });
    return {
      enabled: !!user.mfaSecret,
      enabledAt: user.mfaEnabledAt?.toISOString() ?? null,
      recommended: auth.roles.some((r) => MFA_RECOMMENDED_ROLES.includes(r)),
    };
  }

  /** Membuat rahasia baru (belum aktif) untuk dipindai aplikasi autentikator. */
  async mfaSetup(auth: AuthContext): Promise<MfaSetup> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: auth.userId }, include: { roles: { include: { school: true } } } });
    if (user.mfaSecret) throw validationFailed('MFA sudah aktif. Nonaktifkan dulu untuk mengganti perangkat.');
    const secret = generateTotpSecret();
    await this.prisma.user.update({ where: { id: user.id }, data: { mfaPendingSecret: sealSecret(secret, this.appSecret) } });
    const issuer = user.roles[0]?.school.name ?? 'Smart School';
    return { secret, otpauthUrl: otpauthUrl(secret, user.email, issuer) };
  }

  /** Mengaktifkan MFA setelah kode pertama dari aplikasi autentikator terbukti benar. */
  async mfaEnable(auth: AuthContext, code: string, meta: RequestMeta): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: auth.userId } });
    if (!user.mfaPendingSecret) throw validationFailed('Mulai penyiapan MFA terlebih dahulu.');
    if (!verifyTotp(openSecret(user.mfaPendingSecret, this.appSecret), code)) {
      throw validationFailed(INVALID_CODE, { code: [INVALID_CODE] });
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { mfaSecret: user.mfaPendingSecret, mfaPendingSecret: null, mfaEnabledAt: new Date() } });
      await tx.session.deleteMany({ where: { userId: user.id, id: { not: auth.sessionId } } });
      await this.audit.record(
        { schoolId: auth.schoolId, actorUserId: auth.userId, action: 'auth.mfa_enable', entityType: 'user', entityId: auth.userId, requestId: meta.requestId, ip: meta.ip },
        tx,
      );
    });
  }

  /** Menonaktifkan MFA oleh pemilik akun, wajib dengan kode yang masih berlaku. */
  async mfaDisable(auth: AuthContext, code: string, meta: RequestMeta): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: auth.userId } });
    if (!user.mfaSecret) return;
    if (!verifyTotp(openSecret(user.mfaSecret, this.appSecret), code)) throw validationFailed(INVALID_CODE, { code: [INVALID_CODE] });
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { mfaSecret: null, mfaPendingSecret: null, mfaEnabledAt: null } });
      await this.audit.record(
        { schoolId: auth.schoolId, actorUserId: auth.userId, action: 'auth.mfa_disable', entityType: 'user', entityId: auth.userId, requestId: meta.requestId, ip: meta.ip },
        tx,
      );
    });
  }
}
