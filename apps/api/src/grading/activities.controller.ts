import { createHash } from 'node:crypto';
import { Body, Controller, Get, HttpCode, NotFoundException, Param, Post, Query, Req, Res, StreamableFile, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ActivityStatusSchema, CreateActivitySchema, PortalGradesQuerySchema, SubmitActivitySchema, UuidParamSchema } from '@smart-school/contracts';
import type { Request, Response } from 'express';
import type { z } from 'zod';
import { ScopeService } from '../academics/scope.service.js';
import { activeOn } from '../academics/classes.service.js';
import type { AuthContext } from '../auth/auth.types.js';
import { CurrentAuth, RequireActiveRole } from '../auth/decorators.js';
import { conflict, validationFailed } from '../common/api-exception.filter.js';
import { safeFileName, sniffMime, type UploadedFile as Upload } from '../documents/documents.service.js';
import { StorageService } from '../documents/storage.service.js';
import { requestMeta } from '../common/request-meta.js';
import { todayIn } from '../common/school-time.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AssessmentsService } from './assessments.service.js';

@Controller('activities')
export class ActivitiesController {
  constructor(private readonly prisma: PrismaService, private readonly assessments: AssessmentsService, private readonly scope: ScopeService, private readonly storage: StorageService) {}

  @Post()
  @RequireActiveRole('TEACHER')
  async create(@CurrentAuth() auth: AuthContext, @Body({ schema: CreateActivitySchema }) input: z.infer<typeof CreateActivitySchema>, @Req() req: Request) {
    const assessment = await this.assessments.create(auth, input, requestMeta(req), input);
    return this.prisma.learningActivity.findFirstOrThrow({ where: { assessment: { id: assessment.id } }, include: { assessment: { select: { id: true } } } });
  }

  @Get('teaching')
  @RequireActiveRole('TEACHER')
  teaching(@CurrentAuth() auth: AuthContext) {
    if (!auth.personId) return [];
    return this.prisma.learningActivity.findMany({
      where: { schoolId: auth.schoolId, teachingAssignment: { employee: { personId: auth.personId } } },
      include: { assessment: { select: { id: true } } },
      orderBy: { dueAt: 'desc' },
    });
  }

  @Post(':id/status')
  @HttpCode(204)
  @RequireActiveRole('TEACHER')
  async status(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Body({ schema: ActivityStatusSchema }) input: z.infer<typeof ActivityStatusSchema>) {
    if (!auth.personId) throw new NotFoundException('Kegiatan tidak ditemukan.');
    const where = { id, schoolId: auth.schoolId, teachingAssignment: { employee: { personId: auth.personId } } };
    const activity = await this.prisma.learningActivity.findFirst({ where, select: { status: true, publishedAt: true, teachingAssignment: { select: { classGroupId: true } } } });
    if (!activity) throw new NotFoundException('Kegiatan tidak ditemukan.');
    const allowed = input.status === 'PUBLISHED' ? activity.status === 'DRAFT'
      : input.status === 'CLOSED' ? activity.status === 'PUBLISHED'
      : activity.status === 'DRAFT' || activity.status === 'PUBLISHED' || activity.status === 'CLOSED';
    if (!allowed) throw conflict('Perubahan status kegiatan tidak berlaku.');
    const date = input.status === 'PUBLISHED' ? await this.schoolDate(auth.schoolId) : null;
    await this.prisma.$transaction(async (tx) => {
      const result = await tx.learningActivity.updateMany({
        where: { ...where, status: activity.status },
        data: { status: input.status, publishedAt: date ? new Date() : activity.publishedAt },
      });
      if (!result.count) throw conflict('Status kegiatan sudah berubah.');
      if (date) {
        const roster = await tx.enrollment.findMany({
          where: { classGroupId: activity.teachingAssignment.classGroupId, ...activeOn(date) },
          select: { studentId: true },
        });
        await this.assessments.notifyPublication(tx, auth.schoolId, id, roster.map((row) => row.studentId), 'activities');
      }
    });
  }

  @Get(':id/submissions')
  @RequireActiveRole('TEACHER')
  async submissions(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string) {
    if (!auth.personId) throw new NotFoundException('Kegiatan tidak ditemukan.');
    const activity = await this.prisma.learningActivity.findFirst({
      where: { id, schoolId: auth.schoolId, teachingAssignment: { employee: { personId: auth.personId } } },
      select: {
        assessment: { select: { id: true } },
        submissions: {
          select: {
            studentId: true, status: true, submittedAt: true,
            student: { select: { nis: true, person: { select: { fullName: true } } } },
            versions: { orderBy: { versionNo: 'desc' }, select: { id: true, originalName: true, versionNo: true, submittedAt: true, late: true, text: true } },
          },
        },
      },
    });
    if (!activity) throw new NotFoundException('Kegiatan tidak ditemukan.');
    return activity;
  }

