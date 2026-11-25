import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { AssessmentSchema, AssessmentView, Gradebook, GradebookRow, GradeState, MyTeachingAssignment, SaveGradesSchema } from '@smart-school/contracts';
import type { z } from 'zod';
import { activeOn, validOn } from '../academics/classes.service.js';
import { ScopeService } from '../academics/scope.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AuthContext } from '../auth/auth.types.js';
import { conflict, validationFailed } from '../common/api-exception.filter.js';
import { fromDbDate, toDbDate } from '../common/dates.js';
import type { RequestMeta } from '../common/request-meta.js';
import { todayIn } from '../common/school-time.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { computeFinal } from './compute.js';
import { PortalGradesService } from './portal-grades.service.js';
import { SchemesService } from './schemes.service.js';

const emptyCounts = (): Record<GradeState, number> => ({ PENDING: 0, SCORED: 0, MISSING: 0, EXCUSED: 0 });

/**
 * Penilaian dan buku nilai (PRD R2 E13). Guru penugasan mengelola penilaian dan nilai kelasnya;
 * kurikulum/pimpinan (grading:read) dan wali kelas rombel itu hanya membaca. Nilai akhir dihitung backend
 * dari penilaian yang sudah terbit (yang juga dilihat siswa dan wali), memakai skema terbit yang berlaku.
 */
