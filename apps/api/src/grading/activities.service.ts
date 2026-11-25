import { createHash } from 'node:crypto';
import type { Readable } from 'node:stream';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ActivityDetail, ActivitySchema, ActivityView, GradeCell, PortalActivity, SubmissionState, SubmissionVersionView, SubmitSchema, UpdateActivitySchema } from '@smart-school/contracts';
import type { z } from 'zod';
import { activeOn, validOn } from '../academics/classes.service.js';
import { ScopeService } from '../academics/scope.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AuthContext } from '../auth/auth.types.js';
import { conflict, validationFailed } from '../common/api-exception.filter.js';
import { toDbDate } from '../common/dates.js';
import type { RequestMeta } from '../common/request-meta.js';
import { localParts, todayIn } from '../common/school-time.js';
import type { Env } from '../config/env.js';
import { safeFileName, sniffMime, type UploadedFile } from '../documents/files.js';
import { StorageService } from '../documents/storage.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { GradebookService } from './gradebook.service.js';
import { PortalGradesService } from './portal-grades.service.js';
import { SchemesService } from './schemes.service.js';

const INCLUDE = {
  teachingAssignment: {
    select: {
      id: true,
      employeeId: true,
      classGroupId: true,
      subject: { select: { code: true, name: true } },
      classGroup: { select: { id: true, code: true } },
      employee: { select: { person: { select: { fullName: true } } } },
    },
  },
  assessment: { select: { id: true, status: true, component: { select: { name: true } }, entries: { select: { studentId: true, state: true, score: true, feedback: true, versionNo: true } } } },
  submissions: { include: { versions: { orderBy: { versionNo: 'asc' } } } },
} satisfies Prisma.LearningActivityInclude;
type Row = Prisma.LearningActivityGetPayload<{ include: typeof INCLUDE }>;
type SubmissionRowDb = Row['submissions'][number];

const fileUrl = (submissionId: string, versionNo: number) => `/api/v1/submissions/${submissionId}/versions/${versionNo}/file`;

function versionViews(sub: SubmissionRowDb | undefined): SubmissionVersionView[] {
  return (sub?.versions ?? []).map((v) => ({
    versionNo: v.versionNo,
    text: v.text,
    file: v.storageKey ? { name: v.originalName ?? 'berkas', mimeType: v.mimeType ?? 'application/octet-stream', sizeBytes: v.sizeBytes ?? 0, url: fileUrl(sub!.id, v.versionNo) } : null,
    late: v.late,
    submittedAt: v.submittedAt.toISOString(),
  }));
}

const stateOf = (sub: SubmissionRowDb | undefined): SubmissionState => (!sub ? 'NOT_SUBMITTED' : sub.status === 'LATE' ? 'LATE' : 'ON_TIME');

/**
 * Tugas dan pengumpulan (PRD R2 E12). Guru penugasan membuat dan mengelola tugas; tugas bisa tertaut ke satu
 * penilaian (nilai diisi lewat buku nilai). Siswa mengirim teks/berkas sebagai versi; kiriman setelah tenggat
 * ditandai terlambat dan hanya diterima bila tugas mengizinkan. Berkas disimpan privat dan setiap unduhan tercatat.
 */
