import { createHash } from 'node:crypto';
import { Body, Controller, Get, HttpCode, NotFoundException, Param, Post, Put, Query, Req, Res, StreamableFile } from '@nestjs/common';
import { PortalGradesQuerySchema, UuidParamSchema } from '@smart-school/contracts';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { activeOn } from '../academics/classes.service.js';
import { ScopeService } from '../academics/scope.service.js';
import type { AuthContext } from '../auth/auth.types.js';
import { CurrentAuth, RequireActiveRole, RequirePermissions } from '../auth/decorators.js';
import { AuditService } from '../audit/audit.service.js';
import { fromDbDate, toDbDate } from '../common/dates.js';
import { conflict } from '../common/api-exception.filter.js';
import { todayIn } from '../common/school-time.js';
import { requestMeta } from '../common/request-meta.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AssessmentsService } from './assessments.service.js';
import { StorageService } from '../documents/storage.service.js';
import { renderReportCard } from './report-card-pdf.js';
import { SchemesService } from './schemes.service.js';

const PreviewQuery = z.object({ classGroupId: z.uuid(), termId: z.uuid() });
const SubmitInput = PreviewQuery.extend({ studentId: z.uuid(), homeroomNote: z.string().trim().max(1500).optional() });
const ReturnInput = z.object({ reason: z.string().trim().min(5).max(1500) });
const ApproveInput = z.object({ revisionReason: z.string().trim().min(5).max(1500).optional() }).optional();
const ReviewQueueQuery = z.object({ status: z.enum(['SUBMITTED', 'PUBLISHED']).default('SUBMITTED') });
const DescriptionInput = z.object({
  teachingAssignmentId: z.uuid(),
  studentId: z.uuid(),
  highestAchievement: z.string().trim().min(1).max(1500),
  needsImprovement: z.string().trim().min(1).max(1500),
});

@Controller('report-cards')
export class ReportCardsController {
  constructor(private readonly prisma: PrismaService, private readonly assessments: AssessmentsService, private readonly audit: AuditService, private readonly storage: StorageService, private readonly scope: ScopeService, private readonly schemes: SchemesService) {}

  private async currentTerm(auth: AuthContext) {
    const school = await this.prisma.school.findUniqueOrThrow({ where: { id: auth.schoolId }, select: { timezone: true } });
    const date = todayIn(school.timezone);
    const day = toDbDate(date);
    const term = await this.prisma.term.findFirst({
      where: { academicYear: { schoolId: auth.schoolId, status: 'ACTIVE' }, startDate: { lte: day }, endDate: { gte: day } },
      select: { id: true, name: true, academicYearId: true },
      orderBy: [{ startDate: 'desc' }, { id: 'asc' }],
    });
    return { term, date };
  }

  @Get('teacher-dashboard')
  @RequireActiveRole('TEACHER')
  async teacherDashboard(@CurrentAuth() auth: AuthContext) {
    const { term } = await this.currentTerm(auth);
    if (!auth.personId || !term) return null;
    const assignments = await this.prisma.teachingAssignment.findMany({
      where: { schoolId: auth.schoolId, termId: term.id, employee: { personId: auth.personId } },
      select: { id: true },
    });
    const teachingAssignmentId = { in: assignments.map(({ id }) => id) };
    const [drafts, activities, descriptions, options] = await Promise.all([
      this.prisma.assessment.count({ where: { schoolId: auth.schoolId, teachingAssignmentId, status: 'DRAFT', OR: [{ activityId: null }, { activity: { status: { not: 'CANCELLED' } } }] } }),
      this.prisma.learningActivity.findMany({
        where: { schoolId: auth.schoolId, teachingAssignmentId, status: { in: ['PUBLISHED', 'CLOSED'] }, submissions: { some: {} } },
        select: { submissions: { select: { studentId: true } }, assessment: { select: { entries: { where: { state: { not: 'PENDING' } }, select: { studentId: true } } } } },
      }),
      Promise.all(assignments.map(({ id }) => this.descriptions(auth, { teachingAssignmentId: id }))),
      this.homeroomOptions(auth),
    ]);
    const homerooms = await Promise.all(options.filter((option) => option.termId === term.id).map(async (option) => {
      const preview = await this.buildPreview(auth, option, this.prisma);
      return {
        ...option, total: preview.students.length,
        ready: preview.students.filter((student) => student.ready || student.status === 'PUBLISHED').length,
      };
    }));
    const ungraded = activities.reduce((total, activity) => {
      const graded = new Set(activity.assessment?.entries.map((entry) => entry.studentId));
      return total + activity.submissions.filter((submission) => !graded.has(submission.studentId)).length;
    }, 0);
    return {
      term: term.name, drafts, ungraded, homerooms,
      missingDescriptions: descriptions.flat().filter((row) => row.editable && (!row.description?.highestAchievement || !row.description.needsImprovement)).length,
      generatedAt: new Date().toISOString(),
    };
  }

