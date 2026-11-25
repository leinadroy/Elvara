import { createHash } from 'node:crypto';
import type { Readable } from 'node:stream';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  type AttendanceSummary,
  type PortalReportCards,
  type ReportCardClass,
  type ReportCardContent,
  type ReportCardDetail,
  type ReportCardOverview,
  type ReportCardStatus,
  type ReportCardVersionView,
  type ReportDescriptions,
  type SaveReportDescriptionsSchema,
} from '@smart-school/contracts';
import type { z } from 'zod';
import { activeOn, validOn } from '../academics/classes.service.js';
import { ScopeService } from '../academics/scope.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AuthContext } from '../auth/auth.types.js';
import { conflict, validationFailed } from '../common/api-exception.filter.js';
import { fromDbDate, toDbDate } from '../common/dates.js';
import type { RequestMeta } from '../common/request-meta.js';
import { todayIn } from '../common/school-time.js';
import { NotificationsService } from '../communications/notifications.service.js';
import { StorageService } from '../documents/storage.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { computeFinal } from './compute.js';
import { GradebookService } from './gradebook.service.js';
import { PortalGradesService } from './portal-grades.service.js';
import { renderReportCardPdf } from './report-card-pdf.js';
import { SchemesService } from './schemes.service.js';

type Term = { id: string; name: string; startDate: Date; endDate: Date; academicYear: { name: string } };
const EDITABLE: ReportCardStatus[] = ['DRAFT', 'RETURNED'];
const emptyAttendance = (): AttendanceSummary => ({ PRESENT: 0, EXCUSED: 0, SICK: 0, ABSENT: 0, LATE: 0 });
const emptyCounts = (): Record<ReportCardStatus, number> => ({ DRAFT: 0, SUBMITTED: 0, RETURNED: 0, PUBLISHED: 0 });
const clean = (s: string | null | undefined) => (s && s.trim() ? s.trim() : null);

/** Nilai akhir per mapel per siswa dari penilaian terbit (aturan sama dengan buku nilai dan portal). */
interface SubjectGrades {
  subject: { id: string; code: string; name: string };
  teacher: string | null;
  passingScore: number | null;
  hasScheme: boolean;
  final: (studentId: string) => ReturnType<typeof computeFinal>;
}

/**
 * Rapor (PRD R2 E15). Guru mapel menulis deskripsi capaian; wali kelas melihat pratinjau dan masalah,
 * mengisi catatan, lalu mengajukan; kepala sekolah (report-cards:approve) menyetujui (terbit: snapshot + PDF
 * versi tetap) atau mengembalikan dengan catatan. Revisi setelah terbit membuka draf baru beralasan; versi lama
 * tetap tersimpan dan tetap dapat diunduh.
 */
