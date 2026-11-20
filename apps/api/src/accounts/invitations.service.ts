import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import type { InvitationCreated, InvitationPreview, RoleKey } from '@smart-school/contracts';
import { AuditService } from '../audit/audit.service.js';
import type { AuthContext } from '../auth/auth.types.js';
import { hashPassword, hashToken, newToken } from '../auth/crypto.js';
import { ApiException, conflict, validationFailed } from '../common/api-exception.filter.js';
import type { RequestMeta } from '../common/request-meta.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const INVALID = 'Tautan undangan tidak valid, sudah dipakai, atau sudah kedaluwarsa.';

type Tx = Prisma.TransactionClient;

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Membuat undangan baru dan membatalkan undangan lama yang belum dipakai untuk tujuan yang sama.
   * Dipanggil di dalam transaksi pemanggil.
   */
  async create(
    tx: Tx,
    auth: AuthContext,
    meta: RequestMeta,
    input: { personId: string; role: RoleKey; studentGuardianId?: string },
  ): Promise<InvitationCreated> {
    const person = await tx.person.findFirst({ where: { id: input.personId, schoolId: auth.schoolId } });
    if (!person) throw new NotFoundException('Data orang tidak ditemukan.');
    if (!person.email) {
      throw validationFailed('Isi email orang ini terlebih dahulu sebelum mengirim undangan.', {
        email: ['Email wajib diisi untuk undangan.'],
      });
    }

    await tx.invitation.updateMany({
      where: {
        personId: person.id,
        role: input.role,
        studentGuardianId: input.studentGuardianId ?? null,
        acceptedAt: null,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    const { token, hash } = newToken();
    const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);
    const invitation = await tx.invitation.create({
      data: {
        schoolId: auth.schoolId,
        personId: person.id,
        email: person.email,
        role: input.role,
        studentGuardianId: input.studentGuardianId,
        tokenHash: hash,
        expiresAt,
        createdById: auth.userId,
      },
    });
    await this.audit.record(
      {
        schoolId: auth.schoolId,
        actorUserId: auth.userId,
        action: 'invitation.create',
        entityType: 'person',
        entityId: person.id,
        requestId: meta.requestId,
        metadata: { invitationId: invitation.id, role: input.role, studentGuardianId: input.studentGuardianId ?? null },
      },
      tx,
    );
    return { id: invitation.id, invitePath: `/invite/${token}`, email: person.email, expiresAt: expiresAt.toISOString() };
  }

  private async findUsable(token: string) {
    const inv = await this.prisma.invitation.findUnique({
      where: { tokenHash: hashToken(token) },
      include: {
        school: { select: { name: true } },
        person: { include: { user: true } },
        studentGuardian: { include: { student: { include: { person: { select: { fullName: true } } } } } },
      },
    });
    if (!inv || inv.acceptedAt || inv.revokedAt || inv.expiresAt.getTime() <= Date.now()) {
      throw new NotFoundException(INVALID);
    }
    if (inv.studentGuardian && inv.studentGuardian.status === 'REVOKED') throw new NotFoundException(INVALID);
    return inv;
  }

  async preview(token: string): Promise<InvitationPreview> {
    const inv = await this.findUsable(token);
    return {
      schoolName: inv.school.name,
      personName: inv.person.fullName,
      email: inv.email,
      role: inv.role,
      studentName: inv.studentGuardian?.student.person.fullName ?? null,
      hasAccount: !!inv.person.user,
      expiresAt: inv.expiresAt.toISOString(),
    };
  }

  /**
   * Menerima undangan. Bila orang belum punya akun, akun dibuat dengan kata sandi yang diberikan.
   * Bila sudah punya akun, pengguna harus masuk sebagai akun tersebut (mencegah pengambilalihan lewat tautan).
   */
  async accept(
    token: string,
    password: string | undefined,
    auth: AuthContext | undefined,
    meta: RequestMeta,
  ): Promise<{ userId: string; createdAccount: boolean; role: RoleKey }> {
    const inv = await this.findUsable(token);
    const existing = inv.person.user;

    if (existing) {
      if (!auth || auth.userId !== existing.id) {
        throw new ApiException(
          HttpStatus.CONFLICT,
          'LOGIN_REQUIRED',
          'Akun untuk undangan ini sudah ada. Masuk dengan akun tersebut, lalu buka tautan ini lagi.',
        );
      }
      if (existing.status !== 'ACTIVE') throw new NotFoundException(INVALID);
    } else {
      if (!password) {
        throw validationFailed('Buat kata sandi untuk akun baru.', { password: ['Kata sandi wajib diisi.'] });
      }
      const emailTaken = await this.prisma.user.findUnique({ where: { email: inv.email } });
      if (emailTaken) {
        throw conflict('Email undangan sudah dipakai akun lain. Hubungi admin sekolah.');
      }
    }

    const passwordHash = existing ? null : await hashPassword(password!);

    return this.prisma.$transaction(async (tx) => {
      // Klaim undangan secara atomik: dua permintaan bersamaan tidak bisa sama-sama berhasil.
      const claimed = await tx.invitation.updateMany({
        where: { id: inv.id, acceptedAt: null, revokedAt: null },
        data: { acceptedAt: new Date() },
      });
      if (claimed.count !== 1) throw new NotFoundException(INVALID);

      const user =
        existing ??
        (await tx.user.create({ data: { email: inv.email, passwordHash, personId: inv.personId } }));

      await tx.userRole.upsert({
        where: { userId_role_schoolId: { userId: user.id, role: inv.role, schoolId: inv.schoolId } },
        create: { userId: user.id, role: inv.role, schoolId: inv.schoolId, createdById: inv.createdById },
        update: {},
      });

      if (inv.studentGuardianId) {
        await tx.studentGuardian.updateMany({
          where: { id: inv.studentGuardianId, status: 'PENDING' },
          data: { status: 'VERIFIED', verifiedAt: new Date() },
        });
      }

      await this.audit.record(
        {
          schoolId: inv.schoolId,
          actorUserId: user.id,
          action: 'invitation.accept',
          entityType: 'person',
          entityId: inv.personId,
          requestId: meta.requestId,
          ip: meta.ip,
          metadata: {
            invitationId: inv.id,
            role: inv.role,
            createdAccount: !existing,
            studentGuardianId: inv.studentGuardianId,
          },
        },
        tx,
      );
      return { userId: user.id, createdAccount: !existing, role: inv.role };
    });
  }
}
