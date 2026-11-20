import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EMPLOYEE_ROLES, type AccountSummary, type InvitationCreated, type RoleKey } from '@smart-school/contracts';
import { AuditService } from '../audit/audit.service.js';
import type { AuthContext } from '../auth/auth.types.js';
import { SessionService } from '../auth/session.service.js';
import { validationFailed } from '../common/api-exception.filter.js';
import type { RequestMeta } from '../common/request-meta.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { InvitationsService } from './invitations.service.js';

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invitations: InvitationsService,
    private readonly sessions: SessionService,
    private readonly audit: AuditService,
  ) {}

  async list(auth: AuthContext): Promise<AccountSummary[]> {
    const users = await this.prisma.user.findMany({
      where: { roles: { some: { schoolId: auth.schoolId } } },
      include: { roles: { where: { schoolId: auth.schoolId } }, person: { select: { fullName: true } } },
      orderBy: { email: 'asc' },
    });
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      status: u.status,
      roles: u.roles.map((r) => r.role),
      personId: u.personId,
      personName: u.person?.fullName ?? null,
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      mfaEnabled: !!u.mfaSecret,
    }));
  }

  /** Pemulihan bila ponsel autentikator hilang: admin mematikan MFA akun lain dan mengakhiri sesinya. */
  async resetMfa(auth: AuthContext, userId: string, meta: RequestMeta): Promise<void> {
    if (userId === auth.userId) throw new BadRequestException('Nonaktifkan MFA akun sendiri dari menu profil.');
    const user = await this.findInSchool(auth, userId);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { mfaSecret: null, mfaPendingSecret: null, mfaEnabledAt: null } });
      await tx.session.deleteMany({ where: { userId: user.id } });
      await this.audit.record(
        { schoolId: auth.schoolId, actorUserId: auth.userId, action: 'account.mfa_reset', entityType: 'user', entityId: user.id, requestId: meta.requestId },
        tx,
      );
    });
  }

  /** Undangan akun untuk pegawai (peran staf) atau siswa (peran STUDENT). */
  async invite(auth: AuthContext, personId: string, role: RoleKey, meta: RequestMeta): Promise<InvitationCreated> {
    const person = await this.prisma.person.findFirst({
      where: { id: personId, schoolId: auth.schoolId },
      include: { student: true, employee: true },
    });
    if (!person) throw new NotFoundException('Data orang tidak ditemukan.');
    const isEmployeeRole = (EMPLOYEE_ROLES as readonly string[]).includes(role);
    if (isEmployeeRole && !person.employee) {
      throw validationFailed('Peran pegawai hanya untuk data pegawai.', { role: ['Orang ini bukan pegawai.'] });
    }
    if (role === 'STUDENT' && !person.student) {
      throw validationFailed('Peran siswa hanya untuk data siswa.', { role: ['Orang ini bukan siswa.'] });
    }
    return this.prisma.$transaction((tx) => this.invitations.create(tx, auth, meta, { personId, role }));
  }

  async setStatus(auth: AuthContext, userId: string, status: 'ACTIVE' | 'DISABLED', meta: RequestMeta): Promise<void> {
    if (userId === auth.userId) throw new BadRequestException('Anda tidak dapat menonaktifkan akun sendiri.');
    const user = await this.findInSchool(auth, userId);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { status } });
      if (status === 'DISABLED') await tx.session.deleteMany({ where: { userId: user.id } });
      await this.audit.record(
        {
          schoolId: auth.schoolId,
          actorUserId: auth.userId,
          action: status === 'DISABLED' ? 'account.disable' : 'account.enable',
          entityType: 'user',
          entityId: user.id,
          requestId: meta.requestId,
          metadata: { from: user.status, to: status },
        },
        tx,
      );
    });
  }

  /** Mengatur peran staf/siswa. Peran GUARDIAN hanya didapat lewat verifikasi hubungan wali. */
  async setRoles(auth: AuthContext, userId: string, roles: RoleKey[], meta: RequestMeta): Promise<void> {
    const user = await this.findInSchool(auth, userId);
    const current = user.roles.map((r) => r.role);
    const keepGuardian = current.includes('GUARDIAN');
    const wanted = new Set<RoleKey>(roles.filter((r) => r !== 'GUARDIAN'));
    if (keepGuardian) wanted.add('GUARDIAN');
    if (userId === auth.userId && current.includes('ADMIN') && !wanted.has('ADMIN')) {
      throw new BadRequestException('Anda tidak dapat mencabut peran admin dari akun sendiri.');
    }
    if ([...wanted].some((r) => (EMPLOYEE_ROLES as readonly string[]).includes(r)) && !user.person?.employee) {
      throw validationFailed('Peran pegawai hanya untuk akun yang terhubung ke data pegawai.', { roles: ['Akun ini bukan pegawai.'] });
    }
    if (wanted.has('STUDENT') && !user.person?.student) {
      throw validationFailed('Peran siswa hanya untuk akun siswa.', { roles: ['Akun ini bukan siswa.'] });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId, schoolId: auth.schoolId, role: { notIn: [...wanted] } } });
      for (const role of wanted) {
        await tx.userRole.upsert({
          where: { userId_role_schoolId: { userId, role, schoolId: auth.schoolId } },
          create: { userId, role, schoolId: auth.schoolId, createdById: auth.userId },
          update: {},
        });
      }
      await this.audit.record(
        {
          schoolId: auth.schoolId,
          actorUserId: auth.userId,
          action: 'account.set_roles',
          entityType: 'user',
          entityId: userId,
          requestId: meta.requestId,
          metadata: { from: current, to: [...wanted] },
        },
        tx,
      );
    });
  }

  private async findInSchool(auth: AuthContext, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, roles: { some: { schoolId: auth.schoolId } } },
      include: { roles: { where: { schoolId: auth.schoolId } }, person: { include: { employee: true, student: true } } },
    });
    if (!user) throw new NotFoundException('Akun tidak ditemukan.');
    return user;
  }

  /** Dipakai setelah undangan diterima untuk langsung membuat sesi (dihitung sebagai login pertama). */
  async createSession(userId: string, role: RoleKey, meta: RequestMeta) {
    const session = await this.sessions.create(userId, role, meta);
    await this.prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
    return session;
  }
}