  /** Status rapor peserta aktif per rombel pada semester berjalan (FR-16.3, §4 grading:read). */
  private async progress(auth: AuthContext) {
    const { term, date } = await this.currentTerm(auth);
    if (!term) return null;
    const [groups, reports] = await Promise.all([
      this.prisma.classGroup.findMany({
        where: { schoolId: auth.schoolId, academicYearId: term.academicYearId },
        select: { id: true, code: true, enrollments: { where: activeOn(date), select: { studentId: true } } },
        orderBy: { code: 'asc' },
      }),
      this.prisma.reportCard.findMany({
        where: { schoolId: auth.schoolId, termId: term.id },
        select: { classGroupId: true, studentId: true, status: true },
      }),
    ]);
    const byStudent = new Map(reports.map((report) => [report.studentId, report]));
    return {
      term, generatedAt: new Date().toISOString(),
      groups: groups.map((group) => {
        const studentIds = [...new Set(group.enrollments.map((row) => row.studentId))];
        const counts = { DRAFT: 0, RETURNED: 0, SUBMITTED: 0, PUBLISHED: 0, NOT_STARTED: 0 };
        for (const studentId of studentIds) {
          const report = byStudent.get(studentId);
          counts[report?.classGroupId === group.id ? report.status : 'NOT_STARTED']++;
        }
        return { id: group.id, code: group.code, total: studentIds.length, counts };
      }),
    };
  }

  @Get('curriculum-dashboard')
  @RequireActiveRole('CURRICULUM')
  async curriculumDashboard(@CurrentAuth() auth: AuthContext) {
    const progress = await this.progress(auth);
    if (!progress) return null;
    const schemes = await this.schemes.list(auth, progress.term.id);
    return { ...progress, missingSchemes: schemes.filter((row) => row.taught && !row.published).length };
  }

  /** §4: kurikulum, pimpinan, dan admin (grading:read) membaca progres rapor semua rombel. */
  @Get('progress')
  @RequirePermissions('grading:read')
  readProgress(@CurrentAuth() auth: AuthContext) {
    return this.progress(auth);
  }

  /** §4: isi rapor satu rombel untuk pembaca (grading:read), beserta versi terbit tiap siswa. Hanya baca. */
  @Get('class-view')
  @RequirePermissions('grading:read')
  async classView(@CurrentAuth() auth: AuthContext, @Query({ schema: PreviewQuery }) query: z.infer<typeof PreviewQuery>) {
    const preview = await this.buildPreview(auth, query, this.prisma, undefined, true);
    const versions = await this.prisma.reportCardVersion.findMany({
      where: { reportCard: { schoolId: auth.schoolId, classGroupId: query.classGroupId, termId: query.termId } },
      select: { id: true, versionNo: true, publishedAt: true, revisionReason: true, reportCard: { select: { studentId: true } } },
      orderBy: { versionNo: 'desc' },
    });
    const { timezone: _tz, ...rest } = preview;
    return {
      ...rest,
      students: preview.students.map((student) => ({
        ...student,
        versions: versions.filter((v) => v.reportCard.studentId === student.studentId).map(({ reportCard: _r, ...v }) => v),
      })),
    };
  }

