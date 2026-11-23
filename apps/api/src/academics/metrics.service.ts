import { Injectable } from '@nestjs/common';
import type { DashboardMetric } from '@smart-school/contracts';
import type { AuthContext } from '../auth/auth.types.js';
import { toDbDate } from '../common/dates.js';
import { addDays, isoDayOfWeek, todayIn } from '../common/school-time.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { activeOn, validOn } from './classes.service.js';
import { ScopeService } from './scope.service.js';
import { TimetableService } from './timetable.service.js';

const RATE_DAYS = 7;

/**
 * Angka beranda R1 per peran (FR-8.1–8.7). Setiap angka membawa definisi dan sumber tertulis (FR-8.8);
 * waktu perhitungan dikirim sebagai generatedAt pada ringkasan. Dihitung langsung dari data, tanpa cache.
 */
@Injectable()
export class MetricsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timetable: TimetableService,
    private readonly scope: ScopeService,
  ) {}

  /** Persentase (Hadir + Terlambat) dari catatan terisi pada sesi tidak dibatalkan dalam rentang tanggal. */
  private async rate(where: { classGroupId?: { in: string[] }; schoolId: string }, from: string, to: string): Promise<number | null> {
    const rows = await this.prisma.studentAttendanceRecord.groupBy({
      by: ['status'],
      where: { status: { not: null }, session: { ...where, status: { not: 'CANCELLED' }, sessionDate: { gte: toDbDate(from), lte: toDbDate(to) } } },
      _count: true,
    });
    const total = rows.reduce((n, r) => n + r._count, 0);
    if (!total) return null;
    const present = rows.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').reduce((n, r) => n + r._count, 0);
    return Math.round((present / total) * 1000) / 10;
  }

  async forRole(auth: AuthContext): Promise<DashboardMetric[]> {
    const s = auth.schoolId;
    const tz = (await this.prisma.school.findUniqueOrThrow({ where: { id: s }, select: { timezone: true } })).timezone;
    const today = todayIn(tz);
    const from = addDays(today, -(RATE_DAYS - 1));
    const year = await this.prisma.academicYear.findFirst({ where: { schoolId: s, status: 'ACTIVE' }, select: { id: true } });
    const term = await this.timetable.termOn(s, today);
    const out: DashboardMetric[] = [];
    const role = auth.activeRole;

    if ((role === 'ADMIN' || role === 'CURRICULUM') && auth.permissions.has('classes:read')) {
      const placed = await this.prisma.enrollment.findMany({ where: { classGroup: { academicYearId: year?.id }, ...activeOn(today) }, select: { studentId: true } });
      const unplaced = await this.prisma.student.count({ where: { schoolId: s, status: 'ACTIVE', id: { notIn: placed.map((p) => p.studentId) } } });
      out.push({
        key: 'students_unplaced',
        label: 'Siswa aktif belum ditempatkan',
        value: unplaced,
        warn: true,
        href: '/academics/classes',
        definition: 'Siswa berstatus aktif yang tidak punya penempatan rombel yang berlaku hari ini di tahun ajaran aktif.',
        source: 'student, enrollment, class_group',
      });
    }

    if ((role === 'MANAGEMENT' || role === 'ADMIN') && auth.permissions.has('attendance:read')) {
      const [rate, openPast] = await Promise.all([
        this.rate({ schoolId: s }, from, today),
        this.prisma.studentAttendanceSession.count({ where: { schoolId: s, status: 'OPEN', sessionDate: { lt: toDbDate(today) } } }),
      ]);
      out.push({
        key: 'attendance_rate_7d',
        label: `Tingkat kehadiran ${RATE_DAYS} hari`,
        value: rate ?? 0,
        unit: '%',
        note: rate === null ? 'Belum ada catatan terisi' : undefined,
        href: '/academics/attendance-recap',
        definition: `(Hadir + Terlambat) dibagi seluruh catatan yang sudah terisi, pada sesi yang tidak dibatalkan, ${RATE_DAYS} hari terakhir termasuk hari ini.`,
        source: 'student_attendance_record, student_attendance_session',
      });
      out.push({
        key: 'sessions_open_past',
        label: 'Sesi absensi belum ditutup',
        value: openPast,
        warn: true,
        definition: 'Sesi berstatus terbuka yang tanggalnya sebelum hari ini. Catatannya sudah final otomatis, tetapi guru belum memeriksa dan menutup sesi.',
        source: 'student_attendance_session',
      });
    }

    if (role === 'CURRICULUM' || role === 'ADMIN') {
      if (term) {
        const [classes, drafts, assignments] = await Promise.all([
          this.prisma.classGroup.findMany({ where: { schoolId: s, academicYearId: year?.id, status: 'ACTIVE' }, select: { id: true, timetableVersions: { where: { termId: term.id, status: 'PUBLISHED' }, select: { id: true } } } }),
          this.prisma.timetableVersion.findMany({ where: { schoolId: s, termId: term.id, status: 'DRAFT' }, select: { id: true } }),
          this.prisma.teachingAssignment.findMany({
            where: { schoolId: s, termId: term.id },
            select: { weeklyPeriods: true, timetableSlots: { where: { version: { status: 'PUBLISHED' } }, select: { id: true } } },
          }),
        ]);
        let conflicts = 0;
        for (const d of drafts) conflicts += (await this.timetable.conflicts(d.id)).length;
        out.push(
          {
            key: 'classes_without_timetable',
            label: 'Rombel tanpa jadwal terbit',
            value: classes.filter((c) => !c.timetableVersions.length).length,
            warn: true,
            href: '/academics/timetable',
            definition: `Rombel aktif di tahun ajaran aktif yang belum punya versi jadwal terbit untuk ${term.name}.`,
            source: 'class_group, timetable_version',
          },
          {
            key: 'timetable_drafts',
            label: 'Draf jadwal',
            value: drafts.length,
            note: conflicts ? `${conflicts} benturan` : 'Tanpa benturan',
            href: '/academics/timetable',
            definition: `Versi jadwal berstatus draf untuk ${term.name}. Catatan menunjukkan jumlah benturan guru/rombel/ruang yang akan menolak penerbitan.`,
            source: 'timetable_version, timetable_slot',
          },
          {
            key: 'assignments_underscheduled',
            label: 'Penugasan belum terjadwal penuh',
            value: assignments.filter((a) => a.timetableSlots.length < a.weeklyPeriods).length,
            warn: true,
            href: '/academics/setup?tab=penugasan',
            definition: `Penugasan mengajar ${term.name} yang jumlah slot pada jadwal terbit lebih sedikit dari target jam per minggu.`,
            source: 'teaching_assignment, timetable_slot',
          },
        );
      } else {
        out.push({ key: 'no_term', label: 'Semester berjalan', value: 0, note: 'Hari ini di luar masa semester', definition: 'Tidak ada semester di tahun ajaran aktif yang memuat tanggal hari ini.', source: 'term' });
      }
    }

    if (role === 'TEACHER' && auth.permissions.has('attendance:take')) {
      const emp = await this.scope.employee(auth);
      if (emp) {
        const day = toDbDate(today);
        if (term) {
          const lessons = await this.prisma.timetableSlot.findMany({
            where: {
              weekday: isoDayOfWeek(today),
              version: { termId: term.id, status: 'PUBLISHED' },
              OR: [
                { teachingAssignment: { employeeId: emp.id }, exceptions: { none: { exceptionDate: day } } },
                { exceptions: { some: { exceptionDate: day, kind: 'SUBSTITUTED', substituteEmployeeId: emp.id } } },
              ],
            },
            select: { attendanceSessions: { where: { sessionDate: day }, select: { status: true } } },
          });
          out.push({
            key: 'lessons_to_fill_today',
            label: 'Absensi hari ini belum ditutup',
            value: lessons.filter((l) => !l.attendanceSessions.some((x) => x.status !== 'OPEN')).length,
            note: `dari ${lessons.length} pertemuan`,
            warn: true,
            href: '/teacher/attendance',
            definition: 'Pertemuan Anda hari ini (termasuk sebagai pengganti, tanpa yang dibatalkan) yang sesinya belum dibuka atau belum ditutup.',
            source: 'timetable_slot, schedule_exception, student_attendance_session',
          });
        }
        const homerooms = await this.prisma.homeroomAssignment.findMany({ where: { employeeId: emp.id, ...validOn(today) }, select: { classGroup: { select: { id: true, code: true } } } });
        for (const h of homerooms) {
          const rate = await this.rate({ schoolId: s, classGroupId: { in: [h.classGroup.id] } }, from, today);
          out.push({
            key: `homeroom_rate_${h.classGroup.code}`,
            label: `Kehadiran ${h.classGroup.code} (${RATE_DAYS} hari)`,
            value: rate ?? 0,
            unit: '%',
            note: rate === null ? 'Belum ada catatan terisi' : 'Rombel binaan',
            href: `/academics/attendance-recap?classGroupId=${h.classGroup.id}`,
            definition: `(Hadir + Terlambat) dibagi catatan terisi pada sesi rombel ${h.classGroup.code} yang tidak dibatalkan, ${RATE_DAYS} hari terakhir.`,
            source: 'student_attendance_record, student_attendance_session',
          });
        }
      }
    }
    return out;
  }
}
