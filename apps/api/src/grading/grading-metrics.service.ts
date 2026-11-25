import { Injectable } from '@nestjs/common';
import type { DashboardMetric } from '@smart-school/contracts';
import { activeOn, validOn } from '../academics/classes.service.js';
import { ScopeService } from '../academics/scope.service.js';
import type { AuthContext } from '../auth/auth.types.js';
import { todayIn } from '../common/school-time.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ReportCardsService } from './report-cards.service.js';

/**
 * Angka beranda R2 per peran (PRD R2 E16). Mengikuti aturan FR-8.8: setiap angka membawa definisi dan sumber,
 * dihitung langsung dari data tanpa cache. Semester acuan = semester berjalan, atau semester terakhir yang
 * sudah dimulai (masa pengisian rapor setelah semester berakhir tetap terhitung).
 */
@Injectable()
export class GradingMetricsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
    private readonly cards: ReportCardsService,
  ) {}

  async forRole(auth: AuthContext): Promise<DashboardMetric[]> {
    const s = auth.schoolId;
    const role = auth.activeRole;
    const out: DashboardMetric[] = [];
    const term = await this.cards.term(s);
    if (!term) return out;
    const tz = (await this.prisma.school.findUniqueOrThrow({ where: { id: s }, select: { timezone: true } })).timezone;
    const today = todayIn(tz);
    const ref = this.cards.refDate(term, today);

    if (role === 'TEACHER') {
      const emp = await this.scope.employee(auth);
      if (emp) {
        const tas = await this.prisma.teachingAssignment.findMany({ where: { employeeId: emp.id, termId: term.id }, select: { id: true, subjectId: true, classGroupId: true } });
        const taIds = tas.map((t) => t.id);
        if (tas.length) {
          // FR-16.1 kiriman belum dinilai: kiriman pada tugas bernilai yang nilainya masih "belum dinilai".
          const subs = await this.prisma.submission.findMany({
            where: { activity: { teachingAssignmentId: { in: taIds }, status: { not: 'CANCELLED' }, assessment: { isNot: null } } },
            select: { studentId: true, activity: { select: { assessment: { select: { id: true } } } } },
          });
          const assessmentIds = [...new Set(subs.map((x) => x.activity.assessment!.id))];
          const graded = await this.prisma.gradeEntry.findMany({ where: { assessmentId: { in: assessmentIds }, state: { not: 'PENDING' } }, select: { assessmentId: true, studentId: true } });
          const done = new Set(graded.map((g) => `${g.assessmentId}:${g.studentId}`));
          const ungraded = subs.filter((x) => !done.has(`${x.activity.assessment!.id}:${x.studentId}`)).length;
          const drafts = await this.prisma.assessment.count({ where: { teachingAssignmentId: { in: taIds }, status: 'DRAFT' } });

          // FR-16.1 deskripsi rapor belum diisi: siswa rombel × mapel Anda yang deskripsinya belum lengkap.
          let expected = 0;
          let filled = 0;
          for (const ta of tas) {
            const enrolled = (await this.prisma.enrollment.findMany({ where: { classGroupId: ta.classGroupId, ...activeOn(ref) }, select: { studentId: true } })).map((e) => e.studentId);
            expected += enrolled.length;
            filled += await this.prisma.reportCardSubject.count({
              where: { subjectId: ta.subjectId, highestAchievement: { not: null }, needsImprovement: { not: null }, reportCard: { termId: term.id, studentId: { in: enrolled } } },
            });
          }
          out.push(
            {
              key: 'submissions_ungraded',
              label: 'Kiriman belum dinilai',
              value: ungraded,
              warn: true,
              href: '/teacher/assignments',
              definition: `Kiriman siswa pada tugas Anda (${term.name}) yang terhubung ke penilaian, tetapi nilai siswa itu masih "belum dinilai". Tugas yang dibatalkan tidak dihitung.`,
              source: 'submission, learning_activity, assessment, grade_entry',
            },
            {
              key: 'assessments_unpublished',
              label: 'Penilaian belum terbit',
              value: drafts,
              warn: true,
              href: '/teacher/grades',
              definition: `Penilaian berstatus draf pada penugasan mengajar Anda di ${term.name}. Siswa dan wali belum melihat nilainya dan nilai akhir belum memperhitungkannya.`,
              source: 'assessment',
            },
            {
              key: 'report_descriptions_missing',
              label: 'Deskripsi rapor belum diisi',
              value: Math.max(0, expected - filled),
              note: `dari ${expected} siswa × mapel`,
              warn: true,
              href: '/teacher/report-descriptions',
              definition: `Pasangan siswa × mapel yang Anda ajar di ${term.name} yang capaian tertinggi atau capaian yang perlu ditingkatkan belum diisi. Siswa dihitung dari penempatan rombel yang berlaku.`,
              source: 'teaching_assignment, enrollment, report_card, report_card_subject',
            },
          );
        }

        // FR-16.2 kelengkapan rapor rombel binaan.
        const homerooms = await this.prisma.homeroomAssignment.findMany({ where: { employeeId: emp.id, ...validOn(today) }, select: { classGroup: { select: { id: true, code: true } } } });
        for (const h of homerooms) {
          const r = await this.cards.readiness(s, h.classGroup.id, term);
          out.push({
            key: `report_cards_issues_${h.classGroup.code}`,
            label: `Rapor ${h.classGroup.code} bermasalah`,
            value: r.withIssues,
            note: `${r.ready} siap diajukan · ${r.submitted} diajukan · ${r.published} terbit, dari ${r.students} siswa`,
            warn: true,
            href: `/teacher/report-cards/${h.classGroup.id}`,
            definition: `Rapor draf atau dikembalikan di rombel ${h.classGroup.code} (${term.name}) yang belum dapat diajukan: ada mapel dengan nilai akhir belum lengkap, skema belum terbit, atau deskripsi kosong.`,
            source: 'report_card, report_card_subject, assessment, grade_entry, grade_scheme_version',
          });
        }
      }
    }

    if ((role === 'CURRICULUM' || role === 'ADMIN') && auth.permissions.has('grading:read')) {
      // FR-16.3 progres rapor seluruh rombel.
      const year = await this.prisma.term.findUniqueOrThrow({ where: { id: term.id }, select: { academicYearId: true } });
      const [students, counts] = await Promise.all([
        this.prisma.enrollment.count({ where: { classGroup: { schoolId: s, academicYearId: year.academicYearId, status: 'ACTIVE' }, ...activeOn(ref) } }),
        this.prisma.reportCard.groupBy({ by: ['status'], where: { schoolId: s, termId: term.id }, _count: { _all: true } }),
      ]);
      const n = (k: string) => counts.find((c) => c.status === k)?._count._all ?? 0;
      out.push({
        key: 'report_cards_published',
        label: 'Rapor terbit',
        value: n('PUBLISHED'),
        note: `dari ${students} siswa · ${n('SUBMITTED')} menunggu persetujuan · ${n('RETURNED')} dikembalikan`,
        href: '/academics/report-cards',
        definition: `Rapor ${term.name} yang sudah disetujui kepala sekolah, dibanding jumlah siswa yang ditempatkan di rombel aktif. Rincian per rombel ada di halaman Rapor.`,
        source: 'report_card, enrollment, class_group',
      });
    }

    if ((role === 'MANAGEMENT' || role === 'ADMIN') && auth.permissions.has('report-cards:approve')) {
      // FR-16.4 rapor menunggu persetujuan.
      const waiting = await this.prisma.reportCard.count({ where: { schoolId: s, termId: term.id, status: 'SUBMITTED' } });
      out.push({
        key: 'report_cards_waiting',
        label: 'Rapor menunggu persetujuan',
        value: waiting,
        warn: true,
        href: '/academics/report-cards',
        definition: `Rapor ${term.name} yang sudah diajukan wali kelas dan belum disetujui atau dikembalikan.`,
        source: 'report_card',
      });
    }
    return out;
  }
}