@Injectable()
export class GradebookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly scope: ScopeService,
    private readonly schemes: SchemesService,
    private readonly portal: PortalGradesService,
  ) {}

  private async today(schoolId: string) {
    return todayIn((await this.prisma.school.findUniqueOrThrow({ where: { id: schoolId }, select: { timezone: true } })).timezone);
  }

  /** Penugasan mengajar milik guru yang sedang masuk pada tahun ajaran aktif. */
  async mine(auth: AuthContext): Promise<MyTeachingAssignment[]> {
    const emp = await this.scope.employee(auth);
    if (!emp) return [];
    const rows = await this.prisma.teachingAssignment.findMany({
      where: { employeeId: emp.id, schoolId: auth.schoolId, term: { academicYear: { status: 'ACTIVE' } } },
      include: {
        subject: { select: { id: true, code: true, name: true } },
        classGroup: { select: { id: true, code: true, gradeLevelId: true } },
        term: { select: { id: true, name: true, sequence: true } },
        assessments: { select: { status: true } },
      },
      orderBy: [{ term: { sequence: 'asc' } }, { classGroup: { code: 'asc' } }, { subject: { name: 'asc' } }],
    });
    const published = await this.prisma.gradeSchemeVersion.findMany({ where: { schoolId: auth.schoolId, status: 'PUBLISHED', termId: { in: [...new Set(rows.map((r) => r.termId))] } }, select: { termId: true, subjectId: true, gradeLevelId: true } });
    const has = new Set(published.map((p) => `${p.termId}:${p.subjectId}:${p.gradeLevelId}`));
    return rows.map((r) => ({
      id: r.id,
      subject: r.subject,
      classGroup: { id: r.classGroup.id, code: r.classGroup.code },
      term: { id: r.term.id, name: r.term.name },
      hasScheme: has.has(`${r.termId}:${r.subjectId}:${r.classGroup.gradeLevelId}`),
      assessments: r.assessments.length,
      unpublished: r.assessments.filter((a) => a.status === 'DRAFT').length,
    }));
  }

  /** Penugasan mengajar beserta mapel, rombel, semester, guru. */
  async loadAssignment(auth: AuthContext, id: string) {
    const ta = await this.prisma.teachingAssignment.findFirst({
      where: { id, schoolId: auth.schoolId },
      include: {
        subject: { select: { id: true, code: true, name: true } },
        classGroup: { select: { id: true, code: true, gradeLevelId: true } },
        term: { select: { id: true, name: true } },
        employee: { select: { id: true, person: { select: { fullName: true } } } },
      },
    });
    if (!ta) throw new NotFoundException('Penugasan mengajar tidak ditemukan.');
    return ta;
  }

  /** canEdit: guru penugasan. canRead: guru, grading:read, atau wali kelas rombel itu hari ini. */
  async checkAccess(auth: AuthContext, ta: { employeeId: string; classGroupId: string }) {
    const emp = await this.scope.employee(auth);
    const canEdit = !!emp && emp.id === ta.employeeId;
    if (canEdit || auth.permissions.has('grading:read')) return { canEdit };
    if (emp) {
      const today = await this.today(auth.schoolId);
      if (await this.prisma.homeroomAssignment.findFirst({ where: { employeeId: emp.id, classGroupId: ta.classGroupId, ...validOn(today) } })) return { canEdit: false };
    }
    throw new ForbiddenException('Anda tidak memiliki akses ke buku nilai ini.');
  }

  async requireTeacher(auth: AuthContext, ta: { employeeId: string }) {
    const emp = await this.scope.employee(auth);
    if (!emp || emp.id !== ta.employeeId) throw new ForbiddenException('Hanya guru penugasan ini yang dapat mengubah penilaian dan nilai.');
  }

  async gradebook(auth: AuthContext, taId: string): Promise<Gradebook> {
    const ta = await this.loadAssignment(auth, taId);
    const { canEdit } = await this.checkAccess(auth, ta);
    const today = await this.today(auth.schoolId);
    const [scheme, assessments, enrollments] = await Promise.all([
      this.schemes.published(ta.termId, ta.subjectId, ta.classGroup.gradeLevelId),
      this.prisma.assessment.findMany({
        where: { teachingAssignmentId: taId },
        include: { component: { select: { id: true, code: true, name: true, weight: true } }, entries: true },
        orderBy: [{ assessedOn: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.enrollment.findMany({
        where: { classGroupId: ta.classGroupId, ...activeOn(today) },
        select: { student: { select: { id: true, nis: true, person: { select: { fullName: true } } } } },
        orderBy: { student: { person: { fullName: 'asc' } } },
      }),
    ]);
    // Siswa yang sudah punya nilai tetapi pindah kelas tetap tampil agar riwayat tidak hilang.
    const students = new Map(enrollments.map((e) => [e.student.id, e.student]));
    const extra = [...new Set(assessments.flatMap((a) => a.entries.map((e) => e.studentId)))].filter((id) => !students.has(id));
    if (extra.length) {
      const rows = await this.prisma.student.findMany({ where: { id: { in: extra } }, select: { id: true, nis: true, person: { select: { fullName: true } } } });
      for (const s of rows) students.set(s.id, s);
    }

    const views: AssessmentView[] = assessments.map((a) => {
      const counts = emptyCounts();
      for (const id of students.keys()) counts[a.entries.find((e) => e.studentId === id)?.state ?? 'PENDING']++;
      return {
        id: a.id,
        title: a.title,
        component: a.component,
        assessedOn: a.assessedOn ? fromDbDate(a.assessedOn) : null,
        status: a.status,
        publishedAt: a.publishedAt?.toISOString() ?? null,
        activityId: a.activityId,
        counts,
      };
    });
    const publishedOnly = assessments.filter((a) => a.status === 'PUBLISHED').map((a) => ({ id: a.id, title: a.title, componentCode: a.component.code }));
    const rows: GradebookRow[] = [...students.values()].map((s) => {
      const cells: GradebookRow['cells'] = {};
      for (const a of assessments) {
        const e = a.entries.find((x) => x.studentId === s.id);
        if (e) cells[a.id] = { state: e.state, score: e.score, feedback: e.feedback, versionNo: e.versionNo };
      }
      const final = computeFinal(scheme?.components ?? [], scheme?.passingScore ?? null, publishedOnly, (id) => cells[id]);
      return { studentId: s.id, fullName: s.person.fullName, nis: s.nis, cells, final };
    });
    return {
      assignment: { id: ta.id, subject: ta.subject, classGroup: { id: ta.classGroup.id, code: ta.classGroup.code }, term: ta.term, teacher: ta.employee.person.fullName },
      scheme,
      assessments: views,
      rows,
      canEdit,
    };
  }

  async createAssessment(auth: AuthContext, input: z.infer<typeof AssessmentSchema>, meta: RequestMeta) {
    const ta = await this.loadAssignment(auth, input.teachingAssignmentId);
    await this.requireTeacher(auth, ta);
    const scheme = await this.schemes.published(ta.termId, ta.subjectId, ta.classGroup.gradeLevelId);
    if (!scheme) throw conflict('Skema nilai mapel ini belum terbit. Hubungi bagian kurikulum.');
    if (!scheme.components.some((c) => c.id === input.componentId)) throw validationFailed('Komponen harus dari skema nilai yang berlaku.', { componentId: ['Pilih komponen dari skema berlaku.'] });
    const a = await this.prisma.assessment.create({
      data: { schoolId: auth.schoolId, teachingAssignmentId: ta.id, componentId: input.componentId, title: input.title, assessedOn: input.assessedOn ? toDbDate(input.assessedOn) : null, createdById: auth.userId },
    });
    await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'assessment.create', entityType: 'assessment', entityId: a.id, requestId: meta.requestId, metadata: input });
    return { id: a.id };
  }

  private async loadAssessment(auth: AuthContext, id: string) {
    const a = await this.prisma.assessment.findFirst({ where: { id, schoolId: auth.schoolId }, include: { teachingAssignment: { select: { id: true, employeeId: true, classGroupId: true } } } });
    if (!a) throw new NotFoundException('Penilaian tidak ditemukan.');
    return a;
  }

  async deleteAssessment(auth: AuthContext, id: string, meta: RequestMeta) {
    const a = await this.loadAssessment(auth, id);
    await this.requireTeacher(auth, a.teachingAssignment);
    if (a.status !== 'DRAFT') throw conflict('Penilaian yang sudah terbit tidak dapat dihapus.');
    if (a.activityId) throw conflict('Penilaian ini berasal dari tugas; batalkan tugasnya bila tidak dipakai.');
    await this.prisma.assessment.delete({ where: { id } });
    await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'assessment.delete', entityType: 'assessment', entityId: id, requestId: meta.requestId, metadata: { title: a.title } });
  }

  /**
   * Menyimpan nilai beberapa siswa sekaligus. Pemeriksaan versi: entri yang berubah sejak dibuka ditolak semua
   * (tidak ada yang tersimpan) dengan 409 dan daftar siswanya. Pada penilaian terbit, setiap perubahan wajib
   * beralasan dan dicatat di grade_change (nilai lama, baru, alasan, pelaku).
   */
  async saveGrades(auth: AuthContext, assessmentId: string, input: z.infer<typeof SaveGradesSchema>, meta: RequestMeta) {
    const a = await this.loadAssessment(auth, assessmentId);
    await this.requireTeacher(auth, a.teachingAssignment);
    const today = await this.today(auth.schoolId);
    const ids = [...new Set(input.entries.map((e) => e.studentId))];
    if (ids.length !== input.entries.length) throw validationFailed('Ada siswa ganda dalam isian.', { entries: ['Siswa ganda.'] });
    const [enrolled, existing] = await Promise.all([
      this.prisma.enrollment.findMany({ where: { classGroupId: a.teachingAssignment.classGroupId, studentId: { in: ids }, ...activeOn(today) }, select: { studentId: true } }),
      this.prisma.gradeEntry.findMany({ where: { assessmentId, studentId: { in: ids } }, include: { student: { select: { person: { select: { fullName: true } } } } } }),
    ]);
    const byStudent = new Map(existing.map((e) => [e.studentId, e]));
    const allowed = new Set([...enrolled.map((e) => e.studentId), ...existing.map((e) => e.studentId)]);
    const foreign = ids.filter((id) => !allowed.has(id));
    if (foreign.length) throw validationFailed(`${foreign.length} siswa bukan peserta rombel ini.`, { entries: ['Siswa di luar rombel.'] });

    const stale = input.entries.filter((e) => {
      const cur = byStudent.get(e.studentId);
      return cur && e.versionNo != null && e.versionNo !== cur.versionNo;
    });
    if (stale.length) {
      throw conflict(`Nilai ${stale.length} siswa sudah diubah orang lain sejak halaman dibuka. Muat ulang lalu ulangi.`, {
        entries: stale.map((e) => byStudent.get(e.studentId)!.student.person.fullName),
      });
    }

    const changed = input.entries.filter((e) => {
      const cur = byStudent.get(e.studentId);
      return !cur || cur.state !== e.state || cur.score !== (e.score ?? null) || (cur.feedback ?? null) !== (e.feedback ?? null);
    });
    const gradeChanged = (e: (typeof changed)[number]) => {
      const cur = byStudent.get(e.studentId);
      return (cur?.state ?? 'PENDING') !== e.state || (cur?.score ?? null) !== (e.score ?? null);
    };
    if (a.status === 'PUBLISHED' && changed.some(gradeChanged) && !input.reason) {
      throw validationFailed('Penilaian sudah terbit: perubahan nilai wajib disertai alasan.', { reason: ['Isi alasan perubahan.'] });
    }
    await this.prisma.$transaction(async (tx) => {
      for (const e of changed) {
        const cur = byStudent.get(e.studentId);
        const data = { state: e.state, score: e.state === 'SCORED' ? (e.score ?? null) : null, feedback: e.feedback ?? null, updatedById: auth.userId };
        if (!cur) {
          await tx.gradeEntry.create({ data: { ...data, assessmentId, studentId: e.studentId } });
          if (a.status === 'PUBLISHED' && e.state !== 'PENDING') {
            const created = await tx.gradeEntry.findUniqueOrThrow({ where: { assessmentId_studentId: { assessmentId, studentId: e.studentId } }, select: { id: true } });
            await tx.gradeChange.create({ data: { gradeEntryId: created.id, oldState: 'PENDING', oldScore: null, newState: e.state, newScore: data.score, reason: input.reason!, actorId: auth.userId } });
          }
          continue;
        }
        await tx.gradeEntry.update({ where: { id: cur.id }, data: { ...data, versionNo: { increment: 1 } } });
        if (a.status === 'PUBLISHED' && gradeChanged(e)) {
          await tx.gradeChange.create({ data: { gradeEntryId: cur.id, oldState: cur.state, oldScore: cur.score, newState: e.state, newScore: data.score, reason: input.reason!, actorId: auth.userId } });
        }
      }
      if (changed.length) {
        await this.audit.record(
          { schoolId: auth.schoolId, actorUserId: auth.userId, action: a.status === 'PUBLISHED' ? 'grade.correct' : 'grade.save', entityType: 'assessment', entityId: assessmentId, requestId: meta.requestId, metadata: { changed: changed.length, reason: input.reason ?? null } },
          tx,
        );
      }
    });
    return { changed: changed.length };
  }

  async publish(auth: AuthContext, id: string, meta: RequestMeta) {
    const a = await this.loadAssessment(auth, id);
    await this.requireTeacher(auth, a.teachingAssignment);
    if (a.status === 'PUBLISHED') throw conflict('Penilaian sudah terbit.');
    await this.prisma.assessment.update({ where: { id }, data: { status: 'PUBLISHED', publishedAt: new Date(), publishedById: auth.userId } });
    await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'assessment.publish', entityType: 'assessment', entityId: id, requestId: meta.requestId, metadata: { title: a.title } });
    await this.portal.notifyGradesPublished(id);
  }

  /** Riwayat perubahan nilai terbit pada satu penilaian. */
  async changes(auth: AuthContext, id: string) {
    const a = await this.loadAssessment(auth, id);
    await this.checkAccess(auth, a.teachingAssignment);
    const rows = await this.prisma.gradeChange.findMany({
      where: { gradeEntry: { assessmentId: id } },
      include: { gradeEntry: { select: { student: { select: { person: { select: { fullName: true } } } } } } },
      orderBy: { createdAt: 'desc' },
    });
    const actors = await this.prisma.user.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.actorId))] } }, select: { id: true, email: true, person: { select: { fullName: true } } } });
    const name = new Map(actors.map((u) => [u.id, u.person?.fullName ?? u.email]));
    return rows.map((r) => ({
      id: r.id,
      student: r.gradeEntry.student.person.fullName,
      oldState: r.oldState,
      oldScore: r.oldScore,
      newState: r.newState,
      newScore: r.newScore,
      reason: r.reason,
      actor: name.get(r.actorId) ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
  }
}
