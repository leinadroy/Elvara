import { Injectable, NotFoundException } from '@nestjs/common';
import type { AssessmentGradeRow, AssessmentGradeSheet, AssessmentView, CreateAssessmentSchema, GradeEntrySaveSchema, PublishedGradeChange, PublishedGradeCorrectionSchema, TeacherAssessmentOption } from '@smart-school/contracts';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service.js';
import type { AuthContext } from '../auth/auth.types.js';
import { conflict, validationFailed } from '../common/api-exception.filter.js';
import { fromDbDate, toDbDate } from '../common/dates.js';
import type { RequestMeta } from '../common/request-meta.js';
import { todayIn } from '../common/school-time.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { aggregateGrade } from './grade-aggregate.js';
import { NotificationsService, type NotificationDraft } from '../communications/notifications.service.js';
import type { GradeAggregateVersion } from '@smart-school/contracts';
import type { AssignmentGradeBook } from '@smart-school/contracts';
import type { CreateActivitySchema } from '@smart-school/contracts';

function groupBy<T>(items: T[], keyOf: (item: T) => string) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }
  return groups;
}

const ASSESSMENT_INCLUDE = {
  component: { select: { id: true, code: true, name: true, schemeVersion: { select: { versionNo: true } } } },
} satisfies Prisma.AssessmentInclude;
type AssessmentRow = Prisma.AssessmentGetPayload<{ include: typeof ASSESSMENT_INCLUDE }>;

function view(row: AssessmentRow): AssessmentView {
  return {
    id: row.id,
    teachingAssignmentId: row.teachingAssignmentId,
    title: row.title,
    assessedOn: fromDbDate(row.assessedOn),
    status: row.status,
    component: {
      id: row.component.id,
      code: row.component.code,
      name: row.component.name,
      schemeVersionNo: row.component.schemeVersion.versionNo,
    },
    createdAt: row.createdAt.toISOString(),
  };
}