@Injectable()
export class ActivitiesService {
  private readonly maxBytes: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly scope: ScopeService,
    private readonly gradebook: GradebookService,
    private readonly schemes: SchemesService,
    private readonly storage: StorageService,
    private readonly portal: PortalGradesService,
    config: ConfigService<Env, true>,
  ) {
    this.maxBytes = config.get('MAX_UPLOAD_MB', { infer: true }) * 1024 * 1024;
  }

  private async tz(schoolId: string) {
    return (await this.prisma.school.findUniqueOrThrow({ where: { id: schoolId }, select: { timezone: true } })).timezone;
  }

  private async enrolled(classGroupId: string, schoolId: string) {
    const today = todayIn(await this.tz(schoolId));
    return this.prisma.enrollment.findMany({
      where: { classGroupId, ...activeOn(today) },
      select: { student: { select: { id: true, nis: true, person: { select: { fullName: true } } } } },
      orderBy: { student: { person: { fullName: 'asc' } } },
    });
  }

  private view(r: Row, studentIds: string[]): ActivityView {
    const subs = new Map(r.submissions.map((s) => [s.studentId, s]));
    const counts = { total: studentIds.length, onTime: 0, late: 0, notSubmitted: 0 };
    for (const id of studentIds) {
      const st = stateOf(subs.get(id));
      if (st === 'ON_TIME') counts.onTime++;
      else if (st === 'LATE') counts.late++;
      else counts.notSubmitted++;
    }
    const ta = r.teachingAssignment;
    return {
      id: r.id,
      kind: r.kind,
      title: r.title,
      instructions: r.instructions,
      opensAt: r.opensAt.toISOString(),
      dueAt: r.dueAt.toISOString(),
      allowLate: r.allowLate,
      allowResubmit: r.allowResubmit,
      acceptsSubmissions: r.acceptsSubmissions,
      status: r.status,
      teachingAssignment: { id: ta.id, subject: ta.subject, classGroup: ta.classGroup, teacher: ta.employee.person.fullName },
      assessment: r.assessment ? { id: r.assessment.id, status: r.assessment.status, component: r.assessment.component.name } : null,
      counts,
    };
  }

  private async load(auth: AuthContext, id: string) {
    const r = await this.prisma.learningActivity.findFirst({ where: { id, schoolId: auth.schoolId }, include: INCLUDE });
    if (!r) throw new NotFoundException('Tugas tidak ditemukan.');
    return r;
  }

  // ───────────── Guru ─────────────

  async create(auth: AuthContext, input: z.infer<typeof ActivitySchema>, meta: RequestMeta) {
    const ta = await this.gradebook.loadAssignment(auth, input.teachingAssignmentId);
    await this.gradebook.requireTeacher(auth, ta);
    if (input.componentId) {
      const scheme = await this.schemes.published(ta.termId, ta.subjectId, ta.classGroup.gradeLevelId);
      if (!scheme?.components.some((c) => c.id === input.componentId)) throw validationFailed('Komponen harus dari skema nilai yang berlaku.', { componentId: ['Pilih komponen dari skema berlaku.'] });
    }
    const tz = await this.tz(auth.schoolId);
    const dueAt = new Date(input.dueAt);
    const row = await this.prisma.$transaction(async (tx) => {
      const a = await tx.learningActivity.create({
        data: {
          schoolId: auth.schoolId,
          teachingAssignmentId: ta.id,
          kind: input.kind,
          title: input.title,
          instructions: input.instructions,
          opensAt: new Date(input.opensAt),
          dueAt,
          allowLate: input.allowLate,
          allowResubmit: input.allowResubmit,
          acceptsSubmissions: input.acceptsSubmissions,
          createdById: auth.userId,
        },
      });
      if (input.componentId) {
        await tx.assessment.create({
          data: { schoolId: auth.schoolId, teachingAssignmentId: ta.id, componentId: input.componentId, activityId: a.id, title: input.title, assessedOn: toDbDate(localParts(dueAt, tz).date), createdById: auth.userId },
        });
      }
      await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'activity.create', entityType: 'learning_activity', entityId: a.id, requestId: meta.requestId, metadata: { title: input.title, dueAt: input.dueAt, componentId: input.componentId ?? null } }, tx);
      return a;
    });
    return { id: row.id };
  }

  async update(auth: AuthContext, id: string, input: z.infer<typeof UpdateActivitySchema>, meta: RequestMeta) {
    const r = await this.load(auth, id);
    await this.gradebook.requireTeacher(auth, r.teachingAssignment);
    if (r.status === 'CANCELLED') throw conflict('Tugas sudah dibatalkan.');
    await this.prisma.$transaction(async (tx) => {
      await tx.learningActivity.update({ where: { id }, data: { ...input, opensAt: new Date(input.opensAt), dueAt: new Date(input.dueAt) } });
      if (r.assessment && r.assessment.status === 'DRAFT') await tx.assessment.update({ where: { id: r.assessment.id }, data: { title: input.title } });
      await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'activity.update', entityType: 'learning_activity', entityId: id, requestId: meta.requestId, metadata: { status: r.status, before: { dueAt: r.dueAt.toISOString(), allowLate: r.allowLate }, after: input } }, tx);
    });
  }

  async setStatus(auth: AuthContext, id: string, to: 'PUBLISHED' | 'CLOSED' | 'CANCELLED', meta: RequestMeta) {
    const r = await this.load(auth, id);
    await this.gradebook.requireTeacher(auth, r.teachingAssignment);
    const allowed: Record<typeof to, string[]> = { PUBLISHED: ['DRAFT'], CLOSED: ['PUBLISHED'], CANCELLED: ['DRAFT', 'PUBLISHED'] };
    if (!allowed[to].includes(r.status)) throw conflict(`Tugas berstatus ${r.status.toLowerCase()} tidak dapat diubah ke status itu.`);
    if (to === 'CANCELLED' && r.assessment?.status === 'PUBLISHED') throw conflict('Nilai tugas ini sudah terbit; tugas tidak dapat dibatalkan.');
    await this.prisma.learningActivity.update({ where: { id }, data: { status: to, ...(to === 'PUBLISHED' ? { publishedAt: new Date() } : {}) } });
    await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: `activity.${to.toLowerCase()}`, entityType: 'learning_activity', entityId: id, requestId: meta.requestId });
    if (to === 'PUBLISHED') await this.portal.notifyActivityPublished(id);
  }

  async list(auth: AuthContext, taId: string): Promise<ActivityView[]> {
    const ta = await this.gradebook.loadAssignment(auth, taId);
    await this.gradebook.checkAccess(auth, ta);
    const [rows, students] = await Promise.all([
      this.prisma.learningActivity.findMany({ where: { teachingAssignmentId: taId }, include: INCLUDE, orderBy: [{ dueAt: 'desc' }] }),
      this.enrolled(ta.classGroupId, auth.schoolId),
    ]);
    return rows.map((r) => this.view(r, students.map((s) => s.student.id)));
  }

  async detail(auth: AuthContext, id: string): Promise<ActivityDetail> {
    const r = await this.load(auth, id);
    const { canEdit } = await this.gradebook.checkAccess(auth, r.teachingAssignment);
    const students = (await this.enrolled(r.teachingAssignment.classGroupId, auth.schoolId)).map((e) => e.student);
    // Siswa yang sudah mengumpulkan lalu pindah kelas tetap ditampilkan.
    const extra = r.submissions.map((s) => s.studentId).filter((id) => !students.some((x) => x.id === id));
    if (extra.length) students.push(...(await this.prisma.student.findMany({ where: { id: { in: extra } }, select: { id: true, nis: true, person: { select: { fullName: true } } } })));
    const subs = new Map(r.submissions.map((s) => [s.studentId, s]));
    const grades = new Map((r.assessment?.entries ?? []).map((e) => [e.studentId, e]));
    return {
      ...this.view(r, students.map((s) => s.id)),
      canEdit,
      submissions: students.map((s) => {
        const sub = subs.get(s.id);
        const g = grades.get(s.id);
        return {
          studentId: s.id,
          fullName: s.person.fullName,
          nis: s.nis,
          state: stateOf(sub),
          submittedAt: sub?.submittedAt.toISOString() ?? null,
          versions: versionViews(sub),
          grade: g ? { state: g.state, score: g.score, feedback: g.feedback, versionNo: g.versionNo } : null,
        };
      }),
    };
  }

  // ───────────── Siswa dan wali ─────────────

  private portalView(r: Row, studentId: string, now: Date): PortalActivity {
    const sub = r.submissions.find((s) => s.studentId === studentId);
    const g = r.assessment?.status === 'PUBLISHED' ? r.assessment.entries.find((e) => e.studentId === studentId) : undefined;
    const grade: GradeCell | null = g ? { state: g.state, score: g.score, feedback: g.feedback, versionNo: g.versionNo } : null;
    const blockedReason = this.blocked(r, sub, now);
    return {
      ...this.view(r, [studentId]),
      mine: { state: stateOf(sub), submittedAt: sub?.submittedAt.toISOString() ?? null, versions: versionViews(sub) },
      grade,
      canSubmit: blockedReason === null,
      blockedReason,
    };
  }

  /** Alasan siswa tidak bisa mengirim saat ini; null = boleh. */
  private blocked(r: { status: string; acceptsSubmissions: boolean; opensAt: Date; dueAt: Date; allowLate: boolean; allowResubmit: boolean }, sub: { id: string } | undefined, now: Date): string | null {
    if (r.status !== 'PUBLISHED') return r.status === 'CLOSED' ? 'Tugas sudah ditutup guru.' : 'Tugas tidak tersedia.';
    if (!r.acceptsSubmissions) return 'Tugas ini dikerjakan di luar aplikasi.';
    if (now < r.opensAt) return 'Tugas belum dibuka.';
    const late = now > r.dueAt;
    if (sub && (!r.allowResubmit || late)) return late ? 'Tenggat sudah lewat; kiriman tidak bisa diubah.' : 'Tugas ini tidak mengizinkan kirim ulang.';
    if (late && !r.allowLate) return 'Tenggat sudah lewat dan tugas ini tidak menerima kiriman terlambat.';
    return null;
  }

  /** Tugas terbit/ditutup untuk rombel siswa (atau anak wali) hari ini. */
  async portalList(auth: AuthContext, studentId?: string): Promise<PortalActivity[]> {
    const sid = await this.scope.portalStudentId(auth, 'academic', studentId);
    const today = todayIn(await this.tz(auth.schoolId));
    const cls = await this.scope.classOf(sid, today);
    if (!cls) return [];
    const rows = await this.prisma.learningActivity.findMany({
      where: { schoolId: auth.schoolId, status: { in: ['PUBLISHED', 'CLOSED'] }, teachingAssignment: { classGroupId: cls.id } },
      include: { ...INCLUDE, submissions: { where: { studentId: sid }, include: { versions: { orderBy: { versionNo: 'asc' } } } } },
      orderBy: { dueAt: 'asc' },
      take: 200,
    });
    const now = new Date();
    return rows.map((r) => this.portalView(r, sid, now));
  }

  async portalDetail(auth: AuthContext, id: string, studentId?: string): Promise<PortalActivity> {
    const sid = await this.scope.portalStudentId(auth, 'academic', studentId);
    const r = await this.load(auth, id);
    const today = todayIn(await this.tz(auth.schoolId));
    const cls = await this.scope.classOf(sid, today);
    if (!['PUBLISHED', 'CLOSED'].includes(r.status) || cls?.id !== r.teachingAssignment.classGroupId) throw new NotFoundException('Tugas tidak ditemukan.');
    return this.portalView(r, sid, new Date());
  }

  /** Pengumpulan oleh siswa. Unggahan gagal tidak membuat status terkumpul (berkas disimpan sebelum transaksi). */
  async submit(auth: AuthContext, id: string, input: z.infer<typeof SubmitSchema>, file: UploadedFile | undefined, meta: RequestMeta) {
    if (auth.activeRole !== 'STUDENT') throw new ForbiddenException('Pengumpulan tugas hanya oleh siswa.');
    const me = await this.scope.student(auth);
    if (!me) throw new ForbiddenException('Akun ini tidak terhubung ke data siswa.');
    const r = await this.load(auth, id);
    const today = todayIn(await this.tz(auth.schoolId));
    if (!(await this.prisma.enrollment.findFirst({ where: { studentId: me.id, classGroupId: r.teachingAssignment.classGroupId, ...validOn(today) } }))) {
      throw new ForbiddenException('Tugas ini bukan untuk rombel Anda.');
    }
    const existing = r.submissions.find((s) => s.studentId === me.id);
    // Idempoten: kirim ulang permintaan yang sama mengembalikan versi yang sudah ada.
    const same = existing?.versions.find((v) => v.idempotencyKey === input.idempotencyKey);
    if (same) return { submissionId: existing!.id, versionNo: same.versionNo, late: same.late, duplicate: true };
    const now = new Date();
    const reason = this.blocked(r, existing, now);
    if (reason) throw conflict(reason);
    const text = input.text?.trim() || null;
    if (!text && !file) throw validationFailed('Isi jawaban atau lampirkan berkas.', { text: ['Kirim teks atau berkas.'] });

    let stored: { storageKey: string; originalName: string; mimeType: string; sizeBytes: number; sha256: string } | null = null;
    if (file) {
      if (file.size > this.maxBytes) throw validationFailed(`Berkas maksimal ${this.maxBytes / 1024 / 1024} MB.`, { file: ['Berkas terlalu besar.'] });
      const mimeType = sniffMime(file.buffer);
      if (!mimeType) throw validationFailed('Jenis berkas tidak didukung.', { file: ['Hanya PDF, JPG, atau PNG.'] });
      stored = { storageKey: await this.storage.put(file.buffer), originalName: safeFileName(file.originalname, mimeType, 'tugas'), mimeType, sizeBytes: file.size, sha256: createHash('sha256').update(file.buffer).digest('hex') };
    }
    const late = now > r.dueAt;
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const sub = existing
          ? await tx.submission.update({ where: { id: existing.id }, data: { latestVersionNo: { increment: 1 }, status: late ? 'LATE' : 'ON_TIME', submittedAt: now } })
          : await tx.submission.create({ data: { activityId: r.id, studentId: me.id, status: late ? 'LATE' : 'ON_TIME', submittedAt: now, latestVersionNo: 1 } });
        await tx.submissionVersion.create({ data: { submissionId: sub.id, versionNo: sub.latestVersionNo, text, ...stored, late, idempotencyKey: input.idempotencyKey, submittedAt: now } });
        await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'submission.create', entityType: 'learning_activity', entityId: r.id, requestId: meta.requestId, metadata: { versionNo: sub.latestVersionNo, late, file: stored ? { mimeType: stored.mimeType, sizeBytes: stored.sizeBytes } : null } }, tx);
        return { submissionId: sub.id, versionNo: sub.latestVersionNo, late, duplicate: false };
      });
      return result;
    } catch (err) {
      if (stored) await this.storage.remove(stored.storageKey);
      throw err;
    }
  }

  /** Unduh berkas kiriman: siswa pemilik, wali (izin akademik), guru penugasan, pembaca nilai, atau wali kelas. */
  async openFile(auth: AuthContext, submissionId: string, versionNo: number, meta: RequestMeta): Promise<{ stream: Readable; size: number; mimeType: string; fileName: string }> {
    const sub = await this.prisma.submission.findFirst({
      where: { id: submissionId, activity: { schoolId: auth.schoolId } },
      include: { activity: { select: { id: true, teachingAssignment: { select: { employeeId: true, classGroupId: true } } } }, versions: { where: { versionNo } } },
    });
    const v = sub?.versions[0];
    if (!sub || !v?.storageKey) throw new NotFoundException('Berkas tidak ditemukan.');
    let allowed = false;
    if (auth.activeRole === 'STUDENT') allowed = (await this.scope.student(auth))?.id === sub.studentId;
    else if (auth.activeRole === 'GUARDIAN') allowed = (await this.scope.guardianChildIds(auth, 'academic')).includes(sub.studentId);
    else {
      try {
        await this.gradebook.checkAccess(auth, sub.activity.teachingAssignment);
        allowed = true;
      } catch {
        allowed = false;
      }
    }
    if (!allowed) throw new NotFoundException('Berkas tidak ditemukan.');
    const f = await this.storage.open(v.storageKey);
    await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'submission.download', entityType: 'learning_activity', entityId: sub.activity.id, requestId: meta.requestId, metadata: { submissionId, versionNo } });
    return { ...f, mimeType: v.mimeType ?? 'application/octet-stream', fileName: v.originalName ?? 'tugas' };
  }
}
