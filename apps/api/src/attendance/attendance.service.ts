import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import type {
  AttendanceCorrectionView,
  AttendanceRecap,
  AttendanceSessionDetail,
  AttendanceStatus,
  OpenSessionSchema,
  PersonalAttendance,
  RequestAttendanceCorrectionSchema,
  SaveRecordsSchema,
  TeacherToday,
} from '@smart-school/contracts';
import { ATTENDANCE_STATUS_LABELS, ATTENDANCE_STATUSES } from '@smart-school/contracts';
import type { z } from 'zod';
import { activeOn, validOn } from '../academics/classes.service.js';
import { ScopeService } from '../academics/scope.service.js';
import { TimetableService } from '../academics/timetable.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AuthContext } from '../auth/auth.types.js';
import { conflict, validationFailed } from '../common/api-exception.filter.js';
import { fromDbDate, toDbDate } from '../common/dates.js';
import type { RequestMeta } from '../common/request-meta.js';
import { addDays, endOfDayIn, isoDayOfWeek, todayIn } from '../common/school-time.js';
import { NotificationsService } from '../communications/notifications.service.js';
import { JobStatusService } from '../common/job-status.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

type Tx = Prisma.TransactionClient;
const FINALIZE_JOB = 'attendance-finalize';
const FINALIZE_INTERVAL_MS = 10 * 60_000;
/** Tanggal kalender (kolom DATE, UTC tengah malam) → "23 November 2026". */
const LONG_DATE = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

const SESSION_INCLUDE = {
  classGroup: { select: { id: true, code: true } },
  teachingAssignment: { select: { employeeId: true, subject: { select: { code: true, name: true } } } },
  timetableSlot: { select: { startTime: true, endTime: true } },
  takenBy: { select: { id: true, person: { select: { fullName: true } } } },
  records: {
    include: {
      student: { select: { id: true, nis: true, person: { select: { fullName: true } } } },
      corrections: { where: { decision: 'PENDING' }, select: { id: true, proposedStatus: true } },
    },
    orderBy: { student: { person: { fullName: 'asc' } } },
  },
} satisfies Prisma.StudentAttendanceSessionInclude;
type SessionRow = Prisma.StudentAttendanceSessionGetPayload<{ include: typeof SESSION_INCLUDE }>;

const emptyCounts = (): Record<AttendanceStatus, number> => ({ PRESENT: 0, EXCUSED: 0, SICK: 0, ABSENT: 0, LATE: 0 });

/**
 * Absensi siswa per sesi. Aturan sekolah (D4): guru bebas mengubah sampai 23:59 hari sesi (zona waktu sekolah);
 * sesudahnya perubahan lewat koreksi beralasan yang disetujui wali kelas atau admin. Status kosong = belum diisi.
 * FR-7.3: notifikasi alpa ke wali dikirim setelah status final, yaitu saat sesi ditutup, saat catatan pada sesi
 * yang sudah ditutup diubah, saat koreksi disetujui, atau saat batas hari sesi lewat (job finalisasi).
 */
