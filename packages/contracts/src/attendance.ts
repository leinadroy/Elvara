import { z } from 'zod';
import { isoDate } from './common.js';

export const ATTENDANCE_STATUSES = ['PRESENT', 'EXCUSED', 'SICK', 'ABSENT', 'LATE'] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];
export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: 'Hadir',
  EXCUSED: 'Izin',
  SICK: 'Sakit',
  ABSENT: 'Alpa',
  LATE: 'Terlambat',
};
/** Huruf singkat untuk tombol dan rekap. */
export const ATTENDANCE_STATUS_SHORT: Record<AttendanceStatus, string> = { PRESENT: 'H', EXCUSED: 'I', SICK: 'S', ABSENT: 'A', LATE: 'T' };

export type SessionStatus = 'OPEN' | 'CLOSED' | 'CANCELLED';
export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = { OPEN: 'Terbuka', CLOSED: 'Ditutup', CANCELLED: 'Dibatalkan' };

export const OpenSessionSchema = z.union([
  z.object({ timetableSlotId: z.uuid(), date: isoDate }),
  z.object({ classGroupId: z.uuid(), date: isoDate, reason: z.string().trim().min(5, { error: 'Jelaskan alasan sesi tambahan.' }).max(200) }),
]);

export const SaveRecordsSchema = z.object({
  records: z
    .array(
      z.object({
        studentId: z.uuid(),
        status: z.enum(ATTENDANCE_STATUSES).nullable(),
        note: z.string().trim().max(200).optional().nullable(),
      }),
    )
    .min(1)
    .max(200),
});

export const CancelSessionSchema = z.object({ reason: z.string().trim().min(5, { error: 'Jelaskan alasan pembatalan.' }).max(200) });

export const RequestAttendanceCorrectionSchema = z.object({
  proposedStatus: z.enum(ATTENDANCE_STATUSES),
  reason: z.string().trim().min(5, { error: 'Jelaskan alasan koreksi.' }).max(300),
});

export const ReviewAttendanceCorrectionSchema = z.object({
  note: z.string().trim().max(300).optional().transform((v) => (v ? v : null)),
});

export interface TodayLesson {
  timetableSlotId: string;
  date: string;
  startTime: string;
  endTime: string;
  subject: { code: string; name: string };
  classGroup: { id: string; code: string };
  room: { code: string } | null;
  /** Pertemuan ini menggantikan guru lain (pengecualian jadwal). */
  substituteFor: { fullName: string } | null;
  /** Pertemuan dibatalkan atau dialihkan ke guru lain untuk tanggal ini; tidak bisa dibuka. */
  unavailable: { kind: 'CANCELLED' | 'SUBSTITUTED'; reason: string; substitute: string | null } | null;
  session: { id: string; status: SessionStatus; filled: number; total: number } | null;
}

export interface TeacherToday {
  date: string;
  weekday: number;
  term: { id: string; name: string } | null;
  lessons: TodayLesson[];
  /** Rombel yang diampu sebagai wali kelas (untuk sesi tambahan dan tinjauan koreksi). */
  homeroomClasses: { id: string; code: string }[];
}

export interface RosterRow {
  recordId: string | null;
  studentId: string;
  fullName: string;
  nis: string;
  status: AttendanceStatus | null;
  note: string | null;
  versionNo: number;
  pendingCorrection: { id: string; proposedStatus: AttendanceStatus } | null;
}

export interface AttendanceSessionDetail {
  id: string;
  date: string;
  kind: 'SCHEDULED' | 'AD_HOC';
  status: SessionStatus;
  reason: string | null;
  classGroup: { id: string; code: string };
  subject: { code: string; name: string } | null;
  startTime: string | null;
  endTime: string | null;
  takenBy: { id: string; fullName: string };
  closedAt: string | null;
  /** Guru boleh mengubah langsung sampai akhir hari sesi (zona waktu sekolah). */
  editableUntil: string;
  canEdit: boolean;
  canRequestCorrection: boolean;
  roster: RosterRow[];
}

export interface AttendanceCorrectionView {
  id: string;
  student: { id: string; fullName: string; nis: string };
  classGroup: { id: string; code: string };
  sessionId: string;
  date: string;
  subject: string | null;
  oldStatus: AttendanceStatus | null;
  proposedStatus: AttendanceStatus;
  reason: string;
  decision: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedBy: string | null;
  decidedBy: string | null;
  decisionNote: string | null;
  createdAt: string;
}

export const AttendanceCorrectionQuerySchema = z.object({
  decision: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
});

export const RecapQuerySchema = z
  .object({
    classGroupId: z.uuid({ error: 'Pilih rombel.' }),
    from: isoDate,
    to: isoDate,
  })
  .refine((v) => v.to >= v.from, { path: ['to'], message: 'Tanggal akhir sebelum tanggal awal.' });

export interface RecapRow {
  studentId: string;
  fullName: string;
  nis: string;
  counts: Record<AttendanceStatus, number>;
  unfilled: number;
  /** Persentase hadir + terlambat dari sesi yang terisi; null bila belum ada data. */
  rate: number | null;
}

export interface AttendanceRecap {
  classGroup: { id: string; code: string };
  from: string;
  to: string;
  sessionCount: number;
  cancelledCount: number;
  rows: RecapRow[];
}

export const PersonalAttendanceQuerySchema = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
});

export interface PersonalAttendanceItem {
  date: string;
  subject: string | null;
  classGroupCode: string;
  status: AttendanceStatus | null;
  sessionStatus: SessionStatus;
  note: string | null;
}

export interface PersonalAttendance {
  from: string;
  to: string;
  counts: Record<AttendanceStatus, number>;
  items: PersonalAttendanceItem[];
}