/** Tahap pertama E13: guru membuat dan melihat penilaian draf pada kelas yang ia ajar. */
@Injectable()
export class AssessmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async options(auth: AuthContext): Promise<TeacherAssessmentOption[]> {
    if (!auth.personId) return [];
    const assignments = await this.prisma.teachingAssignment.findMany({
      where: { schoolId: auth.schoolId, employee: { personId: auth.personId }, term: { academicYear: { status: 'ACTIVE' } } },
      select: { id: true, termId: true, subjectId: true, subject: { select: { name: true } }, classGroup: { select: { code: true, gradeLevelId: true } }, term: { select: { name: true } } },
      orderBy: [{ classGroup: { code: 'asc' } }, { subject: { name: 'asc' } }],
    });
    if (!assignments.length) return [];
    const schemes = await this.prisma.gradeSchemeVersion.findMany({
      where: { schoolId: auth.schoolId, status: 'PUBLISHED', termId: { in: assignments.map((a) => a.termId) }, subjectId: { in: assignments.map((a) => a.subjectId) }, gradeLevelId: { in: assignments.map((a) => a.classGroup.gradeLevelId) } },
      select: { termId: true, subjectId: true, gradeLevelId: true, components: { select: { id: true, code: true, name: true }, orderBy: { sortOrder: 'asc' } } },
    });
    const byKey = new Map(schemes.map((s) => [`${s.termId}:${s.subjectId}:${s.gradeLevelId}`, s.components]));
    return assignments.map((a) => ({
      teachingAssignmentId: a.id,
      classCode: a.classGroup.code,
      subjectName: a.subject.name,
      termName: a.term.name,
      components: byKey.get(`${a.termId}:${a.subjectId}:${a.classGroup.gradeLevelId}`) ?? [],
    }));
  }

  private async assignment(auth: AuthContext, id: string) {
    if (!auth.personId) throw new NotFoundException('Penugasan mengajar tidak ditemukan.');
    const assignment = await this.prisma.teachingAssignment.findFirst({
      where: { id, schoolId: auth.schoolId, employee: { personId: auth.personId } },
      select: {
        id: true,
        termId: true,
        classGroupId: true,
        subjectId: true,
        classGroup: { select: { gradeLevelId: true } },
        term: { select: { startDate: true, endDate: true } },
      },
    });
    if (!assignment) throw new NotFoundException('Penugasan mengajar tidak ditemukan.');
    return assignment;
  }

  async list(auth: AuthContext, teachingAssignmentId: string): Promise<AssessmentView[]> {
    await this.assignment(auth, teachingAssignmentId);
    const rows = await this.prisma.assessment.findMany({
      where: { schoolId: auth.schoolId, teachingAssignmentId },
      include: ASSESSMENT_INCLUDE,
      orderBy: [{ assessedOn: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map(view);
  }

  async aggregates(auth: AuthContext, teachingAssignmentId: string): Promise<GradeAggregateVersion[]> {
    await this.assignment(auth, teachingAssignmentId);
    return this.aggregateForAssignment(auth.schoolId, teachingAssignmentId);
  }

  async gradeBook(auth: AuthContext, teachingAssignmentId: string): Promise<AssignmentGradeBook> {
    const assignment = await this.assignment(auth, teachingAssignmentId);
    const [school, assessments] = await Promise.all([
      this.prisma.school.findUniqueOrThrow({ where: { id: auth.schoolId }, select: { timezone: true } }),
      this.prisma.assessment.findMany({
        where: { schoolId: auth.schoolId, teachingAssignmentId },
        select: {
          id: true, title: true, status: true, assessedOn: true,
          entries: { select: { studentId: true, state: true, score: true, feedback: true, student: { select: { nis: true, person: { select: { fullName: true } } } } } },
        },
        orderBy: [{ assessedOn: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
      }),
    ]);
    const today = toDbDate(todayIn(school.timezone));
    const { startDate, endDate } = assignment.term;
    const fallback = today < startDate ? startDate : today > endDate ? endDate : today;
    const drafts = assessments.filter((assessment) => assessment.status === 'DRAFT');
    const enrollments = drafts.length ? await this.prisma.enrollment.findMany({
      where: { classGroupId: assignment.classGroupId, validFrom: { lte: endDate }, OR: [{ validTo: null }, { validTo: { gte: startDate } }] },
      select: { studentId: true, validFrom: true, validTo: true, student: { select: { nis: true, person: { select: { fullName: true } } } } },
    }) : [];
    const students = new Map<string, AssignmentGradeBook['students'][number]>();
    for (const assessment of assessments) {
      const date = assessment.assessedOn ?? fallback;
      const entries = new Map(assessment.entries.map((entry) => [entry.studentId, entry]));
      const roster = assessment.status === 'PUBLISHED'
        ? assessment.entries
        : enrollments.filter((entry) => entry.validFrom <= date && (!entry.validTo || entry.validTo >= date));
      for (const { studentId, student } of roster) {
        const row = students.get(studentId) ?? { studentId, nis: student.nis, fullName: student.person.fullName, cells: {} };
        const entry = entries.get(studentId);
        row.cells[assessment.id] = { state: entry?.state ?? 'PENDING', score: entry?.score ?? null, feedback: entry?.feedback ?? null };
        students.set(studentId, row);
      }
    }
    return {
      assessments: assessments.map(({ id, title, status }) => ({ id, title, status })),
      students: [...students.values()].sort((a, b) => a.fullName.localeCompare(b.fullName, 'id') || a.nis.localeCompare(b.nis)),
    };
  }

  /** Pemanggil di dalam modul harus memeriksa cakupan penugasan atau rombel terlebih dahulu. */
  async aggregateForAssignment(schoolId: string, teachingAssignmentId: string, db: Prisma.TransactionClient = this.prisma): Promise<GradeAggregateVersion[]> {
    const assessments = await db.assessment.findMany({
      where: { schoolId, teachingAssignmentId, status: 'PUBLISHED' },
      select: {
        componentId: true,
        component: { select: { schemeVersion: { select: {
          id: true, versionNo: true, passingScore: true, roundingRule: true,
          components: { select: { id: true, name: true, weight: true }, orderBy: { sortOrder: 'asc' } },
        } } } },
        entries: { select: { studentId: true, state: true, score: true, student: { select: { nis: true, person: { select: { fullName: true } } } } } },
      },
    });
    const byVersion = groupBy(assessments, (row) => row.component.schemeVersion.id);
    return [...byVersion.values()].map((rows) => {
      const scheme = rows[0]!.component.schemeVersion;
      if (scheme.roundingRule !== 'HALF_UP_INTEGER') throw conflict('Aturan pembulatan skema belum didukung.');
      const gradesByStudent = groupBy(
        rows.flatMap((row) => row.entries.map((entry) => ({ ...entry, componentId: row.componentId }))),
        (entry) => entry.studentId,
      );
      return {
        schemeVersionId: scheme.id,
        versionNo: scheme.versionNo,
        passingScore: scheme.passingScore,
        students: [...gradesByStudent].map(([studentId, entries]) => {
          const byComponent = groupBy(entries, (entry) => entry.componentId);
          const components = scheme.components.map((component) => ({ ...component, entries: byComponent.get(component.id) ?? [] }));
          const { nis, person } = entries[0]!.student;
          return { studentId, nis, fullName: person.fullName, ...aggregateGrade(components, scheme.passingScore) };
        }).sort((a, b) => a.fullName.localeCompare(b.fullName, 'id') || a.nis.localeCompare(b.nis)),
      };
    }).sort((a, b) => b.versionNo - a.versionNo);
  }

  async create(auth: AuthContext, input: z.infer<typeof CreateAssessmentSchema>, meta: RequestMeta, activity?: z.infer<typeof CreateActivitySchema>): Promise<AssessmentView> {
    const assignment = await this.assignment(auth, input.teachingAssignmentId);
    const component = await this.prisma.gradeComponent.findFirst({
      where: {
        id: input.componentId,
        schemeVersion: {
          schoolId: auth.schoolId,
          termId: assignment.termId,
          subjectId: assignment.subjectId,
          gradeLevelId: assignment.classGroup.gradeLevelId,
          status: 'PUBLISHED',
        },
      },
      select: { id: true },
    });
    if (!component) {
      const published = await this.prisma.gradeSchemeVersion.findFirst({
        where: { schoolId: auth.schoolId, termId: assignment.termId, subjectId: assignment.subjectId, gradeLevelId: assignment.classGroup.gradeLevelId, status: 'PUBLISHED' },
        select: { id: true },
      });
      if (!published) throw conflict('Skema nilai untuk mapel, tingkat, dan semester ini belum terbit.');
      throw validationFailed('Komponen nilai tidak berlaku untuk kelas ini.', { componentId: ['Pilih komponen dari skema yang sedang terbit.'] });
    }
    const assessedOn = input.assessedOn ? toDbDate(input.assessedOn) : null;
    if (assessedOn && (assessedOn < assignment.term.startDate || assessedOn > assignment.term.endDate)) {
      throw validationFailed('Tanggal penilaian di luar semester.', { assessedOn: ['Pilih tanggal dalam semester penugasan.'] });
    }
    const row = await this.prisma.$transaction(async (tx) => {
      const linked = activity ? await tx.learningActivity.create({
        data: {
          schoolId: auth.schoolId,
          teachingAssignmentId: assignment.id,
          title: input.title,
          kind: activity.kind,
          instructions: activity.instructions,
          opensAt: new Date(activity.opensAt),
          dueAt: new Date(activity.dueAt),
          allowLate: activity.allowLate,
          allowResubmit: activity.allowResubmit,
          acceptsSubmissions: activity.acceptsSubmissions,
          createdById: auth.userId,
        },
        select: { id: true },
      }) : null;
      const created = await tx.assessment.create({
        data: {
          schoolId: auth.schoolId,
          teachingAssignmentId: assignment.id,
          componentId: component.id,
          title: input.title,
          assessedOn,
          createdById: auth.userId,
          activityId: linked?.id,
        },
        include: ASSESSMENT_INCLUDE,
      });
      await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'assessment.create', entityType: 'assessment', entityId: created.id, requestId: meta.requestId, metadata: { teachingAssignmentId: assignment.id, componentId: component.id } }, tx);
      return created;
    });
    return view(row);
  }

  private async ownedAssessment(auth: AuthContext, id: string) {
    if (!auth.personId) throw new NotFoundException('Penilaian tidak ditemukan.');
    const assessment = await this.prisma.assessment.findFirst({
      where: { id, schoolId: auth.schoolId, teachingAssignment: { employee: { personId: auth.personId } } },
      include: {
        ...ASSESSMENT_INCLUDE,
        teachingAssignment: { select: { classGroupId: true, term: { select: { startDate: true, endDate: true } } } },
      },
    });
    if (!assessment) throw new NotFoundException('Penilaian tidak ditemukan.');
    return assessment;
  }

  private async rosterDate(auth: AuthContext, assessment: Awaited<ReturnType<AssessmentsService['ownedAssessment']>>) {
    if (assessment.assessedOn) return fromDbDate(assessment.assessedOn);
    const school = await this.prisma.school.findUniqueOrThrow({ where: { id: auth.schoolId }, select: { timezone: true } });
    const today = todayIn(school.timezone);
    const from = fromDbDate(assessment.teachingAssignment.term.startDate);
    const to = fromDbDate(assessment.teachingAssignment.term.endDate);
    return today < from ? from : today > to ? to : today;
  }

  private enrollmentOn(classGroupId: string, date: string) {
    const d = toDbDate(date);
    return { classGroupId, validFrom: { lte: d }, OR: [{ validTo: null }, { validTo: { gte: d } }] };
  }

  /** Serialize draft saves and publication on the same assessment row. */
  private async lockDraft(tx: Prisma.TransactionClient, schoolId: string, id: string) {
    const [assessment] = await tx.$queryRaw<{ status: string }[]>`
      SELECT status FROM assessment
      WHERE id = ${id}::uuid AND "schoolId" = ${schoolId}::uuid
      FOR UPDATE
    `;
    if (!assessment) throw new NotFoundException('Penilaian tidak ditemukan.');
    if (assessment.status !== 'DRAFT') throw conflict('Penilaian sudah terbit. Muat ulang halaman.');
  }

  async grades(auth: AuthContext, id: string): Promise<AssessmentGradeSheet> {
    const assessment = await this.ownedAssessment(auth, id);
    const rosterDate = await this.rosterDate(auth, assessment);
    if (assessment.status === 'PUBLISHED') {
      const entries = await this.prisma.gradeEntry.findMany({
        where: { assessmentId: id },
        select: { studentId: true, state: true, score: true, feedback: true, versionNo: true, student: { select: { nis: true, person: { select: { fullName: true } } } } },
        orderBy: { student: { person: { fullName: 'asc' } } },
      });
      return { assessment: view(assessment), rosterDate, students: entries.map((e) => ({ studentId: e.studentId, nis: e.student.nis, fullName: e.student.person.fullName, state: e.state, score: e.score, feedback: e.feedback, versionNo: e.versionNo })) };
    }
    const enrollments = await this.prisma.enrollment.findMany({
      where: this.enrollmentOn(assessment.teachingAssignment.classGroupId, rosterDate),
      select: { studentId: true, student: { select: { nis: true, person: { select: { fullName: true } } } } },
      orderBy: { student: { person: { fullName: 'asc' } } },
    });
    const entries = await this.prisma.gradeEntry.findMany({ where: { assessmentId: id, studentId: { in: enrollments.map((e) => e.studentId) } } });
    const byStudent = new Map(entries.map((e) => [e.studentId, e]));
    const students: AssessmentGradeRow[] = enrollments.map((e) => {
      const entry = byStudent.get(e.studentId);
      return {
        studentId: e.studentId,
        nis: e.student.nis,
        fullName: e.student.person.fullName,
        state: entry?.state ?? 'PENDING',
        score: entry?.score ?? null,
        feedback: entry?.feedback ?? null,
        versionNo: entry?.versionNo ?? 0,
      };
    });
    return { assessment: view(assessment), rosterDate, students };
  }

  async saveGrade(auth: AuthContext, id: string, studentId: string, input: z.infer<typeof GradeEntrySaveSchema>, meta: RequestMeta): Promise<AssessmentGradeRow> {
    const { rows } = await this.saveGrades(auth, id, [{ ...input, studentId }], meta);
    return rows[0]!;
  }

  async saveGrades(auth: AuthContext, id: string, inputs: (z.infer<typeof GradeEntrySaveSchema> & { studentId: string })[], meta: RequestMeta) {
    const assessment = await this.ownedAssessment(auth, id);
    if (assessment.status !== 'DRAFT') throw conflict('Nilai terbit belum dapat diubah dari halaman ini.');
    const date = await this.rosterDate(auth, assessment);
    return this.prisma.$transaction(async (tx) => {
      await this.lockDraft(tx, auth.schoolId, id);
      const ids = inputs.map((input) => input.studentId);
      const roster = await tx.enrollment.findMany({
        where: { ...this.enrollmentOn(assessment.teachingAssignment.classGroupId, date), studentId: { in: ids } },
        select: { studentId: true, student: { select: { nis: true, person: { select: { fullName: true } } } } },
      });
      const students = new Map(roster.map((row) => [row.studentId, row.student]));
      const invalid = inputs.findIndex((input) => !students.has(input.studentId));
      if (invalid >= 0) throw new NotFoundException(`Baris ${invalid + 1}: siswa tidak ditemukan dalam rombel pada tanggal penilaian.`);
      const existing = await tx.gradeEntry.findMany({ where: { assessmentId: id, studentId: { in: ids } } });
      const byStudent = new Map(existing.map((row) => [row.studentId, row]));
      const stale = inputs.flatMap((input, index) => (byStudent.get(input.studentId)?.versionNo ?? 0) === input.versionNo
        ? [] : [`${index + 1} (${students.get(input.studentId)!.person.fullName})`]);
      if (stale.length) throw conflict(`Nilai sudah berubah pada baris ${stale.join(', ')}. Muat ulang halaman sebelum menyimpan.`);
      const rows: AssessmentGradeRow[] = [];
      for (const input of inputs) {
        const studentId = input.studentId;
        const student = students.get(studentId)!;
        const current = byStudent.get(studentId);
        const data = { state: input.state, score: input.score, feedback: input.feedback, updatedById: auth.userId };
        let saved;
        if (current) {
          saved = await tx.gradeEntry.update({ where: { id: current.id }, data: { ...data, versionNo: { increment: 1 } } });
        } else {
          saved = await tx.gradeEntry.create({ data: { ...data, assessmentId: id, studentId, versionNo: 1 } });
        }
        await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'grade_entry.save_draft', entityType: 'grade_entry', entityId: saved.id, requestId: meta.requestId, metadata: { assessmentId: id, studentId, versionNo: saved.versionNo, state: saved.state } }, tx);
        rows.push({ studentId, nis: student.nis, fullName: student.person.fullName, state: saved.state, score: saved.score, feedback: saved.feedback, versionNo: saved.versionNo });
      }
      return { changed: rows.length, rows };
    }, { timeout: 15000 });
  }

  async publish(auth: AuthContext, id: string, meta: RequestMeta): Promise<void> {
    const assessment = await this.ownedAssessment(auth, id);
    if (assessment.status !== 'DRAFT') throw conflict('Penilaian sudah diterbitkan.');
    const date = await this.rosterDate(auth, assessment);
    await this.prisma.$transaction(async (tx) => {
      await this.lockDraft(tx, auth.schoolId, id);
      const roster = await tx.enrollment.findMany({
        where: this.enrollmentOn(assessment.teachingAssignment.classGroupId, date),
        select: { studentId: true },
      });
      const studentIds = [...new Set(roster.map((r) => r.studentId))];
      if (!studentIds.length) throw conflict('Tidak ada siswa pada tanggal penilaian.');
      const entries = await tx.gradeEntry.findMany({ where: { assessmentId: id, studentId: { in: studentIds } }, select: { studentId: true, state: true } });
      const resolved = new Set(entries.filter((e) => e.state !== 'PENDING').map((e) => e.studentId));
      if (resolved.size !== studentIds.length) throw conflict(`Masih ada ${studentIds.length - resolved.size} siswa yang belum dinilai.`);
      const excluded = await tx.gradeEntry.deleteMany({ where: { assessmentId: id, studentId: { notIn: studentIds } } });
      const result = await tx.assessment.updateMany({ where: { id, schoolId: auth.schoolId, status: 'DRAFT' }, data: { status: 'PUBLISHED', assessedOn: assessment.assessedOn ?? toDbDate(date), publishedAt: new Date(), publishedById: auth.userId } });
      if (result.count !== 1) throw conflict('Penilaian sudah diterbitkan. Muat ulang halaman.');
      await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'assessment.publish', entityType: 'assessment', entityId: id, requestId: meta.requestId, metadata: { studentCount: studentIds.length, excludedDraftCount: excluded.count } }, tx);
      await this.notifyPublication(tx, auth.schoolId, id, studentIds, 'grades');
    });
  }

  async notifyPublication(tx: Prisma.TransactionClient, schoolId: string, itemId: string, studentIds: string[], area: 'grades' | 'activities' | 'reports') {
    const now = new Date();
    const eligibleLinks = {
      studentId: { in: studentIds },
      status: 'VERIFIED' as const,
      canViewAcademic: true,
      validFrom: { lte: now },
      OR: [{ validUntil: null }, { validUntil: { gt: now } }],
    };
    const [students, guardians] = await Promise.all([
      tx.user.findMany({
        where: { status: 'ACTIVE', roles: { some: { schoolId, role: 'STUDENT' } }, person: { student: { id: { in: studentIds } } } },
        select: { id: true },
      }),
      tx.user.findMany({
        where: { status: 'ACTIVE', roles: { some: { schoolId, role: 'GUARDIAN' } }, person: { guardian: { students: { some: eligibleLinks } } } },
        select: { id: true, person: { select: { guardian: { select: { students: { where: eligibleLinks, select: { studentId: true }, take: 2 } } } } } },
      }),
    ]);
    const publication = {
      grades: { title: 'Nilai baru tersedia', eventType: 'assessment.published' },
      activities: { title: 'Tugas baru diterbitkan', eventType: 'activity.published' },
      reports: { title: 'Rapor baru tersedia', eventType: 'report_card.published' },
    }[area];
    const { title, eventType } = publication;
    const drafts: NotificationDraft[] = guardians.map((guardian) => {
      const links = guardian.person?.guardian?.students ?? [];
      return {
        recipientId: guardian.id, title, body: 'Buka portal untuk melihat rinciannya.',
        link: links.length === 1 ? `/guardian/${area}?studentId=${links[0]!.studentId}` : `/guardian/${area}`,
      };
    });
    drafts.push(...students.map((student) => ({
      recipientId: student.id, title, body: 'Buka portal untuk melihat rinciannya.', link: `/student/${area}`,
    })));
    await this.notifications.emit(tx, { schoolId, sourceEventId: `${eventType}:${itemId}`, eventType }, drafts);
  }

  async correctGrade(auth: AuthContext, id: string, studentId: string, input: z.infer<typeof PublishedGradeCorrectionSchema>, meta: RequestMeta): Promise<AssessmentGradeRow> {
    const assessment = await this.ownedAssessment(auth, id);
    if (assessment.status !== 'PUBLISHED') throw conflict('Koreksi hanya berlaku untuk penilaian terbit.');
    const saved = await this.prisma.$transaction(async (tx) => {
      const current = await tx.gradeEntry.findUnique({ where: { assessmentId_studentId: { assessmentId: id, studentId } }, include: { student: { select: { nis: true, person: { select: { fullName: true } } } } } });
      if (!current) throw new NotFoundException('Nilai siswa tidak ditemukan pada penilaian ini.');
      if (current.versionNo !== input.versionNo) throw conflict('Nilai sudah berubah. Muat ulang halaman sebelum mengoreksi.');
      if (current.state === input.state && current.score === input.score && current.feedback === input.feedback) throw conflict('Tidak ada perubahan nilai atau umpan balik.');
      const updated = await tx.gradeEntry.updateMany({ where: { id: current.id, versionNo: input.versionNo, assessment: { status: 'PUBLISHED' } }, data: { state: input.state, score: input.score, feedback: input.feedback, updatedById: auth.userId, versionNo: { increment: 1 } } });
      if (updated.count !== 1) throw conflict('Nilai sudah berubah. Muat ulang halaman sebelum mengoreksi.');
      const change = await tx.gradeChange.create({ data: { gradeEntryId: current.id, oldState: current.state, oldScore: current.score, newState: input.state, newScore: input.score, reason: input.reason, actorId: auth.userId } });
      await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'grade_entry.correct_published', entityType: 'grade_entry', entityId: current.id, requestId: meta.requestId, metadata: { assessmentId: id, studentId, changeId: change.id, versionNo: input.versionNo + 1, reason: input.reason, oldState: current.state, oldScore: current.score, oldFeedback: current.feedback, newState: input.state, newScore: input.score, newFeedback: input.feedback } }, tx);
      return { ...current, state: input.state, score: input.score, feedback: input.feedback, versionNo: input.versionNo + 1 };
    });
    return { studentId, nis: saved.student.nis, fullName: saved.student.person.fullName, state: saved.state, score: saved.score, feedback: saved.feedback, versionNo: saved.versionNo };
  }

  async changes(auth: AuthContext, id: string, studentId: string): Promise<PublishedGradeChange[]> {
    await this.ownedAssessment(auth, id);
    const entry = await this.prisma.gradeEntry.findUnique({ where: { assessmentId_studentId: { assessmentId: id, studentId } }, select: { id: true } });
    if (!entry) throw new NotFoundException('Nilai siswa tidak ditemukan pada penilaian ini.');
    const rows = await this.prisma.gradeChange.findMany({ where: { gradeEntryId: entry.id }, orderBy: { createdAt: 'desc' } });
    const actors = await this.prisma.user.findMany({ where: { id: { in: rows.map((row) => row.actorId) } }, select: { id: true, email: true, person: { select: { fullName: true } } } });
    const names = new Map(actors.map((actor) => [actor.id, actor.person?.fullName ?? actor.email]));
    return rows.map((row) => ({ id: row.id, oldState: row.oldState, oldScore: row.oldScore, newState: row.newState, newScore: row.newScore, reason: row.reason, actorName: names.get(row.actorId) ?? 'Pengguna', createdAt: row.createdAt.toISOString() }));
  }
}