  @Get(':id/submissions/:versionId/file')
  @RequireActiveRole('TEACHER')
  async file(
    @CurrentAuth() auth: AuthContext,
    @Param('id', { schema: UuidParamSchema }) id: string,
    @Param('versionId', { schema: UuidParamSchema }) versionId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!auth.personId) throw new NotFoundException('Lampiran tidak ditemukan.');
    const version = await this.prisma.submissionVersion.findFirst({
      where: { id: versionId, submission: { activity: { id, schoolId: auth.schoolId, teachingAssignment: { employee: { personId: auth.personId } } } } },
      select: { storageKey: true, mimeType: true, originalName: true },
    });
    if (!version?.storageKey || !version.mimeType || !version.originalName) throw new NotFoundException('Lampiran tidak ditemukan.');
    const file = await this.storage.open(version.storageKey);
    res.set({
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    });
    return new StreamableFile(file.stream, {
      type: version.mimeType, length: file.size, disposition: `attachment; filename*=UTF-8''${encodeURIComponent(version.originalName)}`,
    });
  }

  @Get('portal')
  @RequireActiveRole('STUDENT', 'GUARDIAN')
  async portal(@CurrentAuth() auth: AuthContext, @Query({ schema: PortalGradesQuerySchema }) query: z.infer<typeof PortalGradesQuerySchema>) {
    const studentId = await this.scope.portalStudentId(auth, 'academic', query.studentId);
    const rows = await this.prisma.learningActivity.findMany({
      where: {
        schoolId: auth.schoolId, status: { in: ['PUBLISHED', 'CLOSED'] }, opensAt: { lte: new Date() },
        teachingAssignment: { classGroup: { enrollments: { some: { studentId } } } },
      },
      select: {
        id: true, title: true, kind: true, instructions: true, dueAt: true, status: true,
        opensAt: true, allowLate: true, allowResubmit: true, acceptsSubmissions: true,
        teachingAssignment: { select: { classGroupId: true, subject: { select: { name: true } } } },
        submissions: { where: { studentId }, select: { status: true, submittedAt: true, latestVersionNo: true } },
      },
      orderBy: { dueAt: 'desc' },
    });
    const date = await this.schoolDate(auth.schoolId);
    const current = await this.scope.classOf(studentId, date);
    const now = new Date();
    return rows.filter((row) => row.teachingAssignment.classGroupId === current?.id || row.submissions.length > 0).map((row) => ({
      ...row,
      canSubmit: auth.activeRole === 'STUDENT' && row.teachingAssignment.classGroupId === current?.id
        && row.status === 'PUBLISHED' && row.acceptsSubmissions
        && (row.submissions.length ? row.allowResubmit && now <= row.dueAt : row.allowLate || now <= row.dueAt),
    }));
  }

  @Post(':id/submissions')
  @HttpCode(200)
  @RequireActiveRole('STUDENT')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  async submit(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Body({ schema: SubmitActivitySchema }) input: z.infer<typeof SubmitActivitySchema>, @UploadedFile() file?: Upload) {
    const text = input.text || null;
    if (!text && !file) throw validationFailed('Isi jawaban atau pilih lampiran.', { text: ['Jawaban atau lampiran wajib diisi.'] });
    const mimeType = file ? sniffMime(file.buffer) : null;
    if (file && !mimeType) throw validationFailed('Jenis lampiran tidak didukung.', { file: ['Hanya PDF, JPG, atau PNG.'] });
    const sha256 = file ? createHash('sha256').update(file.buffer).digest('hex') : null;
    const studentId = await this.scope.portalStudentId(auth, 'academic');
    const current = await this.scope.classOf(studentId, await this.schoolDate(auth.schoolId));
    let storageKey: string | null = null;
    try {
      return await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM learning_activity WHERE id = ${id}::uuid AND "schoolId" = ${auth.schoolId}::uuid FOR UPDATE`;
      const activity = await tx.learningActivity.findFirst({
        where: { id, schoolId: auth.schoolId, status: { in: ['PUBLISHED', 'CLOSED'] } },
        include: { teachingAssignment: { select: { classGroupId: true } } },
      });
      if (!activity || activity.teachingAssignment.classGroupId !== current?.id) throw new NotFoundException('Kegiatan tidak ditemukan.');
      const existing = await tx.submission.findUnique({ where: { activityId_studentId: { activityId: id, studentId } } });
      if (existing) {
        const prior = await tx.submissionVersion.findUnique({
          where: { submissionId_idempotencyKey: { submissionId: existing.id, idempotencyKey: input.idempotencyKey } },
          select: { versionNo: true, submittedAt: true, late: true, text: true, sha256: true },
        });
        if (prior) {
          if (prior.text !== text || prior.sha256 !== sha256) throw conflict('Kunci kiriman sudah dipakai untuk isi lain.');
          return { versionNo: prior.versionNo, submittedAt: prior.submittedAt, late: prior.late };
        }
      }
      const submittedAt = new Date();
      const late = submittedAt > activity.dueAt;
      if (activity.status !== 'PUBLISHED' || !activity.acceptsSubmissions || submittedAt < activity.opensAt || (late && !activity.allowLate)) throw conflict('Kegiatan tidak menerima kiriman saat ini.');
      if (existing && (!activity.allowResubmit || late)) throw conflict('Kirim ulang tidak tersedia.');
      if (file) storageKey = await this.storage.put(file.buffer);
      const status = late ? 'LATE' : 'ON_TIME';
      const submission = existing
        ? await tx.submission.update({ where: { id: existing.id }, data: { latestVersionNo: { increment: 1 }, status, submittedAt } })
        : await tx.submission.create({ data: { activityId: id, studentId, status, submittedAt } });
      return tx.submissionVersion.create({
        data: {
          submissionId: submission.id, versionNo: submission.latestVersionNo, submittedAt, late, text, idempotencyKey: input.idempotencyKey,
          storageKey, mimeType, sha256, originalName: file && mimeType ? safeFileName(file.originalname, mimeType) : null, sizeBytes: file?.size,
        },
        select: { versionNo: true, submittedAt: true, late: true },
      });
      });
    } catch (error) {
      if (storageKey) await this.storage.remove(storageKey);
      throw error;
    }
  }

  private async schoolDate(schoolId: string) {
    const school = await this.prisma.school.findUniqueOrThrow({ where: { id: schoolId }, select: { timezone: true } });
    return todayIn(school.timezone);
  }
}
