import { Injectable, NotFoundException } from '@nestjs/common';
import type { LessonPeriodView, LessonPeriodsSchema, SubjectSchema, SubjectView, TeachingAssignmentSchema, TeachingAssignmentView } from '@smart-school/contracts';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service.js';
import type { AuthContext } from '../auth/auth.types.js';
import { conflict, validationFailed } from '../common/api-exception.filter.js';
import type { RequestMeta } from '../common/request-meta.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

const TA_INCLUDE = {
  subject: { select: { id: true, code: true, name: true } },
  classGroup: { select: { id: true, code: true } },
  employee: { select: { id: true, person: { select: { fullName: true } } } },
  timetableSlots: { where: { version: { status: { in: ['PUBLISHED', 'DRAFT'] } } }, select: { id: true, version: { select: { status: true } } } },
} satisfies Prisma.TeachingAssignmentInclude;

@Injectable()
export class CurriculumService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ───────────── Mata pelajaran ─────────────

  async subjects(auth: AuthContext): Promise<SubjectView[]> {
    return this.prisma.subject.findMany({ where: { schoolId: auth.schoolId }, orderBy: { name: 'asc' }, select: { id: true, code: true, name: true, groupCode: true, status: true } });
  }

  async saveSubject(auth: AuthContext, id: string | null, input: z.infer<typeof SubjectSchema>, meta: RequestMeta) {
    const clash = await this.prisma.subject.findFirst({ where: { schoolId: auth.schoolId, code: input.code, id: id ? { not: id } : undefined } });
    if (clash) throw conflict('Kode mata pelajaran sudah dipakai.', { code: ['Kode sudah dipakai.'] });
    if (id && !(await this.prisma.subject.findFirst({ where: { id, schoolId: auth.schoolId } }))) throw new NotFoundException('Mata pelajaran tidak ditemukan.');
    const row = id ? await this.prisma.subject.update({ where: { id }, data: input }) : await this.prisma.subject.create({ data: { ...input, schoolId: auth.schoolId } });
    await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: id ? 'subject.update' : 'subject.create', entityType: 'subject', entityId: row.id, requestId: meta.requestId, metadata: input });
    return { id: row.id };
  }

  // ───────────── Penugasan mengajar ─────────────

  async assignments(auth: AuthContext, q: { termId?: string; classGroupId?: string; employeeId?: string }): Promise<TeachingAssignmentView[]> {
    const rows = await this.prisma.teachingAssignment.findMany({
      where: { schoolId: auth.schoolId, termId: q.termId, classGroupId: q.classGroupId, employeeId: q.employeeId },
      include: TA_INCLUDE,
      orderBy: [{ classGroup: { code: 'asc' } }, { subject: { name: 'asc' } }],
    });
    return rows.map((a) => {
      // Slot terjadwal dihitung dari draf bila sedang disusun; bila tidak ada draf, dari versi terbit.
      const hasDraft = a.timetableSlots.some((e) => e.version.status === 'DRAFT');
      const relevant = a.timetableSlots.filter((e) => e.version.status === (hasDraft ? 'DRAFT' : 'PUBLISHED'));
      return {
        id: a.id,
        termId: a.termId,
        subject: a.subject,
        classGroup: a.classGroup,
        employee: { id: a.employee.id, fullName: a.employee.person.fullName },
        teachingRole: a.teachingRole,
        weeklyPeriods: a.weeklyPeriods,
        scheduledSlots: relevant.length,
      };
    });
  }

  async createAssignment(auth: AuthContext, input: z.infer<typeof TeachingAssignmentSchema>, meta: RequestMeta) {
    const [term, subject, cls, teacher] = await Promise.all([
      this.prisma.term.findFirst({ where: { id: input.termId, academicYear: { schoolId: auth.schoolId } } }),
      this.prisma.subject.findFirst({ where: { id: input.subjectId, schoolId: auth.schoolId, status: 'ACTIVE' } }),
      this.prisma.classGroup.findFirst({ where: { id: input.classGroupId, schoolId: auth.schoolId } }),
      this.prisma.employee.findFirst({ where: { id: input.employeeId, schoolId: auth.schoolId, isTeacher: true, status: 'ACTIVE' } }),
    ]);
    const fe: Record<string, string[]> = {};
    if (!term) fe.termId = ['Semester tidak ditemukan.'];
    if (!subject) fe.subjectId = ['Mata pelajaran tidak ditemukan atau nonaktif.'];
    if (!cls) fe.classGroupId = ['Rombel tidak ditemukan.'];
    if (!teacher) fe.employeeId = ['Guru tidak ditemukan atau tidak aktif.'];
    if (term && cls && term.academicYearId !== cls.academicYearId) fe.classGroupId = ['Rombel dan semester harus di tahun ajaran yang sama.'];
    if (Object.keys(fe).length) throw validationFailed('Periksa kembali isian yang ditandai.', fe);
    const exists = await this.prisma.teachingAssignment.findUnique({
      where: { termId_classGroupId_subjectId_employeeId: { termId: input.termId, classGroupId: input.classGroupId, subjectId: input.subjectId, employeeId: input.employeeId } },
    });
    if (exists) throw conflict('Guru ini sudah ditugaskan untuk mapel tersebut di rombel ini.', { employeeId: ['Sudah ditugaskan.'] });
    if (input.teachingRole === 'MAIN') {
      const main = await this.prisma.teachingAssignment.findFirst({ where: { termId: input.termId, classGroupId: input.classGroupId, subjectId: input.subjectId, teachingRole: 'MAIN' } });
      if (main) throw conflict('Mapel ini sudah punya guru utama di rombel tersebut. Tambahkan sebagai pendamping atau ganti gurunya.', { teachingRole: ['Sudah ada guru utama.'] });
    }
    const a = await this.prisma.teachingAssignment.create({ data: { ...input, schoolId: auth.schoolId } });
    await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'teaching_assignment.create', entityType: 'teaching_assignment', entityId: a.id, requestId: meta.requestId, metadata: input });
    return { id: a.id };
  }

  /** Ganti guru atau target jam per minggu. Riwayat absensi tetap merujuk guru yang mengisinya. */
  async updateAssignment(auth: AuthContext, id: string, input: { employeeId?: string; weeklyPeriods?: number }, meta: RequestMeta) {
    const a = await this.prisma.teachingAssignment.findFirst({ where: { id, schoolId: auth.schoolId } });
    if (!a) throw new NotFoundException('Penugasan tidak ditemukan.');
    if (input.employeeId && !(await this.prisma.employee.findFirst({ where: { id: input.employeeId, schoolId: auth.schoolId, isTeacher: true, status: 'ACTIVE' } }))) {
      throw validationFailed('Guru tidak ditemukan atau tidak aktif.', { employeeId: ['Guru tidak valid.'] });
    }
    await this.prisma.teachingAssignment.update({ where: { id }, data: input });
    await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'teaching_assignment.update', entityType: 'teaching_assignment', entityId: id, requestId: meta.requestId, metadata: { from: { employeeId: a.employeeId, weeklyPeriods: a.weeklyPeriods }, to: input } });
  }

  async deleteAssignment(auth: AuthContext, id: string, meta: RequestMeta) {
    const a = await this.prisma.teachingAssignment.findFirst({
      where: { id, schoolId: auth.schoolId },
      include: { _count: { select: { timetableSlots: true, attendanceSessions: true } } },
    });
    if (!a) throw new NotFoundException('Penugasan tidak ditemukan.');
    if (a._count.timetableSlots || a._count.attendanceSessions) {
      throw conflict('Penugasan sudah dipakai di jadwal atau absensi. Ganti gurunya, jangan dihapus.');
    }
    await this.prisma.teachingAssignment.delete({ where: { id } });
    await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'teaching_assignment.delete', entityType: 'teaching_assignment', entityId: id, requestId: meta.requestId });
  }

  // ───────────── Jam pelajaran ─────────────

  async periods(auth: AuthContext): Promise<LessonPeriodView[]> {
    return this.prisma.lessonPeriod.findMany({ where: { schoolId: auth.schoolId }, orderBy: { sequence: 'asc' }, select: { sequence: true, startTime: true, endTime: true } });
  }

  /** Mengganti daftar jam pelajaran (bel). Slot jadwal menyimpan jamnya sendiri, jadi jadwal lama tidak berubah. */
  async savePeriods(auth: AuthContext, input: z.infer<typeof LessonPeriodsSchema>, meta: RequestMeta) {
    await this.prisma.$transaction(async (tx) => {
      await tx.lessonPeriod.deleteMany({ where: { schoolId: auth.schoolId } });
      await tx.lessonPeriod.createMany({ data: input.periods.map((p) => ({ ...p, schoolId: auth.schoolId })) });
      await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'lesson_periods.update', entityType: 'school', entityId: auth.schoolId, requestId: meta.requestId, metadata: { count: input.periods.length } }, tx);
    });
  }
}