@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly scope: ScopeService,
    private readonly timetable: TimetableService,
    private readonly notifications: NotificationsService,
    private readonly jobs: JobStatusService,
  ) {
    this.jobs.register(FINALIZE_JOB, FINALIZE_INTERVAL_MS);
  }

  private async tz(schoolId: string) {
    return (await this.prisma.school.findUniqueOrThrow({ where: { id: schoolId }, select: { timezone: true } })).timezone;
  }

  private async isHomeroomOf(employeeId: string | undefined, classGroupId: string, date: string) {
    if (!employeeId) return false;
    return !!(await this.prisma.homeroomAssignment.findFirst({ where: { employeeId, classGroupId, ...validOn(date) } }));
  }

  // ───────────── Hari ini (guru) ─────────────

  async teacherToday(auth: AuthContext): Promise<TeacherToday> {
    const tz = await this.tz(auth.schoolId);
    const date = todayIn(tz);
    const weekday = isoDayOfWeek(date);
    const emp = await this.scope.employee(auth);
    const term = await this.timetable.termOn(auth.schoolId, date);
    if (!emp) return { date, weekday, term, lessons: [], homeroomClasses: [], adHocSessions: [] };
    const day = toDbDate(date);
    const versionWhere = { termId: term?.id, status: 'PUBLISHED' as const, OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: day } }] };
    const [slots, homerooms, adHoc] = await Promise.all([
      term
        ? this.prisma.timetableSlot.findMany({
            where: {
              weekday,
              version: versionWhere,
              // Jadwal sendiri, atau pertemuan yang hari ini digantikan oleh guru ini.
              OR: [{ teachingAssignment: { employeeId: emp.id } }, { exceptions: { some: { exceptionDate: day, kind: 'SUBSTITUTED', substituteEmployeeId: emp.id } } }],
            },
            include: {
              room: { select: { code: true } },
              teachingAssignment: { select: { employeeId: true, employee: { select: { person: { select: { fullName: true } } } }, subject: { select: { code: true, name: true } }, classGroup: { select: { id: true, code: true } } } },
              attendanceSessions: { where: { sessionDate: day }, include: { records: { select: { status: true } } } },
              exceptions: { where: { exceptionDate: day }, include: { room: { select: { code: true } }, substituteEmployee: { select: { id: true, person: { select: { fullName: true } } } } } },
            },
            orderBy: { startTime: 'asc' },
          })
        : [],
      this.prisma.homeroomAssignment.findMany({ where: { employeeId: emp.id, ...validOn(date) }, select: { classGroup: { select: { id: true, code: true } } } }),
      this.prisma.studentAttendanceSession.findMany({
        where: { takenById: emp.id, kind: 'AD_HOC', sessionDate: day },
        select: { id: true, reason: true, status: true, classGroup: { select: { id: true, code: true } }, records: { select: { status: true } } },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    return {
      date,
      weekday,
      term,
      homeroomClasses: homerooms.map((h) => h.classGroup),
      adHocSessions: adHoc.map((x) => ({ id: x.id, classGroup: x.classGroup, reason: x.reason, status: x.status, filled: x.records.filter((r) => r.status).length, total: x.records.length })),
      lessons: slots.map((s) => {
        const session = s.attendanceSessions[0];
        const ex = s.exceptions[0];
        const own = s.teachingAssignment.employeeId === emp.id;
        const substitutedAway = ex?.kind === 'SUBSTITUTED' && !!ex.substituteEmployee && ex.substituteEmployee.id !== emp.id;
        return {
          timetableSlotId: s.id,
          date,
          startTime: s.startTime,
          endTime: s.endTime,
          subject: s.teachingAssignment.subject,
          classGroup: s.teachingAssignment.classGroup,
          room: ex?.room ?? s.room,
          substituteFor: own ? null : { fullName: s.teachingAssignment.employee.person.fullName },
          unavailable:
            ex?.kind === 'CANCELLED'
              ? { kind: 'CANCELLED' as const, reason: ex.reason, substitute: null }
              : own && substitutedAway
                ? { kind: 'SUBSTITUTED' as const, reason: ex.reason, substitute: ex.substituteEmployee!.person.fullName }
                : null,
          session: session
            ? { id: session.id, status: session.status, filled: session.records.filter((r) => r.status).length, total: session.records.length }
            : null,
        };
      }),
    };
  }

  // ───────────── Membuka sesi ─────────────

  /** Membuka sesi (atau mengembalikan sesi yang sudah ada untuk jadwal & tanggal itu). Peserta diambil dari penempatan yang berlaku. */
  async open(auth: AuthContext, input: z.infer<typeof OpenSessionSchema>, meta: RequestMeta) {
    const tz = await this.tz(auth.schoolId);
    const today = todayIn(tz);
    if (input.date > today) throw validationFailed('Absensi tidak bisa dibuka untuk tanggal mendatang.', { date: ['Tanggal mendatang.'] });
    const emp = await this.scope.employee(auth);
    const manager = auth.permissions.has('attendance:manage');

    let classGroupId: string;
    let data: Prisma.StudentAttendanceSessionUncheckedCreateInput;
    if ('timetableSlotId' in input) {
      const slot = await this.prisma.timetableSlot.findFirst({
        where: { id: input.timetableSlotId, version: { schoolId: auth.schoolId } },
        include: { version: { include: { term: true } }, teachingAssignment: true, exceptions: { where: { exceptionDate: toDbDate(input.date) } } },
      });
      if (!slot || slot.version.status !== 'PUBLISHED') throw new NotFoundException('Jadwal tidak ditemukan atau belum terbit.');
      const ex = slot.exceptions[0];
      if (ex?.kind === 'CANCELLED') throw conflict(`Pertemuan ini dibatalkan untuk tanggal tersebut: ${ex.reason}`);
      // Guru yang mengisi: pengganti bila ada pengecualian, selain itu guru penugasan.
      const teacherId = ex?.kind === 'SUBSTITUTED' && ex.substituteEmployeeId ? ex.substituteEmployeeId : slot.teachingAssignment.employeeId;
      if (!manager && teacherId !== emp?.id) {
        throw new ForbiddenException(teacherId === slot.teachingAssignment.employeeId ? 'Anda hanya dapat mengisi absensi untuk jadwal mengajar Anda.' : 'Pertemuan ini digantikan guru lain untuk tanggal tersebut.');
      }
      if (isoDayOfWeek(input.date) !== slot.weekday) throw validationFailed('Tanggal tidak sesuai dengan hari jadwal.', { date: ['Hari tidak cocok.'] });
      if (input.date < fromDbDate(slot.version.term.startDate) || input.date > fromDbDate(slot.version.term.endDate)) {
        throw validationFailed('Tanggal di luar semester jadwal.', { date: ['Di luar semester.'] });
      }
      const existing = await this.prisma.studentAttendanceSession.findUnique({ where: { timetableSlotId_sessionDate: { timetableSlotId: slot.id, sessionDate: toDbDate(input.date) } } });
      if (existing) return { id: existing.id };
      classGroupId = slot.version.classGroupId;
      data = {
        schoolId: auth.schoolId,
        classGroupId,
        timetableSlotId: slot.id,
        teachingAssignmentId: slot.teachingAssignmentId,
        sessionDate: toDbDate(input.date),
        kind: 'SCHEDULED',
        takenById: teacherId,
        reason: ex?.kind === 'SUBSTITUTED' ? `Pengganti: ${ex.reason}` : null,
      };
    } else {
      const cls = await this.prisma.classGroup.findFirst({ where: { id: input.classGroupId, schoolId: auth.schoolId } });
      if (!cls) throw new NotFoundException('Rombel tidak ditemukan.');
      if (!emp) throw new ForbiddenException('Sesi tambahan dibuka oleh pegawai sekolah.');
      if (!manager && !(await this.isHomeroomOf(emp.id, cls.id, input.date))) throw new ForbiddenException('Sesi tambahan hanya untuk wali kelas rombel ini atau admin.');
      classGroupId = cls.id;
      data = { schoolId: auth.schoolId, classGroupId, sessionDate: toDbDate(input.date), kind: 'AD_HOC', reason: input.reason, takenById: emp.id };
    }

    const enrollments = await this.prisma.enrollment.findMany({ where: { classGroupId, ...activeOn(input.date) }, select: { id: true, studentId: true } });
    if (!enrollments.length) throw conflict('Belum ada siswa yang ditempatkan di rombel ini pada tanggal tersebut.');
    const s = await this.prisma.$transaction(async (tx) => {
      const created = await tx.studentAttendanceSession.create({
        data: { ...data, records: { create: enrollments.map((e) => ({ studentId: e.studentId, enrollmentId: e.id })) } },
      });
      await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'attendance.session_open', entityType: 'student_attendance_session', entityId: created.id, requestId: meta.requestId, metadata: { classGroupId, date: input.date, kind: data.kind, participants: enrollments.length } }, tx);
      return created;
    });
    return { id: s.id };
  }

  // ───────────── Detail & hak akses ─────────────

  private async loadSession(auth: AuthContext, id: string) {
    const s = await this.prisma.studentAttendanceSession.findFirst({ where: { id, schoolId: auth.schoolId }, include: SESSION_INCLUDE });
    if (!s) throw new NotFoundException('Sesi absensi tidak ditemukan.');
    return s;
  }

  /** Siapa boleh apa pada sesi: pengisi = guru penugasan/pembuka sesi atau admin absensi; peninjau = wali kelas atau pembaca absensi. */
  private async access(auth: AuthContext, s: SessionRow) {
    const emp = await this.scope.employee(auth);
    const date = fromDbDate(s.sessionDate);
    // Guru penugasan hanya pengisi bila sesi tidak dialihkan ke guru pengganti.
    const isTaker = !!emp && (s.takenById === emp.id || (s.teachingAssignment?.employeeId === emp.id && s.takenById === emp.id));
    const isHomeroom = await this.isHomeroomOf(emp?.id, s.classGroupId, date);
    const manager = auth.permissions.has('attendance:manage');
    const reader = auth.permissions.has('attendance:read');
    return { emp, isTaker, isHomeroom, manager, canFill: isTaker || manager, canView: isTaker || isHomeroom || manager || reader };
  }

  private async editWindow(schoolId: string, s: { sessionDate: Date }) {
    const until = endOfDayIn(fromDbDate(s.sessionDate), await this.tz(schoolId));
    return { until, open: Date.now() <= new Date(until).getTime() };
  }

  async get(auth: AuthContext, id: string): Promise<AttendanceSessionDetail> {
    const s = await this.loadSession(auth, id);
    const acc = await this.access(auth, s);
    if (!acc.canView) throw new ForbiddenException('Anda tidak memiliki akses ke sesi ini.');
    const win = await this.editWindow(auth.schoolId, s);
    const active = s.status !== 'CANCELLED';
    return {
      id: s.id,
      date: fromDbDate(s.sessionDate),
      kind: s.kind,
      status: s.status,
      reason: s.reason,
      classGroup: s.classGroup,
      subject: s.teachingAssignment?.subject ?? null,
      startTime: s.timetableSlot?.startTime ?? null,
      endTime: s.timetableSlot?.endTime ?? null,
      takenBy: { id: s.takenBy.id, fullName: s.takenBy.person.fullName },
      closedAt: s.closedAt?.toISOString() ?? null,
      editableUntil: win.until,
      canEdit: active && acc.canFill && win.open,
      canRequestCorrection: active && !win.open && (acc.canFill || acc.isHomeroom),
      roster: s.records.map((r) => ({
        recordId: r.id,
        studentId: r.studentId,
        fullName: r.student.person.fullName,
        nis: r.student.nis,
        status: r.status,
        note: r.note,
        versionNo: r.versionNo,
        pendingCorrection: r.corrections[0] ?? null,
      })),
    };
  }

  // ───────────── Mengisi, menutup, membatalkan ─────────────

  /** Notifikasi alpa ke wali yang berhak. Satu notifikasi per catatan, walau status diubah bolak-balik. */
  private async notifyAbsent(tx: Tx, schoolId: string, s: { id: string; sessionDate: Date; classGroup: { code: string }; subjectName: string | null }, rec: { id: string; studentId: string; fullName: string }) {
    const userIds = await this.notifications.attendanceGuardianUserIds(tx, rec.studentId);
    const date = fromDbDate(s.sessionDate);
    await this.notifications.emit(
      tx,
      { schoolId, sourceEventId: `attendance.absent:${rec.id}`, eventType: 'attendance.absent', payload: { recordId: rec.id, studentId: rec.studentId, date } },
      userIds.map((recipientId) => ({
        recipientId,
        title: `${rec.fullName} tercatat ${ATTENDANCE_STATUS_LABELS.ABSENT.toLowerCase()}`,
        body: `${s.subjectName ? `${s.subjectName}, ` : ''}${s.classGroup.code}, ${LONG_DATE.format(s.sessionDate)}. Hubungi wali kelas bila ada keterangan.`,
        link: `/guardian/attendance?studentId=${rec.studentId}`,
      })),
    );
  }

  private async notifyAbsentInSession(tx: Tx, schoolId: string, s: { id: string; sessionDate: Date; classGroup: { code: string }; teachingAssignment: { subject: { name: string } } | null }) {
    const absent = await tx.studentAttendanceRecord.findMany({
      where: { sessionId: s.id, status: 'ABSENT' },
      select: { id: true, studentId: true, student: { select: { person: { select: { fullName: true } } } } },
    });
    for (const r of absent) {
      await this.notifyAbsent(tx, schoolId, { id: s.id, sessionDate: s.sessionDate, classGroup: s.classGroup, subjectName: s.teachingAssignment?.subject.name ?? null }, { id: r.id, studentId: r.studentId, fullName: r.student.person.fullName });
    }
  }

  /**
   * Finalisasi sesi yang batas harinya sudah lewat (zona waktu tiap sekolah): catatan diberi finalizedAt dan
   * notifikasi alpa dikirim. Sesi tetap berstatus terbuka agar pimpinan melihat sesi yang tidak ditutup guru.
   * Aman diulang: notifikasi diduplikasi lewat sourceEventId.
   */
  async finalizeDue(now = new Date()): Promise<number> {
    const schools = await this.prisma.school.findMany({ select: { id: true, timezone: true } });
    let count = 0;
    for (const school of schools) {
      const today = todayIn(school.timezone, now);
      const sessions = await this.prisma.studentAttendanceSession.findMany({
        where: { schoolId: school.id, status: { not: 'CANCELLED' }, sessionDate: { lt: toDbDate(today) }, records: { some: { finalizedAt: null } } },
        select: { id: true, sessionDate: true, classGroup: { select: { code: true } }, teachingAssignment: { select: { subject: { select: { name: true } } } } },
        take: 200,
      });
      for (const s of sessions) {
        await this.prisma.$transaction(async (tx) => {
          await tx.studentAttendanceRecord.updateMany({ where: { sessionId: s.id, finalizedAt: null }, data: { finalizedAt: now } });
          await this.notifyAbsentInSession(tx, school.id, s);
        });
        count++;
      }
    }
    return count;
  }

  @Interval(FINALIZE_JOB, FINALIZE_INTERVAL_MS)
  async finalizeJob() {
    if (process.env.NODE_ENV === 'test') return;
    try {
      const n = await this.finalizeDue();
      this.jobs.succeeded(FINALIZE_JOB);
      if (n) this.logger.log({ job: FINALIZE_JOB, finalizedSessions: n });
    } catch (err) {
      this.jobs.failed(FINALIZE_JOB);
      this.logger.error({ job: FINALIZE_JOB, message: 'Finalisasi absensi gagal', error: (err as Error).message }, (err as Error).stack);
    }
  }

  async save(auth: AuthContext, id: string, input: z.infer<typeof SaveRecordsSchema>, meta: RequestMeta) {
    const s = await this.loadSession(auth, id);
    const acc = await this.access(auth, s);
    if (!acc.canFill) throw new ForbiddenException('Anda tidak dapat mengisi absensi sesi ini.');
    if (s.status === 'CANCELLED') throw conflict('Sesi sudah dibatalkan.');
    const win = await this.editWindow(auth.schoolId, s);
    if (!win.open) throw conflict('Batas pengisian sudah lewat (akhir hari sesi). Ajukan koreksi untuk mengubah catatan.');
    const byStudent = new Map(s.records.map((r) => [r.studentId, r]));
    const unknown = input.records.filter((r) => !byStudent.has(r.studentId));
    if (unknown.length) throw validationFailed('Ada siswa yang bukan peserta sesi ini.', { records: [`${unknown.length} siswa bukan peserta.`] });

    let changed = 0;
    await this.prisma.$transaction(async (tx) => {
      for (const r of input.records) {
        const cur = byStudent.get(r.studentId)!;
        const note = r.note ?? null;
        if (cur.status === r.status && (cur.note ?? null) === note) continue;
        const statusChanged = cur.status !== r.status;
        await tx.studentAttendanceRecord.update({
          where: { id: cur.id },
          data: { status: r.status, note, updatedById: auth.userId, ...(statusChanged ? { versionNo: { increment: 1 } } : {}) },
        });
        changed++;
        // Sesi yang sudah ditutup berarti guru sudah memfinalkan; perubahan berikutnya langsung final.
        if (statusChanged && r.status === 'ABSENT' && s.status === 'CLOSED') {
          await this.notifyAbsent(tx, auth.schoolId, { id: s.id, sessionDate: s.sessionDate, classGroup: s.classGroup, subjectName: s.teachingAssignment?.subject.name ?? null }, { id: cur.id, studentId: cur.studentId, fullName: cur.student.person.fullName });
        }
      }
      if (changed) {
        await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'attendance.records_save', entityType: 'student_attendance_session', entityId: s.id, requestId: meta.requestId, metadata: { changed } }, tx);
      }
    });
    return { changed };
  }

  async close(auth: AuthContext, id: string, meta: RequestMeta) {
    const s = await this.loadSession(auth, id);
    const acc = await this.access(auth, s);
    if (!acc.canFill) throw new ForbiddenException('Anda tidak dapat menutup sesi ini.');
    if (s.status !== 'OPEN') throw conflict(s.status === 'CLOSED' ? 'Sesi sudah ditutup.' : 'Sesi sudah dibatalkan.');
    const unfilled = s.records.filter((r) => !r.status).length;
    if (unfilled) throw conflict(`Masih ada ${unfilled} siswa yang belum diisi.`);
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.studentAttendanceSession.update({ where: { id }, data: { status: 'CLOSED', closedAt: now } });
      await tx.studentAttendanceRecord.updateMany({ where: { sessionId: id }, data: { finalizedAt: now } });
      await this.notifyAbsentInSession(tx, auth.schoolId, s);
      await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'attendance.session_close', entityType: 'student_attendance_session', entityId: id, requestId: meta.requestId }, tx);
    });
  }

  async cancel(auth: AuthContext, id: string, reason: string, meta: RequestMeta) {
    const s = await this.loadSession(auth, id);
    const acc = await this.access(auth, s);
    if (!acc.canFill) throw new ForbiddenException('Anda tidak dapat membatalkan sesi ini.');
    if (s.status === 'CANCELLED') throw conflict('Sesi sudah dibatalkan.');
    if (!acc.manager && !(await this.editWindow(auth.schoolId, s)).open) throw conflict('Sesi hanya bisa dibatalkan guru pada hari yang sama. Hubungi admin.');
    await this.prisma.$transaction(async (tx) => {
      await tx.studentAttendanceSession.update({ where: { id }, data: { status: 'CANCELLED', reason: s.reason ? `${s.reason} · Dibatalkan: ${reason}` : `Dibatalkan: ${reason}` } });
      await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'attendance.session_cancel', entityType: 'student_attendance_session', entityId: id, requestId: meta.requestId, metadata: { reason } }, tx);
    });
  }

  // ───────────── Koreksi (setelah batas hari) ─────────────

  async requestCorrection(auth: AuthContext, recordId: string, input: z.infer<typeof RequestAttendanceCorrectionSchema>, meta: RequestMeta) {
    const rec = await this.prisma.studentAttendanceRecord.findFirst({ where: { id: recordId, session: { schoolId: auth.schoolId } }, select: { id: true, sessionId: true, status: true } });
    if (!rec) throw new NotFoundException('Catatan absensi tidak ditemukan.');
    const s = await this.loadSession(auth, rec.sessionId);
    const acc = await this.access(auth, s);
    if (!acc.canFill && !acc.isHomeroom) throw new ForbiddenException('Anda tidak dapat mengajukan koreksi untuk sesi ini.');
    if (s.status === 'CANCELLED') throw conflict('Sesi sudah dibatalkan.');
    if ((await this.editWindow(auth.schoolId, s)).open) throw conflict('Masih di hari sesi; ubah langsung tanpa koreksi.');
    if (rec.status === input.proposedStatus) throw validationFailed('Status usulan sama dengan status sekarang.', { proposedStatus: ['Pilih status lain.'] });
    if (await this.prisma.attendanceCorrection.findFirst({ where: { recordId, decision: 'PENDING' } })) throw conflict('Sudah ada koreksi yang menunggu untuk catatan ini.');
    const c = await this.prisma.attendanceCorrection.create({ data: { recordId, oldStatus: rec.status, proposedStatus: input.proposedStatus, reason: input.reason, requestedById: auth.userId } });
    await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'attendance.correction_request', entityType: 'attendance_correction', entityId: c.id, requestId: meta.requestId, metadata: { recordId, from: rec.status, to: input.proposedStatus } });
    return { id: c.id };
  }

  /** Koreksi yang boleh ditinjau: semua untuk admin absensi, rombel binaan untuk wali kelas. */
  async corrections(auth: AuthContext, decision?: 'PENDING' | 'APPROVED' | 'REJECTED'): Promise<AttendanceCorrectionView[]> {
    let classFilter: Prisma.AttendanceCorrectionWhereInput = {};
    if (!auth.permissions.has('attendance:manage')) {
      const emp = await this.scope.employee(auth);
      if (!emp) return [];
      const today = todayIn(await this.tz(auth.schoolId));
      const ids = (await this.prisma.homeroomAssignment.findMany({ where: { employeeId: emp.id, ...validOn(today) }, select: { classGroupId: true } })).map((h) => h.classGroupId);
      classFilter = { OR: [{ record: { session: { classGroupId: { in: ids } } } }, { requestedById: auth.userId }] };
    }
    const rows = await this.prisma.attendanceCorrection.findMany({
      where: { record: { session: { schoolId: auth.schoolId } }, ...(decision ? { decision } : {}), ...classFilter },
      include: {
        record: {
          select: {
            student: { select: { id: true, nis: true, person: { select: { fullName: true } } } },
            session: { select: { id: true, sessionDate: true, classGroup: { select: { id: true, code: true } }, teachingAssignment: { select: { subject: { select: { name: true } } } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    const userIds = [...new Set(rows.flatMap((r) => [r.requestedById, r.decidedById].filter((x): x is string => !!x)))];
    const users = await this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, email: true, person: { select: { fullName: true } } } });
    const name = new Map(users.map((u) => [u.id, u.person?.fullName ?? u.email]));
    return rows.map((c) => ({
      id: c.id,
      student: { id: c.record.student.id, fullName: c.record.student.person.fullName, nis: c.record.student.nis },
      classGroup: c.record.session.classGroup,
      sessionId: c.record.session.id,
      date: fromDbDate(c.record.session.sessionDate),
      subject: c.record.session.teachingAssignment?.subject.name ?? null,
      oldStatus: c.oldStatus,
      proposedStatus: c.proposedStatus,
      reason: c.reason,
      decision: c.decision,
      requestedBy: name.get(c.requestedById) ?? null,
      decidedBy: c.decidedById ? (name.get(c.decidedById) ?? null) : null,
      decisionNote: c.decisionNote,
      createdAt: c.createdAt.toISOString(),
    }));
  }

  async decide(auth: AuthContext, id: string, approve: boolean, note: string | null, meta: RequestMeta) {
    const c = await this.prisma.attendanceCorrection.findFirst({
      where: { id, record: { session: { schoolId: auth.schoolId } } },
      include: { record: { include: { student: { select: { person: { select: { fullName: true } } } }, session: { include: { classGroup: { select: { code: true } }, teachingAssignment: { select: { subject: { select: { name: true } } } } } } } } },
    });
    if (!c) throw new NotFoundException('Koreksi tidak ditemukan.');
    if (c.decision !== 'PENDING') throw conflict('Koreksi ini sudah diputuskan.');
    const today = todayIn(await this.tz(auth.schoolId));
    const emp = await this.scope.employee(auth);
    const allowed = auth.permissions.has('attendance:manage') || (await this.isHomeroomOf(emp?.id, c.record.session.classGroupId, today));
    if (!allowed) throw new ForbiddenException('Koreksi diputuskan oleh wali kelas atau admin.');
    if (c.requestedById === auth.userId && !auth.permissions.has('attendance:manage')) throw new ForbiddenException('Koreksi yang Anda ajukan sendiri diputuskan oleh admin.');
    await this.prisma.$transaction(async (tx) => {
      await tx.attendanceCorrection.update({ where: { id }, data: { decision: approve ? 'APPROVED' : 'REJECTED', decidedById: auth.userId, decidedAt: new Date(), decisionNote: note } });
      if (approve) {
        await tx.studentAttendanceRecord.update({ where: { id: c.recordId }, data: { status: c.proposedStatus, versionNo: { increment: 1 }, updatedById: auth.userId } });
        if (c.proposedStatus === 'ABSENT') {
          const s = c.record.session;
          await this.notifyAbsent(tx, auth.schoolId, { id: s.id, sessionDate: s.sessionDate, classGroup: s.classGroup, subjectName: s.teachingAssignment?.subject.name ?? null }, { id: c.recordId, studentId: c.record.studentId, fullName: c.record.student.person.fullName });
        }
      }
      await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: approve ? 'attendance.correction_approve' : 'attendance.correction_reject', entityType: 'attendance_correction', entityId: id, requestId: meta.requestId, metadata: { recordId: c.recordId, from: c.oldStatus, to: c.proposedStatus, note } }, tx);
    });
  }

  // ───────────── Rekap & portal ─────────────

  async recap(auth: AuthContext, classGroupId: string, from: string, to: string): Promise<AttendanceRecap> {
    const cls = await this.prisma.classGroup.findFirst({ where: { id: classGroupId, schoolId: auth.schoolId }, select: { id: true, code: true } });
    if (!cls) throw new NotFoundException('Rombel tidak ditemukan.');
    if (!auth.permissions.has('attendance:read')) {
      const emp = await this.scope.employee(auth);
      const today = todayIn(await this.tz(auth.schoolId));
      if (!(await this.isHomeroomOf(emp?.id, classGroupId, today))) throw new ForbiddenException('Rekap hanya untuk wali kelas rombel ini atau pimpinan.');
    }
    if (addDays(from, 366) < to) throw validationFailed('Rentang rekap maksimal satu tahun.', { to: ['Terlalu panjang.'] });
    const sessions = await this.prisma.studentAttendanceSession.findMany({
      where: { classGroupId, sessionDate: { gte: toDbDate(from), lte: toDbDate(to) } },
      include: { records: { select: { studentId: true, status: true, student: { select: { nis: true, person: { select: { fullName: true } } } } } } },
    });
    const valid = sessions.filter((s) => s.status !== 'CANCELLED');
    const rows = new Map<string, AttendanceRecap['rows'][number]>();
    for (const s of valid) {
      for (const r of s.records) {
        let row = rows.get(r.studentId);
        if (!row) {
          row = { studentId: r.studentId, fullName: r.student.person.fullName, nis: r.student.nis, counts: emptyCounts(), unfilled: 0, rate: null };
          rows.set(r.studentId, row);
        }
        if (r.status) row.counts[r.status]++;
        else row.unfilled++;
      }
    }
    for (const row of rows.values()) {
      const filled = ATTENDANCE_STATUSES.reduce((n, k) => n + row.counts[k], 0);
      row.rate = filled ? Math.round(((row.counts.PRESENT + row.counts.LATE) / filled) * 1000) / 10 : null;
    }
    return {
      classGroup: cls,
      from,
      to,
      sessionCount: valid.length,
      cancelledCount: sessions.length - valid.length,
      rows: [...rows.values()].sort((a, b) => a.fullName.localeCompare(b.fullName, 'id')),
    };
  }

  /** Kehadiran pribadi untuk siswa, atau anak bagi wali (izin absensi). Default 30 hari terakhir. */
  async personal(auth: AuthContext, q: { studentId?: string; from?: string; to?: string }): Promise<PersonalAttendance> {
    const studentId = await this.scope.portalStudentId(auth, 'attendance', q.studentId);
    const today = todayIn(await this.tz(auth.schoolId));
    const to = q.to ?? today;
    const from = q.from ?? addDays(to, -30);
    const records = await this.prisma.studentAttendanceRecord.findMany({
      where: { studentId, session: { sessionDate: { gte: toDbDate(from), lte: toDbDate(to) } } },
      include: { session: { select: { sessionDate: true, status: true, classGroup: { select: { code: true } }, teachingAssignment: { select: { subject: { select: { name: true } } } }, timetableSlot: { select: { startTime: true } } } } },
      orderBy: [{ session: { sessionDate: 'desc' } }],
    });
    const counts = emptyCounts();
    for (const r of records) if (r.status && r.session.status !== 'CANCELLED') counts[r.status]++;
    return {
      from,
      to,
      counts,
      items: records.map((r) => ({
        date: fromDbDate(r.session.sessionDate),
        subject: r.session.teachingAssignment?.subject.name ?? null,
        classGroupCode: r.session.classGroup.code,
        status: r.status,
        sessionStatus: r.session.status,
        note: r.note,
      })),
    };
  }
}