  /** Unduh PDF versi terbit untuk pembaca rapor (grading:read). Setiap unduhan tercatat. */
  @Get('versions/:versionId/file')
  @RequirePermissions('grading:read')
  async readerDownload(@CurrentAuth() auth: AuthContext, @Param('versionId', { schema: UuidParamSchema }) id: string, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const version = await this.prisma.reportCardVersion.findFirst({
      where: { id, reportCard: { schoolId: auth.schoolId } },
      select: { reportCardId: true, versionNo: true, storageKey: true, reportCard: { select: { student: { select: { nis: true } } } } },
    });
    if (!version) throw new NotFoundException('Rapor terbit tidak ditemukan.');
    await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'report_card.download', entityType: 'report_card', entityId: version.reportCardId, requestId: requestMeta(req).requestId, metadata: { versionNo: version.versionNo } });
    const file = await this.storage.open(version.storageKey);
    res.set({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
    return new StreamableFile(file.stream, { type: 'application/pdf', length: file.size, disposition: `attachment; filename="rapor-${version.reportCard.student.nis}-v${version.versionNo}.pdf"` });
  }

  @Get('portal')
  @RequireActiveRole('STUDENT', 'GUARDIAN')
  async portal(@CurrentAuth() auth: AuthContext, @Query({ schema: PortalGradesQuerySchema }) query: z.infer<typeof PortalGradesQuerySchema>) {
    const studentId = await this.scope.portalStudentId(auth, 'academic', query.studentId);
    return this.prisma.reportCardVersion.findMany({
      where: { reportCard: { schoolId: auth.schoolId, studentId } },
      select: {
        id: true, versionNo: true, publishedAt: true,
        reportCard: { select: { term: { select: { name: true, academicYear: { select: { name: true } } } } } },
      },
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
    });
  }

  @Get('portal/:versionId/file')
  @RequireActiveRole('STUDENT', 'GUARDIAN')
  async download(
    @CurrentAuth() auth: AuthContext,
    @Param('versionId', { schema: UuidParamSchema }) id: string,
    @Query({ schema: PortalGradesQuerySchema }) query: z.infer<typeof PortalGradesQuerySchema>,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const studentId = await this.scope.portalStudentId(auth, 'academic', query.studentId);
    const version = await this.prisma.reportCardVersion.findFirst({
      where: { id, reportCard: { schoolId: auth.schoolId, studentId } },
      select: { reportCardId: true, versionNo: true, storageKey: true },
    });
    if (!version) throw new NotFoundException('Rapor terbit tidak ditemukan.');
    await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'report_card.download', entityType: 'report_card', entityId: version.reportCardId, requestId: requestMeta(req).requestId, metadata: { versionNo: version.versionNo } });
    const file = await this.storage.open(version.storageKey);
    res.set({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
    return new StreamableFile(file.stream, { type: 'application/pdf', length: file.size, disposition: `attachment; filename="rapor-v${version.versionNo}.pdf"` });
  }

  @Get(':id/review')
  @RequirePermissions('report-cards:approve')
  async review(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string) {
    const report = await this.prisma.reportCard.findFirst({ where: { id, schoolId: auth.schoolId, status: 'SUBMITTED' } });
    if (!report) throw new NotFoundException('Rapor dalam antrean tidak ditemukan.');
    return { ...await this.buildPreview(auth, report, this.prisma, report.studentId, true), currentVersionNo: report.currentVersionNo };
  }

  @Post(':id/approve')
  @HttpCode(204)
  @RequirePermissions('report-cards:approve')
  async approve(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Body({ schema: ApproveInput }) input: z.infer<typeof ApproveInput>, @Req() req: Request) {
    let storageKey: string | undefined;
    try {
      await this.prisma.$transaction(async (tx) => {
        const [locked] = await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM report_card WHERE id = ${id}::uuid AND "schoolId" = ${auth.schoolId}::uuid FOR UPDATE
        `;
        if (!locked) throw new NotFoundException('Rapor tidak ditemukan.');
        const report = await tx.reportCard.findUniqueOrThrow({ where: { id } });
        if (report.status !== 'SUBMITTED') throw conflict('Rapor belum diajukan atau sudah diputuskan.');
        const preview = await this.buildPreview(auth, report, tx, report.studentId, true);
        const student = preview.students[0];
        if (!student?.ready) throw conflict('Rapor perlu dilengkapi sebelum diterbitkan.');
        const publishedAt = new Date();
        const versionNo = report.currentVersionNo + 1;
        const revisionReason = versionNo > 1 ? input?.revisionReason : undefined;
        if (versionNo > 1 && !revisionReason) throw conflict('Isi alasan penerbitan versi revisi.');
        const snapshot = {
          school: preview.school, classGroup: preview.classGroup, term: preview.term,
          student, versionNo, publishedOn: todayIn(preview.timezone),
        };
        const pdf = await renderReportCard(snapshot);
        storageKey = await this.storage.put(pdf);
        const version = await tx.reportCardVersion.create({
          data: { reportCardId: id, versionNo, snapshot, storageKey, sha256: createHash('sha256').update(pdf).digest('hex'), publishedAt, publishedById: auth.userId, revisionReason },
        });
        await tx.reportCard.update({
          where: { id }, data: { status: 'PUBLISHED', currentVersionNo: versionNo, decidedAt: publishedAt, decidedById: auth.userId },
        });
        await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'report_card.publish', entityType: 'report_card', entityId: id, requestId: requestMeta(req).requestId, metadata: { versionNo } }, tx);
        await this.assessments.notifyPublication(tx, auth.schoolId, version.id, [report.studentId], 'reports');
      }, { isolationLevel: 'RepeatableRead', timeout: 15000 });
    } catch (error) {
      if (storageKey) await this.storage.remove(storageKey);
      throw error;
    }
  }

  @Post(':id/reopen')
  @HttpCode(204)
  @RequirePermissions('report-cards:approve')
  async reopen(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Body({ schema: ReturnInput }) input: z.infer<typeof ReturnInput>, @Req() req: Request) {
    await this.prisma.$transaction(async (tx) => {
      const result = await tx.reportCard.updateMany({
        where: { id, schoolId: auth.schoolId, status: 'PUBLISHED' },
        data: { status: 'RETURNED', returnNote: input.reason, decidedAt: new Date(), decidedById: auth.userId },
      });
      if (!result.count) throw conflict('Hanya rapor terbit yang dapat dibuka untuk revisi.');
      await this.audit.record({
        schoolId: auth.schoolId, actorUserId: auth.userId, action: 'report_card.reopen',
        entityType: 'report_card', entityId: id, requestId: requestMeta(req).requestId, metadata: { reason: input.reason },
      }, tx);
    });
  }

  @Get('review-queue')
  @RequirePermissions('report-cards:approve')
  queue(@CurrentAuth() auth: AuthContext, @Query({ schema: ReviewQueueQuery }) query: z.infer<typeof ReviewQueueQuery>) {
    return this.prisma.reportCard.findMany({
      where: { schoolId: auth.schoolId, status: query.status },
      select: {
        id: true, submittedAt: true, decidedAt: true, currentVersionNo: true, homeroomNote: true,
        student: { select: { nis: true, person: { select: { fullName: true } } } },
        term: { select: { name: true } }, classGroup: { select: { code: true } },
      },
      orderBy: [{ submittedAt: 'asc' }, { id: 'asc' }],
    });
  }

  @Post('submit')
  @HttpCode(204)
  @RequireActiveRole('TEACHER')
  async submit(@CurrentAuth() auth: AuthContext, @Body({ schema: SubmitInput }) input: z.infer<typeof SubmitInput>, @Req() req: Request) {
    await this.prisma.$transaction(async (tx) => {
      const report = await tx.reportCard.findFirst({
        where: { schoolId: auth.schoolId, classGroupId: input.classGroupId, termId: input.termId, studentId: input.studentId },
        select: { id: true },
      });
      if (!report) {
        await this.buildPreview(auth, input, tx, input.studentId);
        throw conflict('Lengkapi rapor sebelum mengajukan.');
      }
      await tx.$queryRaw`SELECT id FROM report_card WHERE id = ${report.id}::uuid FOR UPDATE`;
      const preview = await this.buildPreview(auth, input, tx, input.studentId);
      const student = preview.students[0];
      if (!student) throw new NotFoundException('Siswa tidak ditemukan dalam rombel.');
      if (!student.ready) throw conflict('Lengkapi nilai dan deskripsi capaian sebelum mengajukan rapor.');
      const updated = await tx.reportCard.updateMany({
        where: { id: report.id, status: { in: ['DRAFT', 'RETURNED'] } },
        data: { status: 'SUBMITTED', homeroomNote: input.homeroomNote || null, submittedAt: new Date(), submittedById: auth.userId, decidedAt: null, decidedById: null, returnNote: null },
      });
      if (!updated.count) throw conflict('Rapor sudah diajukan atau diterbitkan.');
      await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'report_card.submit', entityType: 'report_card', entityId: report.id, requestId: requestMeta(req).requestId }, tx);
    });
  }

  @Post(':id/return')
  @HttpCode(204)
  @RequirePermissions('report-cards:approve')
  async returnForRevision(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Body({ schema: ReturnInput }) input: z.infer<typeof ReturnInput>, @Req() req: Request) {
    await this.prisma.$transaction(async (tx) => {
      const report = await tx.reportCard.findFirst({ where: { id, schoolId: auth.schoolId }, select: { id: true } });
      if (!report) throw new NotFoundException('Rapor tidak ditemukan.');
      const updated = await tx.reportCard.updateMany({
        where: { id, schoolId: auth.schoolId, status: 'SUBMITTED' },
        data: { status: 'RETURNED', returnNote: input.reason, decidedAt: new Date(), decidedById: auth.userId },
      });
      if (!updated.count) throw conflict('Rapor belum diajukan atau sudah diputuskan.');
      await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'report_card.return', entityType: 'report_card', entityId: id, requestId: requestMeta(req).requestId, metadata: { reason: input.reason } }, tx);
    });
  }

  @Get('subject-descriptions')
  @RequireActiveRole('TEACHER')
  async descriptions(@CurrentAuth() auth: AuthContext, @Query({ schema: DescriptionInput.pick({ teachingAssignmentId: true }) }) query: { teachingAssignmentId: string }) {
    const { assignment, date } = await this.descriptionScope(auth, query.teachingAssignmentId);
    const [roster, reports] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { classGroupId: assignment.classGroupId, ...activeOn(date) },
        select: { studentId: true, student: { select: { nis: true, person: { select: { fullName: true } } } } },
        orderBy: { student: { person: { fullName: 'asc' } } },
      }),
      this.prisma.reportCard.findMany({
        where: { schoolId: auth.schoolId, termId: assignment.termId, student: { enrollments: { some: { classGroupId: assignment.classGroupId, ...activeOn(date) } } } },
        select: {
          studentId: true, status: true, classGroupId: true,
          subjects: { where: { subjectId: assignment.subjectId }, select: { highestAchievement: true, needsImprovement: true } },
        },
      }),
    ]);
    const byStudent = new Map(reports.map((report) => [report.studentId, report]));
    return roster.map(({ studentId, student }) => {
      const report = byStudent.get(studentId);
      const ownClass = report?.classGroupId === assignment.classGroupId;
      return {
        studentId, nis: student.nis, fullName: student.person.fullName,
        editable: !report || (ownClass && (report.status === 'DRAFT' || report.status === 'RETURNED')),
        description: ownClass ? report.subjects[0] ?? null : null,
      };
    });
  }

  /** FR-15.3: capaian pembelajaran aktif mapel × tingkat penugasan, untuk dipilih saat menulis deskripsi rapor. */
  @Get('subject-outcomes')
  @RequireActiveRole('TEACHER')
  async outcomes(@CurrentAuth() auth: AuthContext, @Query({ schema: DescriptionInput.pick({ teachingAssignmentId: true }) }) query: { teachingAssignmentId: string }) {
    if (!auth.personId) throw new NotFoundException('Penugasan tidak ditemukan.');
    const assignment = await this.prisma.teachingAssignment.findFirst({
      where: { id: query.teachingAssignmentId, schoolId: auth.schoolId, employee: { personId: auth.personId } },
      select: { subjectId: true, classGroup: { select: { gradeLevelId: true } } },
    });
    if (!assignment) throw new NotFoundException('Penugasan tidak ditemukan.');
    return this.prisma.learningOutcome.findMany({
      where: { schoolId: auth.schoolId, subjectId: assignment.subjectId, gradeLevelId: assignment.classGroup.gradeLevelId, status: 'ACTIVE' },
      select: { id: true, code: true, description: true },
      orderBy: { code: 'asc' },
    });
  }

  private async descriptionScope(auth: AuthContext, teachingAssignmentId: string) {
    if (!auth.personId) throw new NotFoundException('Penugasan tidak ditemukan.');
    const assignment = await this.prisma.teachingAssignment.findFirst({
      where: { id: teachingAssignmentId, schoolId: auth.schoolId, employee: { personId: auth.personId } },
      select: { classGroupId: true, subjectId: true, termId: true, term: { select: { startDate: true, endDate: true } } },
    });
    if (!assignment) throw new NotFoundException('Penugasan tidak ditemukan.');
    const school = await this.prisma.school.findUniqueOrThrow({ where: { id: auth.schoolId }, select: { timezone: true } });
    const today = todayIn(school.timezone);
    if (today < fromDbDate(assignment.term.startDate)) throw conflict('Semester belum dimulai.');
    return { assignment, date: today > fromDbDate(assignment.term.endDate) ? fromDbDate(assignment.term.endDate) : today };
  }

  @Put('subject-description')
  @RequireActiveRole('TEACHER')
  async describe(@CurrentAuth() auth: AuthContext, @Body({ schema: DescriptionInput }) input: z.infer<typeof DescriptionInput>) {
    const { assignment, date } = await this.descriptionScope(auth, input.teachingAssignmentId);
    return this.prisma.$transaction(async (tx) => {
      const enrollment = await tx.enrollment.findFirst({
        where: { studentId: input.studentId, classGroupId: assignment.classGroupId, ...activeOn(date) },
        select: { id: true },
      });
      if (!enrollment) throw new NotFoundException('Siswa tidak ditemukan dalam rombel penugasan.');
      const report = await tx.reportCard.upsert({
        where: { studentId_termId: { studentId: input.studentId, termId: assignment.termId } },
        update: {},
        create: { schoolId: auth.schoolId, studentId: input.studentId, termId: assignment.termId, classGroupId: assignment.classGroupId },
      });
      const [locked] = await tx.$queryRaw<{ status: string }[]>`
        SELECT status FROM report_card WHERE id = ${report.id}::uuid FOR UPDATE
      `;
      if (report.schoolId !== auth.schoolId || report.classGroupId !== assignment.classGroupId
        || !locked || (locked.status !== 'DRAFT' && locked.status !== 'RETURNED')) throw conflict('Deskripsi rapor tidak dapat diubah pada status atau rombel ini.');
      const data = { highestAchievement: input.highestAchievement, needsImprovement: input.needsImprovement, updatedById: auth.userId };
      return tx.reportCardSubject.upsert({
        where: { reportCardId_subjectId: { reportCardId: report.id, subjectId: assignment.subjectId } },
        update: data,
        create: { ...data, reportCardId: report.id, subjectId: assignment.subjectId },
      });
    });
  }

  @Get('preview')
  @RequireActiveRole('TEACHER')
  async preview(@CurrentAuth() auth: AuthContext, @Query({ schema: PreviewQuery }) query: z.infer<typeof PreviewQuery>) {
    return this.buildPreview(auth, query, this.prisma);
  }

  @Get('homeroom-options')
  @RequireActiveRole('TEACHER')
  async homeroomOptions(@CurrentAuth() auth: AuthContext) {
    if (!auth.personId) return [];
    const school = await this.prisma.school.findUniqueOrThrow({ where: { id: auth.schoolId }, select: { timezone: true } });
    const date = toDbDate(todayIn(school.timezone));
    const groups = await this.prisma.classGroup.findMany({
      where: {
        schoolId: auth.schoolId,
        homeroomAssignments: { some: {
          employee: { personId: auth.personId }, validFrom: { lte: date },
          OR: [{ validTo: null }, { validTo: { gte: date } }],
        } },
      },
      select: { id: true, code: true, academicYear: { select: {
        name: true, terms: { where: { startDate: { lte: date } }, select: { id: true, name: true }, orderBy: { startDate: 'desc' } },
      } } },
      orderBy: { code: 'asc' },
    });
    return groups.flatMap((group) => group.academicYear.terms.map((term) => ({
      classGroupId: group.id, termId: term.id, label: `${group.code} · ${term.name} · ${group.academicYear.name}`,
    })));
  }

  private async buildPreview(auth: AuthContext, query: z.infer<typeof PreviewQuery>, db: Prisma.TransactionClient, studentId?: string, reviewer = false) {
    if (!reviewer && !auth.personId) throw new NotFoundException('Rombel binaan tidak ditemukan.');
    const school = await db.school.findUniqueOrThrow({ where: { id: auth.schoolId }, select: { timezone: true, name: true, npsn: true, address: true } });
    const today = todayIn(school.timezone);
    const now = toDbDate(today);
    const group = await db.classGroup.findFirst({
      where: {
        id: query.classGroupId, schoolId: auth.schoolId,
        ...(!reviewer && { homeroomAssignments: { some: {
          employee: { personId: auth.personId! }, validFrom: { lte: now },
          OR: [{ validTo: null }, { validTo: { gte: now } }],
        } } }),
      },
      select: { id: true, code: true, academicYearId: true },
    });
    if (!group) throw new NotFoundException('Rombel binaan tidak ditemukan.');
    const term = await db.term.findFirst({
      where: { id: query.termId, academicYearId: group.academicYearId, startDate: { lte: now } },
      select: { id: true, name: true, startDate: true, endDate: true },
    });
    if (!term) throw new NotFoundException('Semester tidak tersedia untuk rombel ini.');

    const rosterDate = now > term.endDate ? fromDbDate(term.endDate) : today;
    const [roster, assignments, reports] = await Promise.all([
      db.enrollment.findMany({
        where: { classGroupId: group.id, studentId, ...activeOn(rosterDate) },
        select: { studentId: true, student: { select: { nis: true, person: { select: { fullName: true } } } } },
        orderBy: { student: { person: { fullName: 'asc' } } },
      }),
      db.teachingAssignment.findMany({
        where: { classGroupId: group.id, termId: term.id, schoolId: auth.schoolId },
        select: { id: true, subject: { select: { id: true, name: true } } },
        orderBy: [{ subject: { name: 'asc' } }, { id: 'asc' }],
      }),
      db.reportCard.findMany({
        where: { classGroupId: group.id, termId: term.id, schoolId: auth.schoolId, studentId },
        select: { id: true, studentId: true, status: true, homeroomNote: true, returnNote: true, subjects: true },
      }),
    ]);
    const byStudent = new Map(reports.map((report) => [report.studentId, report]));
    const attendance = await db.studentAttendanceRecord.groupBy({
      by: ['studentId', 'status'],
      where: {
        studentId: { in: roster.map((row) => row.studentId) }, status: { not: null },
        session: { schoolId: auth.schoolId, status: { not: 'CANCELLED' }, sessionDate: { gte: term.startDate, lte: toDbDate(rosterDate) } },
      },
      _count: { _all: true },
    });
    const attendanceByStudent = new Map<string, Partial<Record<NonNullable<(typeof attendance)[number]['status']>, number>>>();
    for (const row of attendance) {
      if (!row.status) continue;
      const counts = attendanceByStudent.get(row.studentId) ?? {};
      counts[row.status] = row._count._all;
      attendanceByStudent.set(row.studentId, counts);
    }
    const results = await Promise.all(assignments.map(async (assignment) => {
      const [scheme] = await this.assessments.aggregateForAssignment(auth.schoolId, assignment.id, db);
      return { subject: assignment.subject, grades: new Map(scheme?.students.map((row) => [row.studentId, row.finalScore])) };
    }));
    const subjectIds = [...new Set(results.map(({ subject }) => subject.id))];
    return {
      school: { name: school.name, npsn: school.npsn, address: school.address }, timezone: school.timezone,
      classGroup: { id: group.id, code: group.code }, term: { id: term.id, name: term.name }, rosterDate,
      students: roster.map(({ studentId, student }) => {
        const report = byStudent.get(studentId);
        const subjects = subjectIds.map((subjectId) => {
          const sources = results.filter((result) => result.subject.id === subjectId);
          const scores = sources.flatMap((source) => {
            const score = source.grades.get(studentId);
            return score === null || score === undefined ? [] : [score];
          });
          const description = report?.subjects.find((item) => item.subjectId === subjectId);
          return {
            id: subjectId, name: sources[0]!.subject.name, score: scores.length === 1 ? scores[0] : null,
            highestAchievement: description?.highestAchievement ?? null,
            needsImprovement: description?.needsImprovement ?? null,
            issues: [
              ...(scores.length === 0 ? ['GRADE_INCOMPLETE'] : scores.length > 1 ? ['GRADE_AMBIGUOUS'] : []),
              ...(!description?.highestAchievement?.trim() || !description.needsImprovement?.trim() ? ['DESCRIPTION_MISSING'] : []),
            ],
          };
        });
        return {
          studentId, fullName: student.person.fullName, nis: student.nis,
          reportId: report?.id ?? null, status: report?.status ?? 'DRAFT', homeroomNote: report?.homeroomNote ?? null, returnNote: report?.returnNote ?? null,
          attendance: { PRESENT: 0, EXCUSED: 0, SICK: 0, ABSENT: 0, LATE: 0, ...attendanceByStudent.get(studentId) },
          subjects, ready: subjects.length > 0 && subjects.every((subject) => subject.issues.length === 0),
        };
      }),
    };
  }
}
