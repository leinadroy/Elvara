import { Injectable, NotFoundException } from '@nestjs/common';
import type { PortalGrades, PortalSubjectGrades } from '@smart-school/contracts';
import { activeOn } from '../academics/classes.service.js';
import { ScopeService } from '../academics/scope.service.js';
import type { AuthContext } from '../auth/auth.types.js';
import { fromDbDate, toDbDate } from '../common/dates.js';
import { todayIn } from '../common/school-time.js';
import { NotificationsService, type NotificationDraft } from '../communications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { computeFinal } from './compute.js';
import { SchemesService } from './schemes.service.js';

/**
 * Nilai di portal siswa dan wali (PRD R2 E14) dan notifikasi akademik (FR-14.3).
 * Hanya penilaian terbit yang tampil; nilai akhir dihitung dengan aturan yang sama dengan buku nilai.
 * Wali melihat anak dengan hubungan terverifikasi dan izin akademik.
 */
@Injectable()
export class PortalGradesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
    private readonly schemes: SchemesService,
    private readonly notifications: NotificationsService,
  ) {}

  private async today(schoolId: string) {
    return todayIn((await this.prisma.school.findUniqueOrThrow({ where: { id: schoolId }, select: { timezone: true } })).timezone);
  }

  async portal(auth: AuthContext, q: { studentId?: string; termId?: string }): Promise<PortalGrades> {
    const sid = await this.scope.portalStudentId(auth, 'academic', q.studentId);
    const today = await this.today(auth.schoolId);
    const student = await this.prisma.student.findUniqueOrThrow({ where: { id: sid }, select: { id: true, person: { select: { fullName: true } } } });
    const term = q.termId
      ? await this.prisma.term.findFirst({ where: { id: q.termId, academicYear: { schoolId: auth.schoolId } }, select: { id: true, name: true } })
      : await this.prisma.term.findFirst({ where: { academicYear: { schoolId: auth.schoolId, status: 'ACTIVE' }, startDate: { lte: toDbDate(today) }, endDate: { gte: toDbDate(today) } }, select: { id: true, name: true } });
    if (q.termId && !term) throw new NotFoundException('Semester tidak ditemukan.');
    const cls = await this.scope.classOf(sid, today);
    const base = { student: { id: student.id, fullName: student.person.fullName }, term, classGroup: cls };
    if (!cls || !term) return { ...base, subjects: [] };

    const tas = await this.prisma.teachingAssignment.findMany({
      where: { termId: term.id, classGroupId: cls.id },
      include: {
        subject: { select: { id: true, code: true, name: true } },
        classGroup: { select: { gradeLevelId: true } },
        employee: { select: { person: { select: { fullName: true } } } },
        assessments: {
          where: { status: 'PUBLISHED' },
          include: { component: { select: { code: true, name: true } }, entries: { where: { studentId: sid } } },
          orderBy: [{ assessedOn: 'asc' }, { publishedAt: 'asc' }],
        },
      },
      orderBy: [{ subject: { name: 'asc' } }, { teachingRole: 'asc' }],
    });
    // Satu baris per mapel: guru utama didahulukan (MAIN < ASSISTANT); penilaian guru pendamping ikut digabung.
    const bySubject = new Map<string, typeof tas>();
    for (const t of tas) bySubject.set(t.subjectId, [...(bySubject.get(t.subjectId) ?? []), t]);
    const subjects: PortalSubjectGrades[] = [];
    for (const group of bySubject.values()) {
      const main = group[0]!;
      const scheme = await this.schemes.published(term.id, main.subjectId, main.classGroup.gradeLevelId);
      const assessments = group.flatMap((t) => t.assessments);
      const cells = new Map(assessments.map((a) => [a.id, a.entries[0]]));
      const final = computeFinal(
        scheme?.components ?? [],
        scheme?.passingScore ?? null,
        assessments.map((a) => ({ id: a.id, title: a.title, componentCode: a.component.code })),
        (id) => cells.get(id),
      );
      subjects.push({
        teachingAssignmentId: main.id,
        subject: main.subject,
        teacher: main.employee.person.fullName,
        scheme: scheme ? { versionNo: scheme.versionNo, components: scheme.components.map(({ code, name, weight }) => ({ code, name, weight })), passingScore: scheme.passingScore } : null,
        assessments: assessments.map((a) => {
          const e = cells.get(a.id);
          return {
            id: a.id,
            title: a.title,
            component: a.component,
            assessedOn: a.assessedOn ? fromDbDate(a.assessedOn) : null,
            publishedAt: a.publishedAt?.toISOString() ?? null,
            cell: e ? { state: e.state, score: e.score, feedback: e.feedback, versionNo: e.versionNo } : null,
          };
        }),
        final,
      });
    }
    return { ...base, subjects };
  }

  /** Akun siswa rombel (hari ini) dan akun wali terverifikasi berizin akademik, dengan siswa yang terkait. */
  private async classAudience(classGroupId: string, schoolId: string) {
    const today = await this.today(schoolId);
    const enrolled = await this.prisma.enrollment.findMany({ where: { classGroupId, ...activeOn(today) }, select: { studentId: true } });
    return this.audience(enrolled.map((e) => e.studentId));
  }

  /** Akun siswa dan wali terverifikasi berizin akademik untuk satu siswa (mis. rapor terbit). */
  studentAudience(studentId: string) {
    return this.audience([studentId]);
  }

  private async audience(ids: string[]) {
    const now = new Date();
    const [students, links] = await Promise.all([
      this.prisma.user.findMany({ where: { status: 'ACTIVE', person: { student: { id: { in: ids } } } }, select: { id: true, person: { select: { student: { select: { id: true } } } } } }),
      this.prisma.studentGuardian.findMany({
        where: { studentId: { in: ids }, status: 'VERIFIED', canViewAcademic: true, validFrom: { lte: now }, OR: [{ validUntil: null }, { validUntil: { gt: now } }] },
        select: { studentId: true, guardian: { select: { person: { select: { user: { select: { id: true, status: true } } } } } } },
      }),
    ]);
    return {
      students: students.map((u) => ({ userId: u.id, studentId: u.person!.student!.id })),
      guardians: links.flatMap((l) => (l.guardian.person.user?.status === 'ACTIVE' ? [{ userId: l.guardian.person.user.id, studentId: l.studentId }] : [])),
    };
  }

  /** Notifikasi saat nilai satu penilaian terbit. Satu notifikasi per penerima per kejadian. */
  async notifyGradesPublished(assessmentId: string) {
    const a = await this.prisma.assessment.findUniqueOrThrow({
      where: { id: assessmentId },
      select: { id: true, schoolId: true, title: true, teachingAssignment: { select: { classGroupId: true, subject: { select: { name: true } } } } },
    });
    const who = await this.classAudience(a.teachingAssignment.classGroupId, a.schoolId);
    const title = `Nilai ${a.teachingAssignment.subject.name} terbit`;
    const body = `Nilai "${a.title}" sudah dapat dilihat.`;
    const drafts: NotificationDraft[] = [
      ...who.students.map((s) => ({ recipientId: s.userId, title, body, link: '/student/grades' })),
      ...who.guardians.map((g) => ({ recipientId: g.userId, title, body, link: `/guardian/grades?studentId=${g.studentId}` })),
    ];
    return this.notifications.emit(null, { schoolId: a.schoolId, sourceEventId: `assessment.published:${a.id}`, eventType: 'grade.published', payload: { assessmentId: a.id } }, drafts);
  }

  /** Notifikasi saat tugas baru terbit. */
  async notifyActivityPublished(activityId: string) {
    const act = await this.prisma.learningActivity.findUniqueOrThrow({
      where: { id: activityId },
      select: { id: true, schoolId: true, title: true, dueAt: true, acceptsSubmissions: true, teachingAssignment: { select: { classGroupId: true, subject: { select: { name: true } } } } },
    });
    const who = await this.classAudience(act.teachingAssignment.classGroupId, act.schoolId);
    const tz = (await this.prisma.school.findUniqueOrThrow({ where: { id: act.schoolId }, select: { timezone: true } })).timezone;
    const due = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: tz }).format(act.dueAt);
    const title = `Tugas baru ${act.teachingAssignment.subject.name}`;
    const body = `${act.title} · tenggat ${due}.`;
    const drafts: NotificationDraft[] = [
      ...who.students.map((s) => ({ recipientId: s.userId, title, body, link: `/student/assignments/${act.id}` })),
      ...who.guardians.map((g) => ({ recipientId: g.userId, title, body, link: `/guardian/assignments/${act.id}?studentId=${g.studentId}` })),
    ];
    return this.notifications.emit(null, { schoolId: act.schoolId, sourceEventId: `activity.published:${act.id}`, eventType: 'activity.published', payload: { activityId: act.id } }, drafts);
  }
}
