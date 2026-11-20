import { Injectable, NotFoundException } from '@nestjs/common';
import type { ChildSummary, GuardianListItem, InvitationCreated, Paginated } from '@smart-school/contracts';
import { CreateGuardianSchema, LinkGuardianSchema, type PageQuery } from '@smart-school/contracts';
import type { z } from 'zod';
import { InvitationsService } from '../accounts/invitations.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AuthContext } from '../auth/auth.types.js';
import { conflict } from '../common/api-exception.filter.js';
import type { RequestMeta } from '../common/request-meta.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { personData } from './person.mapper.js';

@Injectable()
export class GuardiansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly invitations: InvitationsService,
  ) {}

  async list(auth: AuthContext, q: PageQuery): Promise<Paginated<GuardianListItem>> {
    const where: Prisma.GuardianWhereInput = {
      schoolId: auth.schoolId,
      ...(q.q
        ? { OR: [{ person: { fullName: { contains: q.q, mode: 'insensitive' } } }, { person: { email: { contains: q.q, mode: 'insensitive' } } }] }
        : {}),
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.guardian.count({ where }),
      this.prisma.guardian.findMany({
        where,
        orderBy: [{ person: { fullName: 'asc' } }, { id: 'asc' }],
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: { person: true, _count: { select: { students: { where: { status: { not: 'REVOKED' } } } } } },
      }),
    ]);
    return {
      total,
      page: q.page,
      pageSize: q.pageSize,
      items: rows.map((g) => ({
        id: g.id,
        personId: g.personId,
        fullName: g.person.fullName,
        email: g.person.email,
        phone: g.person.phone,
        childCount: g._count.students,
      })),
    };
  }

  async create(auth: AuthContext, input: z.infer<typeof CreateGuardianSchema>, meta: RequestMeta): Promise<{ id: string }> {
    return this.prisma.$transaction(async (tx) => {
      const person = await tx.person.create({
        data: { ...personData(input), fullName: input.fullName, schoolId: auth.schoolId, createdById: auth.userId, updatedById: auth.userId },
      });
      const g = await tx.guardian.create({ data: { personId: person.id, schoolId: auth.schoolId, occupation: input.occupation } });
      await this.audit.record(
        { schoolId: auth.schoolId, actorUserId: auth.userId, action: 'guardian.create', entityType: 'guardian', entityId: g.id, requestId: meta.requestId, metadata: { fullName: person.fullName } },
        tx,
      );
      return { id: g.id };
    });
  }

  /** Menautkan wali ke siswa dengan status PENDING dan membuat undangan verifikasi. */
  async link(auth: AuthContext, studentId: string, input: z.infer<typeof LinkGuardianSchema>, meta: RequestMeta): Promise<InvitationCreated> {
    const [student, guardian] = await Promise.all([
      this.prisma.student.findFirst({ where: { id: studentId, schoolId: auth.schoolId } }),
      this.prisma.guardian.findFirst({ where: { id: input.guardianId, schoolId: auth.schoolId } }),
    ]);
    if (!student) throw new NotFoundException('Siswa tidak ditemukan.');
    if (!guardian) throw new NotFoundException('Wali tidak ditemukan.');
    const existing = await this.prisma.studentGuardian.findUnique({ where: { studentId_guardianId: { studentId, guardianId: guardian.id } } });
    if (existing && existing.status !== 'REVOKED') {
      throw conflict('Wali ini sudah tertaut ke siswa tersebut.', { guardianId: ['Sudah tertaut.'] });
    }

    return this.prisma.$transaction(async (tx) => {
      const fields = {
        relationship: input.relationship,
        isPrimaryContact: input.isPrimaryContact,
        canViewAcademic: input.canViewAcademic,
        canViewAttendance: input.canViewAttendance,
        canViewFinance: input.canViewFinance,
      };
      const link = existing
        ? await tx.studentGuardian.update({
            where: { id: existing.id },
            data: { ...fields, status: 'PENDING', revokedAt: null, verifiedAt: null, validFrom: new Date(), validUntil: null },
          })
        : await tx.studentGuardian.create({ data: { ...fields, studentId, guardianId: guardian.id, createdById: auth.userId } });
      if (input.isPrimaryContact) {
        await tx.studentGuardian.updateMany({ where: { studentId, id: { not: link.id } }, data: { isPrimaryContact: false } });
      }
      await this.audit.record(
        { schoolId: auth.schoolId, actorUserId: auth.userId, action: 'guardian_link.create', entityType: 'student', entityId: studentId, requestId: meta.requestId, metadata: { linkId: link.id, guardianId: guardian.id, ...fields } },
        tx,
      );
      return this.invitations.create(tx, auth, meta, { personId: guardian.personId, role: 'GUARDIAN', studentGuardianId: link.id });
    });
  }

  async reissueInvitation(auth: AuthContext, linkId: string, meta: RequestMeta): Promise<InvitationCreated> {
    const link = await this.findLink(auth, linkId);
    if (link.status !== 'PENDING') throw conflict('Undangan hanya dapat dikirim ulang untuk tautan yang menunggu verifikasi.');
    return this.prisma.$transaction((tx) =>
      this.invitations.create(tx, auth, meta, { personId: link.guardian.personId, role: 'GUARDIAN', studentGuardianId: link.id }),
    );
  }

  /** Mencabut hak wali segera. Peran GUARDIAN dilepas bila tidak ada anak terverifikasi lain. */
  async revoke(auth: AuthContext, linkId: string, meta: RequestMeta): Promise<void> {
    const link = await this.findLink(auth, linkId);
    if (link.status === 'REVOKED') return;
    await this.prisma.$transaction(async (tx) => {
      await tx.studentGuardian.update({ where: { id: linkId }, data: { status: 'REVOKED', revokedAt: new Date(), validUntil: new Date(), isPrimaryContact: false } });
      await tx.invitation.updateMany({ where: { studentGuardianId: linkId, acceptedAt: null, revokedAt: null }, data: { revokedAt: new Date() } });
      const user = await tx.user.findUnique({ where: { personId: link.guardian.personId } });
      if (user) {
        const remaining = await tx.studentGuardian.count({ where: { guardianId: link.guardianId, status: 'VERIFIED' } });
        if (remaining === 0) {
          await tx.userRole.deleteMany({ where: { userId: user.id, role: 'GUARDIAN', schoolId: auth.schoolId } });
        }
      }
      await this.audit.record(
        { schoolId: auth.schoolId, actorUserId: auth.userId, action: 'guardian_link.revoke', entityType: 'student', entityId: link.studentId, requestId: meta.requestId, metadata: { linkId, guardianId: link.guardianId, previousStatus: link.status } },
        tx,
      );
    });
  }

  private async findLink(auth: AuthContext, linkId: string) {
    const link = await this.prisma.studentGuardian.findFirst({
      where: { id: linkId, student: { schoolId: auth.schoolId } },
      include: { guardian: true },
    });
    if (!link) throw new NotFoundException('Tautan wali tidak ditemukan.');
    return link;
  }

  // ───────────── Portal wali: hanya anak dengan tautan VERIFIED yang masih berlaku ─────────────

  private activeLinksWhere(auth: AuthContext): Prisma.StudentGuardianWhereInput {
    const now = new Date();
    return {
      status: 'VERIFIED',
      validFrom: { lte: now },
      OR: [{ validUntil: null }, { validUntil: { gt: now } }],
      guardian: { personId: auth.personId ?? '__none__', schoolId: auth.schoolId },
    };
  }

  async children(auth: AuthContext): Promise<ChildSummary[]> {
    const links = await this.prisma.studentGuardian.findMany({
      where: this.activeLinksWhere(auth),
      include: { student: { include: { person: true } } },
      orderBy: { student: { person: { fullName: 'asc' } } },
    });
    return links.map((l) => ({
      studentId: l.studentId,
      fullName: l.student.person.fullName,
      nis: l.student.nis,
      status: l.student.status,
      relationship: l.relationship,
      canViewAcademic: l.canViewAcademic,
      canViewAttendance: l.canViewAttendance,
    }));
  }

  /** 404 untuk anak yang bukan milik wali ini, agar ID siswa lain tidak bisa ditebak. */
  async child(auth: AuthContext, studentId: string): Promise<ChildSummary> {
    const child = (await this.children(auth)).find((c) => c.studentId === studentId);
    if (!child) throw new NotFoundException('Data anak tidak ditemukan.');
    return child;
  }
}
