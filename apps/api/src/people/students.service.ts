import { Injectable, NotFoundException } from '@nestjs/common';
import type { GuardianLinkView, Paginated, StudentDetail, StudentListItem, StudentListQuery } from '@smart-school/contracts';
import { CreateStudentSchema, UpdateStudentSchema } from '@smart-school/contracts';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service.js';
import type { AuthContext } from '../auth/auth.types.js';
import { conflict } from '../common/api-exception.filter.js';
import { fromDbDate, toDbDate } from '../common/dates.js';
import type { RequestMeta } from '../common/request-meta.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { diff, personData, personView } from './person.mapper.js';

const ORDER: Record<StudentListQuery['sort'], Prisma.StudentOrderByWithRelationInput> = {
  name: { person: { fullName: 'asc' } },
  '-name': { person: { fullName: 'desc' } },
  nis: { nis: 'asc' },
  '-nis': { nis: 'desc' },
  createdAt: { createdAt: 'asc' },
  '-createdAt': { createdAt: 'desc' },
};

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(auth: AuthContext, q: StudentListQuery): Promise<Paginated<StudentListItem>> {
    const where: Prisma.StudentWhereInput = {
      schoolId: auth.schoolId,
      status: q.status,
      ...(q.q
        ? { OR: [{ person: { fullName: { contains: q.q, mode: 'insensitive' } } }, { nis: { startsWith: q.q } }, { nisn: { startsWith: q.q } }] }
        : {}),
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.student.count({ where }),
      this.prisma.student.findMany({
        where,
        orderBy: [ORDER[q.sort], { id: 'asc' }],
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: { person: true, _count: { select: { guardians: { where: { status: 'VERIFIED' } } } } },
      }),
    ]);
    return {
      total,
      page: q.page,
      pageSize: q.pageSize,
      items: rows.map((s) => ({
        id: s.id,
        personId: s.personId,
        nis: s.nis,
        nisn: s.nisn,
        fullName: s.person.fullName,
        gender: s.person.gender,
        status: s.status,
        verifiedGuardianCount: s._count.guardians,
      })),
    };
  }

  /** Kembalikan pesan per field untuk NIS/NISN yang sudah dipakai siswa lain. */
  async identifierConflicts(schoolId: string, nis: string | undefined, nisn: string | null | undefined, excludeId?: string) {
    const fieldErrors: Record<string, string[]> = {};
    if (nis) {
      const s = await this.prisma.student.findUnique({ where: { schoolId_nis: { schoolId, nis } }, include: { person: true } });
      if (s && s.id !== excludeId) fieldErrors.nis = [`NIS sudah dipakai oleh ${s.person.fullName}.`];
    }
    if (nisn) {
      const s = await this.prisma.student.findUnique({ where: { schoolId_nisn: { schoolId, nisn } }, include: { person: true } });
      if (s && s.id !== excludeId) fieldErrors.nisn = [`NISN sudah dipakai oleh ${s.person.fullName}.`];
    }
    return fieldErrors;
  }

  async create(auth: AuthContext, input: z.infer<typeof CreateStudentSchema>, meta: RequestMeta): Promise<{ id: string }> {
    const conflicts = await this.identifierConflicts(auth.schoolId, input.nis, input.nisn);
    if (Object.keys(conflicts).length) throw conflict('NIS atau NISN sudah dipakai.', conflicts);

    return this.prisma.$transaction(async (tx) => {
      const person = await tx.person.create({
        data: { ...personData(input), fullName: input.fullName, schoolId: auth.schoolId, createdById: auth.userId, updatedById: auth.userId },
      });
      const student = await tx.student.create({
        data: { personId: person.id, schoolId: auth.schoolId, nis: input.nis, nisn: input.nisn, enrolledAt: toDbDate(input.enrolledAt) },
      });
      await this.audit.record(
        {
          schoolId: auth.schoolId,
          actorUserId: auth.userId,
          action: 'student.create',
          entityType: 'student',
          entityId: student.id,
          requestId: meta.requestId,
          metadata: { nis: student.nis, fullName: person.fullName },
        },
        tx,
      );
      return { id: student.id };
    });
  }

  async get(auth: AuthContext, id: string): Promise<StudentDetail> {
    const s = await this.prisma.student.findFirst({
      where: { id, schoolId: auth.schoolId },
      include: {
        person: { include: { user: true } },
        guardians: {
          orderBy: { createdAt: 'asc' },
          include: {
            guardian: { include: { person: true } },
            invitations: { where: { acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
    });
    if (!s) throw new NotFoundException('Siswa tidak ditemukan.');
    const guardians: GuardianLinkView[] = s.guardians.map((g) => ({
      id: g.id,
      guardianId: g.guardianId,
      guardianName: g.guardian.person.fullName,
      guardianEmail: g.guardian.person.email,
      relationship: g.relationship,
      status: g.status,
      isPrimaryContact: g.isPrimaryContact,
      canViewAcademic: g.canViewAcademic,
      canViewAttendance: g.canViewAttendance,
      canViewFinance: g.canViewFinance,
      verifiedAt: g.verifiedAt?.toISOString() ?? null,
      pendingInvitationExpiresAt: g.status === 'PENDING' ? (g.invitations[0]?.expiresAt.toISOString() ?? null) : null,
    }));
    return {
      id: s.id,
      personId: s.personId,
      nis: s.nis,
      nisn: s.nisn,
      fullName: s.person.fullName,
      gender: s.person.gender,
      status: s.status,
      verifiedGuardianCount: guardians.filter((g) => g.status === 'VERIFIED').length,
      person: personView(s.person),
      enrolledAt: fromDbDate(s.enrolledAt),
      exitedAt: fromDbDate(s.exitedAt),
      guardians,
      account: s.person.user ? { status: s.person.user.status, email: s.person.user.email } : null,
    };
  }

  async update(auth: AuthContext, id: string, input: z.infer<typeof UpdateStudentSchema>, meta: RequestMeta): Promise<void> {
    const s = await this.prisma.student.findFirst({ where: { id, schoolId: auth.schoolId }, include: { person: true } });
    if (!s) throw new NotFoundException('Siswa tidak ditemukan.');
    const conflicts = await this.identifierConflicts(auth.schoolId, undefined, input.nisn, id);
    if (Object.keys(conflicts).length) throw conflict('NISN sudah dipakai.', conflicts);

    const personChanges = personData(input);
    const studentChanges = {
      nisn: input.nisn,
      status: input.status,
      enrolledAt: toDbDate(input.enrolledAt),
      exitedAt: toDbDate(input.exitedAt),
    };
    const changes = { ...diff(s.person, personChanges), ...diff(s, studentChanges) };
    if (!Object.keys(changes).length) return;

    await this.prisma.$transaction(async (tx) => {
      await tx.person.update({ where: { id: s.personId }, data: { ...personChanges, updatedById: auth.userId } });
      await tx.student.update({ where: { id }, data: studentChanges });
      await this.audit.record(
        { schoolId: auth.schoolId, actorUserId: auth.userId, action: 'student.update', entityType: 'student', entityId: id, requestId: meta.requestId, metadata: { changes } },
        tx,
      );
    });
  }
}