@Injectable()
export class ReportCardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly scope: ScopeService,
    private readonly schemes: SchemesService,
    private readonly gradebook: GradebookService,
    private readonly portal: PortalGradesService,
    private readonly notifications: NotificationsService,
    private readonly storage: StorageService,
  ) {}

  private async school(schoolId: string) {
    return this.prisma.school.findUniqueOrThrow({ where: { id: schoolId }, select: { name: true, npsn: true, address: true, timezone: true } });
  }

  private async today(schoolId: string) {
    return todayIn((await this.school(schoolId)).timezone);
  }

  private readonly termSelect = { id: true, name: true, startDate: true, endDate: true, academicYear: { select: { name: true } } } as const;

  /** Semester yang diminta, atau yang sedang berjalan, atau semester terakhir yang sudah dimulai di tahun ajaran aktif. */
  private async term(schoolId: string, termId?: string): Promise<Term | null> {
    if (termId) {
      const t = await this.prisma.term.findFirst({ where: { id: termId, academicYear: { schoolId } }, select: this.termSelect });
      if (!t) throw new NotFoundException('Semester tidak ditemukan.');
      return t;
    }
    const today = toDbDate(await this.today(schoolId));
    return this.prisma.term.findFirst({
      where: { academicYear: { schoolId, status: 'ACTIVE' }, startDate: { lte: today } },
      orderBy: { startDate: 'desc' },
      select: this.termSelect,
    });
  }

  /** Tanggal acuan penempatan: hari ini, dibatasi ke rentang semester. */
  private refDate(term: Term, today: string) {
    const start = fromDbDate(term.startDate);
    const end = fromDbDate(term.endDate);
    return today < start ? start : today > end ? end : today;
  }

  private async homeroomEmployeeId(auth: AuthContext, classGroupId: string): Promise<string | null> {
    const emp = await this.scope.employee(auth);
    if (!emp) return null;
    const today = await this.today(auth.schoolId);
    const h = await this.prisma.homeroomAssignment.findFirst({ where: { employeeId: emp.id, classGroupId, ...validOn(today) }, select: { id: true } });
    return h ? emp.id : null;
  }

  /** Wali kelas rombel itu (hari ini) boleh mengajukan; pemegang grading:read / report-cards:approve membaca. */
  private async access(auth: AuthContext, classGroupId: string) {
    const canApprove = auth.permissions.has('report-cards:approve');
    const canSubmit = !!(await this.homeroomEmployeeId(auth, classGroupId));
    if (!canSubmit && !canApprove && !auth.permissions.has('grading:read')) throw new ForbiddenException('Rapor rombel ini hanya untuk wali kelasnya, kurikulum, dan pimpinan.');
    return { canSubmit, canApprove };
  }

  private async homeroomName(classGroupId: string, date: string) {
    const h = await this.prisma.homeroomAssignment.findFirst({
      where: { classGroupId, ...validOn(date) },
      select: { employee: { select: { person: { select: { fullName: true } } } } },
      orderBy: { validFrom: 'desc' },
    });
    return h?.employee.person.fullName ?? null;
  }

  /** Pastikan setiap siswa rombel (pada tanggal acuan) punya rapor semester ini. Rapor draf siswa pindah rombel ikut pindah. */
  private async ensureCards(schoolId: string, classGroupId: string, term: Term) {
    const date = this.refDate(term, await this.today(schoolId));
    const enrolled = await this.prisma.enrollment.findMany({ where: { classGroupId, ...activeOn(date) }, select: { studentId: true } });
    const ids = enrolled.map((e) => e.studentId);
    if (ids.length) {
      const existing = await this.prisma.reportCard.findMany({ where: { termId: term.id, studentId: { in: ids } }, select: { id: true, studentId: true, classGroupId: true, status: true } });
      const have = new Map(existing.map((c) => [c.studentId, c]));
      const missing = ids.filter((id) => !have.has(id));
      if (missing.length) await this.prisma.reportCard.createMany({ data: missing.map((studentId) => ({ schoolId, studentId, termId: term.id, classGroupId })), skipDuplicates: true });
      const moved = existing.filter((c) => c.classGroupId !== classGroupId && EDITABLE.includes(c.status));
      if (moved.length) await this.prisma.reportCard.updateMany({ where: { id: { in: moved.map((c) => c.id) } }, data: { classGroupId } });
    }
    return date;
  }

  /** Nilai akhir semua mapel rombel pada semester, untuk siswa tertentu. */
  private async subjectGrades(termId: string, classGroupId: string, studentIds: string[], subjectId?: string): Promise<SubjectGrades[]> {
    const tas = await this.prisma.teachingAssignment.findMany({
      where: { termId, classGroupId, ...(subjectId ? { subjectId } : {}) },
      include: {
        subject: { select: { id: true, code: true, name: true } },
        classGroup: { select: { gradeLevelId: true } },
        employee: { select: { person: { select: { fullName: true } } } },
        assessments: {
          where: { status: 'PUBLISHED' },
          select: { id: true, title: true, component: { select: { code: true } }, entries: { where: { studentId: { in: studentIds } } } },
        },
      },
      orderBy: [{ subject: { name: 'asc' } }, { teachingRole: 'asc' }],
    });
    const bySubject = new Map<string, typeof tas>();
    for (const t of tas) bySubject.set(t.subjectId, [...(bySubject.get(t.subjectId) ?? []), t]);
    const out: SubjectGrades[] = [];
    for (const group of bySubject.values()) {
      const main = group[0]!;
      const scheme = await this.schemes.published(termId, main.subjectId, main.classGroup.gradeLevelId);
      const assessments = group.flatMap((t) => t.assessments);
      const cells = new Map<string, (typeof assessments)[number]['entries'][number]>();
      for (const a of assessments) for (const e of a.entries) cells.set(`${a.id}:${e.studentId}`, e);
      const list = assessments.map((a) => ({ id: a.id, title: a.title, componentCode: a.component.code }));
      out.push({
        subject: main.subject,
        teacher: main.employee.person.fullName,
        passingScore: scheme?.passingScore ?? null,
        hasScheme: !!scheme,
        final: (sid) => computeFinal(scheme?.components ?? [], scheme?.passingScore ?? null, list, (id) => cells.get(`${id}:${sid}`)),
      });
    }
    return out;
  }

  /** Rekap kehadiran siswa dalam rentang semester (sampai tanggal acuan); sesi dibatalkan tidak dihitung. */
  private async attendance(studentIds: string[], term: Term, until: string) {
    const rows = await this.prisma.studentAttendanceRecord.groupBy({
      by: ['studentId', 'status'],
      where: { studentId: { in: studentIds }, status: { not: null }, session: { status: { not: 'CANCELLED' }, sessionDate: { gte: term.startDate, lte: toDbDate(until) } } },
      _count: { _all: true },
    });
    const map = new Map<string, AttendanceSummary>();
    for (const r of rows) {
      if (!r.status) continue;
      const s = map.get(r.studentId) ?? emptyAttendance();
      s[r.status] += r._count._all;
      map.set(r.studentId, s);
    }
    return map;
  }

  /** Isi rapor (pratinjau langsung) dan daftar masalah untuk kartu-kartu dalam satu rombel. */
  private async build(schoolId: string, classGroupId: string, term: Term, cardIds: string[]) {
    const school = await this.school(schoolId);
    const date = this.refDate(term, todayIn(school.timezone));
    const cards = await this.prisma.reportCard.findMany({
      where: { id: { in: cardIds } },
      include: { student: { select: { id: true, nis: true, nisn: true, person: { select: { fullName: true } } } }, subjects: true, classGroup: { select: { id: true, code: true } } },
    });
    const sids = cards.map((c) => c.studentId);
    const [grades, attendance, homeroom] = await Promise.all([this.subjectGrades(term.id, classGroupId, sids), this.attendance(sids, term, date), this.homeroomName(classGroupId, date)]);
    const result = new Map<string, { content: ReportCardContent; issues: string[] }>();
    for (const card of cards) {
      const issues: string[] = [];
      if (!grades.length) issues.push('Belum ada mata pelajaran dengan penugasan guru di rombel ini.');
      const subjects = grades.map((g) => {
        const f = g.final(card.studentId);
        const d = card.subjects.find((s) => s.subjectId === g.subject.id);
        if (!g.hasScheme) issues.push(`${g.subject.name}: skema nilai belum terbit.`);
        else if (!f.complete) issues.push(`${g.subject.name}: nilai akhir belum lengkap.`);
        if (!clean(d?.highestAchievement) || !clean(d?.needsImprovement)) issues.push(`${g.subject.name}: deskripsi capaian belum diisi.`);
        return {
          subject: g.subject,
          teacher: g.teacher,
          finalScore: f.complete ? f.rounded : null,
          passingScore: g.passingScore,
          belowPassing: f.belowPassing,
          highestAchievement: clean(d?.highestAchievement),
          needsImprovement: clean(d?.needsImprovement),
        };
      });
      result.set(card.id, {
        issues,
        content: {
          school: { name: school.name, npsn: school.npsn, address: school.address },
          student: { id: card.student.id, fullName: card.student.person.fullName, nis: card.student.nis, nisn: card.student.nisn },
          classGroup: card.classGroup,
          term: { id: term.id, name: term.name, academicYear: term.academicYear.name },
          homeroomTeacher: homeroom,
          subjects,
          attendance: attendance.get(card.studentId) ?? emptyAttendance(),
          homeroomNote: card.homeroomNote,
        },
      });
    }
    return result;
  }

  private versionView(v: { id: string; versionNo: number; publishedAt: Date; revisionReason: string | null }, publishedBy: string | null): ReportCardVersionView {
    return { id: v.id, versionNo: v.versionNo, publishedAt: v.publishedAt.toISOString(), publishedBy, revisionReason: v.revisionReason, fileUrl: `/api/v1/report-cards/versions/${v.id}/file` };
  }

  private async userNames(ids: string[]) {
    const users = await this.prisma.user.findMany({ where: { id: { in: [...new Set(ids)] } }, select: { id: true, email: true, person: { select: { fullName: true } } } });
    return new Map(users.map((u) => [u.id, u.person?.fullName ?? u.email]));
  }

  // ───────────── Ringkasan ─────────────

  async overview(auth: AuthContext, termId?: string): Promise<ReportCardOverview> {
    const canApprove = auth.permissions.has('report-cards:approve');
    const term = await this.term(auth.schoolId, termId);
    if (!term) return { term: null, classes: [], canApprove };
    const date = this.refDate(term, await this.today(auth.schoolId));
    let classIds: string[] | undefined;
    if (!canApprove && !auth.permissions.has('grading:read')) {
      const emp = await this.scope.employee(auth);
      const today = await this.today(auth.schoolId);
      classIds = emp ? (await this.prisma.homeroomAssignment.findMany({ where: { employeeId: emp.id, ...validOn(today) }, select: { classGroupId: true } })).map((h) => h.classGroupId) : [];
    }
    const year = await this.prisma.term.findUniqueOrThrow({ where: { id: term.id }, select: { academicYearId: true } });
    const classes = await this.prisma.classGroup.findMany({
      where: { schoolId: auth.schoolId, academicYearId: year.academicYearId, status: 'ACTIVE', ...(classIds ? { id: { in: classIds } } : {}) },
      select: { id: true, code: true },
      orderBy: { code: 'asc' },
    });
    const ids = classes.map((c) => c.id);
    const [enrolled, cards, homerooms] = await Promise.all([
      this.prisma.enrollment.groupBy({ by: ['classGroupId'], where: { classGroupId: { in: ids }, ...activeOn(date) }, _count: { _all: true } }),
      this.prisma.reportCard.groupBy({ by: ['classGroupId', 'status'], where: { termId: term.id, classGroupId: { in: ids } }, _count: { _all: true } }),
      this.prisma.homeroomAssignment.findMany({ where: { classGroupId: { in: ids }, ...validOn(date) }, select: { classGroupId: true, employee: { select: { person: { select: { fullName: true } } } } } }),
    ]);
    return {
      term: { id: term.id, name: term.name },
      canApprove,
      classes: classes.map((c) => {
        const students = enrolled.find((e) => e.classGroupId === c.id)?._count._all ?? 0;
        const counts = emptyCounts();
        for (const r of cards.filter((x) => x.classGroupId === c.id)) counts[r.status] += r._count._all;
        // Siswa yang rapornya belum pernah dibuka dihitung sebagai draf.
        const made = counts.DRAFT + counts.SUBMITTED + counts.RETURNED + counts.PUBLISHED;
        counts.DRAFT += Math.max(0, students - made);
        return { classGroup: c, homeroomTeacher: homerooms.find((h) => h.classGroupId === c.id)?.employee.person.fullName ?? null, students, counts };
      }),
    };
  }

  // ───────────── Rapor rombel dan detail ─────────────

  async classView(auth: AuthContext, classGroupId: string, termId?: string): Promise<ReportCardClass> {
    const cls = await this.prisma.classGroup.findFirst({ where: { id: classGroupId, schoolId: auth.schoolId }, select: { id: true, code: true } });
    if (!cls) throw new NotFoundException('Rombel tidak ditemukan.');
    const { canSubmit, canApprove } = await this.access(auth, classGroupId);
    const term = await this.term(auth.schoolId, termId);
    if (!term) throw conflict('Belum ada semester berjalan.');
    const date = await this.ensureCards(auth.schoolId, classGroupId, term);
    const cards = await this.prisma.reportCard.findMany({
      where: { termId: term.id, classGroupId },
      select: { id: true, status: true, currentVersionNo: true, submittedAt: true, returnNote: true, student: { select: { id: true, nis: true, person: { select: { fullName: true } } } } },
      orderBy: { student: { person: { fullName: 'asc' } } },
    });
    const built = await this.build(auth.schoolId, classGroupId, term, cards.filter((c) => EDITABLE.includes(c.status)).map((c) => c.id));
    return {
      classGroup: cls,
      term: { id: term.id, name: term.name },
      homeroomTeacher: await this.homeroomName(classGroupId, date),
      canSubmit,
      canApprove,
      rows: cards.map((c) => ({
        id: c.id,
        student: { id: c.student.id, fullName: c.student.person.fullName, nis: c.student.nis },
        status: c.status,
        issues: built.get(c.id)?.issues ?? [],
        currentVersionNo: c.currentVersionNo,
        submittedAt: c.submittedAt?.toISOString() ?? null,
        returnNote: c.returnNote,
      })),
    };
  }

  private async loadCard(auth: AuthContext, id: string) {
    const card = await this.prisma.reportCard.findFirst({
      where: { id, schoolId: auth.schoolId },
      include: { term: { select: this.termSelect }, versions: { orderBy: { versionNo: 'desc' } } },
    });
    if (!card) throw new NotFoundException('Rapor tidak ditemukan.');
    return card;
  }

  async detail(auth: AuthContext, id: string): Promise<ReportCardDetail> {
    const card = await this.loadCard(auth, id);
    const { canSubmit, canApprove } = await this.access(auth, card.classGroupId);
    const names = await this.userNames(card.versions.map((v) => v.publishedById));
    const versions = card.versions.map((v) => this.versionView(v, names.get(v.publishedById) ?? null));
    let content: ReportCardContent;
    let issues: string[] = [];
    if (card.status === 'PUBLISHED' && card.versions[0]) content = card.versions[0].snapshot as unknown as ReportCardContent;
    else {
      const b = (await this.build(auth.schoolId, card.classGroupId, card.term, [card.id])).get(card.id)!;
      content = b.content;
      issues = b.issues;
    }
    return {
      id: card.id,
      status: card.status,
      content,
      issues,
      returnNote: card.returnNote,
      pendingRevisionReason: card.pendingRevisionReason,
      submittedAt: card.submittedAt?.toISOString() ?? null,
      decidedAt: card.decidedAt?.toISOString() ?? null,
      versions,
      canSubmit,
      canApprove,
    };
  }

  async setNote(auth: AuthContext, id: string, note: string | null, meta: RequestMeta) {
    const card = await this.loadCard(auth, id);
    if (!(await this.homeroomEmployeeId(auth, card.classGroupId))) throw new ForbiddenException('Catatan rapor diisi wali kelas rombel ini.');
    if (!EDITABLE.includes(card.status)) throw conflict('Rapor yang sudah diajukan atau terbit tidak dapat diubah.');
    await this.prisma.reportCard.update({ where: { id }, data: { homeroomNote: clean(note) } });
    await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'report_card.note', entityType: 'report_card', entityId: id, requestId: meta.requestId });
  }

  /** Wali kelas mengajukan rapor tanpa masalah. Satu rapor bermasalah menggagalkan seluruh pengajuan. */
  async submit(auth: AuthContext, ids: string[], meta: RequestMeta) {
    const cards = await this.prisma.reportCard.findMany({ where: { id: { in: ids }, schoolId: auth.schoolId }, include: { term: { select: this.termSelect }, student: { select: { person: { select: { fullName: true } } } } } });
    if (cards.length !== new Set(ids).size) throw new NotFoundException('Rapor tidak ditemukan.');
    for (const classGroupId of new Set(cards.map((c) => c.classGroupId)))
      if (!(await this.homeroomEmployeeId(auth, classGroupId))) throw new ForbiddenException('Rapor diajukan oleh wali kelas rombel itu.');
    const locked = cards.filter((c) => !EDITABLE.includes(c.status));
    if (locked.length) throw conflict(`Rapor sudah diajukan atau terbit: ${locked.map((c) => c.student.person.fullName).join(', ')}.`);
    const problems: string[] = [];
    for (const c of cards) {
      const b = (await this.build(auth.schoolId, c.classGroupId, c.term, [c.id])).get(c.id)!;
      if (b.issues.length) problems.push(`${c.student.person.fullName} (${b.issues.length} masalah)`);
    }
    if (problems.length) throw validationFailed(`Selesaikan masalah rapor dulu: ${problems.join(', ')}.`);
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const r = await tx.reportCard.updateMany({ where: { id: { in: ids }, status: { in: EDITABLE } }, data: { status: 'SUBMITTED', submittedAt: now, submittedById: auth.userId, returnNote: null } });
      if (r.count !== ids.length) throw conflict('Sebagian rapor baru saja berubah. Muat ulang lalu coba lagi.');
      for (const id of ids) await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'report_card.submit', entityType: 'report_card', entityId: id, requestId: meta.requestId }, tx);
    });
  }

  /** Kepala sekolah menyetujui: snapshot + PDF menjadi versi baru yang tidak berubah, lalu siswa dan wali diberi tahu. */
  async approve(auth: AuthContext, ids: string[], meta: RequestMeta) {
    const school = await this.school(auth.schoolId);
    const approver = (await this.userNames([auth.userId])).get(auth.userId) ?? 'Kepala sekolah';
    const cards = await this.prisma.reportCard.findMany({ where: { id: { in: ids }, schoolId: auth.schoolId }, include: { term: { select: this.termSelect }, student: { select: { person: { select: { fullName: true } } } } } });
    if (cards.length !== new Set(ids).size) throw new NotFoundException('Rapor tidak ditemukan.');
    const notSubmitted = cards.filter((c) => c.status !== 'SUBMITTED');
    if (notSubmitted.length) throw conflict(`Hanya rapor yang menunggu persetujuan yang dapat disetujui: ${notSubmitted.map((c) => c.student.person.fullName).join(', ')}.`);
    const prepared: { card: (typeof cards)[number]; content: ReportCardContent }[] = [];
    for (const c of cards) {
      const b = (await this.build(auth.schoolId, c.classGroupId, c.term, [c.id])).get(c.id)!;
      // Nilai sumber bisa berubah setelah pengajuan; rapor bermasalah dikembalikan, bukan diterbitkan.
      if (b.issues.length) throw conflict(`Rapor ${c.student.person.fullName} kini bermasalah (${b.issues[0]}). Kembalikan ke wali kelas.`);
      prepared.push({ card: c, content: b.content });
    }
    const published: { id: string; versionNo: number; studentId: string; term: string }[] = [];
    for (const { card, content } of prepared) {
      const now = new Date();
      const versionNo = card.currentVersionNo + 1;
      const pdf = await renderReportCardPdf(content, { versionNo, publishedAt: now, approvedBy: approver, revisionReason: card.pendingRevisionReason, timezone: school.timezone });
      const key = await this.storage.put(pdf);
      try {
        await this.prisma.$transaction(async (tx) => {
          const r = await tx.reportCard.updateMany({
            where: { id: card.id, status: 'SUBMITTED', currentVersionNo: card.currentVersionNo },
            data: { status: 'PUBLISHED', decidedAt: now, decidedById: auth.userId, currentVersionNo: versionNo, pendingRevisionReason: null, returnNote: null },
          });
          if (r.count !== 1) throw conflict(`Rapor ${card.student.person.fullName} baru saja berubah. Muat ulang lalu coba lagi.`);
          await tx.reportCardVersion.create({
            data: { reportCardId: card.id, versionNo, snapshot: content as unknown as Prisma.InputJsonValue, storageKey: key, sha256: createHash('sha256').update(pdf).digest('hex'), revisionReason: card.pendingRevisionReason, publishedAt: now, publishedById: auth.userId },
          });
          await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'report_card.publish', entityType: 'report_card', entityId: card.id, requestId: meta.requestId, metadata: { versionNo, revisionReason: card.pendingRevisionReason } }, tx);
        });
      } catch (err) {
        await this.storage.remove(key);
        throw err;
      }
      published.push({ id: card.id, versionNo, studentId: card.studentId, term: card.term.name });
    }
    for (const p of published) await this.notifyPublished(auth.schoolId, p);
  }

  /** Kepala sekolah mengembalikan rapor ke wali kelas dengan catatan. */
  async returnCard(auth: AuthContext, id: string, note: string, meta: RequestMeta) {
    const card = await this.loadCard(auth, id);
    if (card.status !== 'SUBMITTED') throw conflict('Hanya rapor yang menunggu persetujuan yang dapat dikembalikan.');
    await this.prisma.$transaction(async (tx) => {
      const r = await tx.reportCard.updateMany({ where: { id, status: 'SUBMITTED' }, data: { status: 'RETURNED', returnNote: note, decidedAt: new Date(), decidedById: auth.userId } });
      if (r.count !== 1) throw conflict('Rapor baru saja berubah. Muat ulang lalu coba lagi.');
      await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'report_card.return', entityType: 'report_card', entityId: id, requestId: meta.requestId, metadata: { note } }, tx);
    });
    // Wali kelas diberi tahu lewat notifikasi dalam aplikasi.
    const h = await this.prisma.homeroomAssignment.findFirst({
      where: { classGroupId: card.classGroupId, ...validOn(await this.today(auth.schoolId)) },
      select: { employee: { select: { person: { select: { user: { select: { id: true } } } } } } },
    });
    const student = await this.prisma.student.findUniqueOrThrow({ where: { id: card.studentId }, select: { person: { select: { fullName: true } } } });
    const userId = h?.employee.person.user?.id;
    if (userId)
      await this.notifications.emit(null, { schoolId: auth.schoolId, sourceEventId: `report_card.returned:${id}:${Date.now()}`, eventType: 'report_card.returned', payload: { reportCardId: id } }, [
        { recipientId: userId, title: `Rapor ${student.person.fullName} dikembalikan`, body: note, link: `/teacher/report-cards/card/${id}` },
      ]);
  }

  /** Wali kelas membuka revisi rapor terbit. Versi terbit tetap tersimpan; persetujuan berikutnya membuat versi baru. */
  async revise(auth: AuthContext, id: string, reason: string, meta: RequestMeta) {
    const card = await this.loadCard(auth, id);
    if (!(await this.homeroomEmployeeId(auth, card.classGroupId))) throw new ForbiddenException('Revisi rapor dibuka oleh wali kelas rombel ini.');
    if (card.status !== 'PUBLISHED') throw conflict('Hanya rapor terbit yang dapat direvisi.');
    await this.prisma.$transaction(async (tx) => {
      const r = await tx.reportCard.updateMany({ where: { id, status: 'PUBLISHED' }, data: { status: 'DRAFT', pendingRevisionReason: reason, submittedAt: null, submittedById: null } });
      if (r.count !== 1) throw conflict('Rapor baru saja berubah. Muat ulang lalu coba lagi.');
      await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'report_card.revise', entityType: 'report_card', entityId: id, requestId: meta.requestId, metadata: { reason, fromVersion: card.currentVersionNo } }, tx);
    });
  }

  private async notifyPublished(schoolId: string, p: { id: string; versionNo: number; studentId: string; term: string }) {
    const who = await this.portal.studentAudience(p.studentId);
    const title = p.versionNo > 1 ? `Rapor ${p.term} diperbarui` : `Rapor ${p.term} terbit`;
    const body = p.versionNo > 1 ? `Versi ${p.versionNo} rapor sudah dapat dilihat dan diunduh.` : 'Rapor sudah dapat dilihat dan diunduh.';
    await this.notifications.emit(null, { schoolId, sourceEventId: `report_card.published:${p.id}:${p.versionNo}`, eventType: 'report_card.published', payload: { reportCardId: p.id, versionNo: p.versionNo } }, [
      ...who.students.map((s) => ({ recipientId: s.userId, title, body, link: '/student/report-cards' })),
      ...who.guardians.map((g) => ({ recipientId: g.userId, title, body, link: `/guardian/report-cards?studentId=${g.studentId}` })),
    ]);
  }

  // ───────────── Deskripsi capaian (guru mapel) ─────────────

  async descriptions(auth: AuthContext, taId: string): Promise<ReportDescriptions> {
    const ta = await this.gradebook.loadAssignment(auth, taId);
    const { canEdit } = await this.gradebook.checkAccess(auth, ta);
    const term = await this.prisma.term.findUniqueOrThrow({ where: { id: ta.termId }, select: this.termSelect });
    await this.ensureCards(auth.schoolId, ta.classGroupId, term);
    const cards = await this.prisma.reportCard.findMany({
      where: { termId: term.id, classGroupId: ta.classGroupId },
      select: { id: true, status: true, studentId: true, student: { select: { nis: true, person: { select: { fullName: true } } } }, subjects: { where: { subjectId: ta.subjectId } } },
      orderBy: { student: { person: { fullName: 'asc' } } },
    });
    const [grades] = await this.subjectGrades(term.id, ta.classGroupId, cards.map((c) => c.studentId), ta.subjectId);
    const outcomes = await this.prisma.learningOutcome.findMany({
      where: { schoolId: auth.schoolId, subjectId: ta.subjectId, gradeLevelId: ta.classGroup.gradeLevelId, status: 'ACTIVE' },
      select: { id: true, code: true, description: true },
      orderBy: { code: 'asc' },
    });
    return {
      assignment: { id: ta.id, subject: ta.subject, classGroup: { id: ta.classGroup.id, code: ta.classGroup.code }, term: ta.term },
      outcomes,
      canEdit,
      rows: cards.map((c) => {
        const f = grades?.final(c.studentId);
        const d = c.subjects[0];
        return {
          studentId: c.studentId,
          fullName: c.student.person.fullName,
          nis: c.student.nis,
          finalScore: f?.complete ? f.rounded : null,
          belowPassing: f?.belowPassing ?? false,
          highestAchievement: d?.highestAchievement ?? null,
          needsImprovement: d?.needsImprovement ?? null,
          status: c.status,
          locked: !EDITABLE.includes(c.status),
        };
      }),
    };
  }

  async saveDescriptions(auth: AuthContext, input: z.infer<typeof SaveReportDescriptionsSchema>, meta: RequestMeta) {
    const ta = await this.gradebook.loadAssignment(auth, input.teachingAssignmentId);
    await this.gradebook.requireTeacher(auth, ta);
    const cards = await this.prisma.reportCard.findMany({
      where: { termId: ta.termId, classGroupId: ta.classGroupId, studentId: { in: input.entries.map((e) => e.studentId) } },
      select: { id: true, studentId: true, status: true, student: { select: { person: { select: { fullName: true } } } } },
    });
    const byStudent = new Map(cards.map((c) => [c.studentId, c]));
    const unknown = input.entries.filter((e) => !byStudent.has(e.studentId));
    if (unknown.length) throw validationFailed('Sebagian siswa tidak ada di rapor rombel ini. Muat ulang halaman.');
    const locked = cards.filter((c) => !EDITABLE.includes(c.status));
    if (locked.length) throw conflict(`Rapor sudah diajukan atau terbit, deskripsi terkunci: ${locked.map((c) => c.student.person.fullName).join(', ')}.`);
    await this.prisma.$transaction(async (tx) => {
      for (const e of input.entries) {
        const card = byStudent.get(e.studentId)!;
        const data = {
          ...(e.highestAchievement !== undefined ? { highestAchievement: clean(e.highestAchievement) } : {}),
          ...(e.needsImprovement !== undefined ? { needsImprovement: clean(e.needsImprovement) } : {}),
          updatedById: auth.userId,
        };
        await tx.reportCardSubject.upsert({ where: { reportCardId_subjectId: { reportCardId: card.id, subjectId: ta.subjectId } }, create: { reportCardId: card.id, subjectId: ta.subjectId, ...data }, update: data });
      }
      await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'report_card.describe', entityType: 'teaching_assignment', entityId: ta.id, requestId: meta.requestId, metadata: { students: input.entries.length } }, tx);
    });
  }

  // ───────────── Portal siswa dan wali ─────────────

  async portalList(auth: AuthContext, studentId?: string): Promise<PortalReportCards> {
    const sid = await this.scope.portalStudentId(auth, 'academic', studentId);
    const student = await this.prisma.student.findUniqueOrThrow({ where: { id: sid }, select: { id: true, person: { select: { fullName: true } } } });
    const cards = await this.prisma.reportCard.findMany({
      where: { studentId: sid, currentVersionNo: { gt: 0 } },
      include: { term: { select: { id: true, name: true, startDate: true } }, versions: { orderBy: { versionNo: 'desc' } } },
      orderBy: { term: { startDate: 'desc' } },
    });
    const names = await this.userNames(cards.flatMap((c) => c.versions.map((v) => v.publishedById)));
    return {
      student: { id: student.id, fullName: student.person.fullName },
      items: cards.flatMap((c) => {
        const latest = c.versions[0];
        if (!latest) return [];
        return [
          {
            id: c.id,
            term: { id: c.term.id, name: c.term.name },
            versionNo: latest.versionNo,
            publishedAt: latest.publishedAt.toISOString(),
            content: latest.snapshot as unknown as ReportCardContent,
            versions: c.versions.map((v) => this.versionView(v, names.get(v.publishedById) ?? null)),
          },
        ];
      }),
    };
  }

  /** Unduh PDF satu versi rapor. Siswa sendiri, wali (izin akademik), atau pembaca rapor rombel; setiap unduhan tercatat. */
  async openFile(auth: AuthContext, versionId: string, meta: RequestMeta): Promise<{ stream: Readable; size: number; fileName: string }> {
    const v = await this.prisma.reportCardVersion.findFirst({
      where: { id: versionId, reportCard: { schoolId: auth.schoolId } },
      include: { reportCard: { select: { id: true, studentId: true, classGroupId: true, term: { select: { name: true } }, student: { select: { nis: true } } } } },
    });
    if (!v) throw new NotFoundException('Rapor tidak ditemukan.');
    const card = v.reportCard;
    let allowed = false;
    if (auth.activeRole === 'STUDENT') allowed = (await this.scope.student(auth))?.id === card.studentId;
    else if (auth.activeRole === 'GUARDIAN') allowed = (await this.scope.guardianChildIds(auth, 'academic')).includes(card.studentId);
    else
      allowed = await this.access(auth, card.classGroupId).then(
        () => true,
        () => false,
      );
    if (!allowed) throw new NotFoundException('Rapor tidak ditemukan.');
    const f = await this.storage.open(v.storageKey);
    await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'report_card.download', entityType: 'report_card', entityId: card.id, requestId: meta.requestId, metadata: { versionNo: v.versionNo } });
    const safe = (s: string) => s.replace(/[^A-Za-z0-9-]+/g, '-').replace(/^-|-$/g, '');
    return { ...f, fileName: `Rapor-${safe(card.student.nis)}-${safe(card.term.name)}-v${v.versionNo}.pdf` };
  }
}
