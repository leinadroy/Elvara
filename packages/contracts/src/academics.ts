import { z } from 'zod';
import { isoDate } from './common.js';

// Mengikuti architecture_blueprint/05_database_core_tables.md bagian B & C.

const code = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9-]{1,12}$/, { error: 'Kode hanya huruf, angka, dan tanda hubung (maks. 12).' });
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: 'Format jam HH:MM.' });
export const RECORD_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type RecordStatus = (typeof RECORD_STATUSES)[number];

// ───────────── Tingkat & program (D1: diatur admin) ─────────────

export const GradeLevelSchema = z.object({
  code,
  ordinal: z.coerce.number().int().min(1).max(20),
  name: z.string().trim().min(1).max(30),
});

export const ProgramSchema = z.object({
  code,
  name: z.string().trim().min(2).max(100),
  status: z.enum(RECORD_STATUSES).default('ACTIVE'),
});

export interface GradeLevelView {
  id: string;
  code: string;
  ordinal: number;
  name: string;
  classCount: number;
}
export interface ProgramView {
  id: string;
  code: string;
  name: string;
  status: RecordStatus;
}

// ───────────── Rombel, wali kelas, penempatan ─────────────

export const ClassGroupSchema = z.object({
  academicYearId: z.uuid(),
  gradeLevelId: z.uuid({ error: 'Pilih tingkat.' }),
  programId: z.uuid().optional().nullable(),
  code: z.string().trim().min(1).max(20),
  capacity: z.coerce.number().int().min(1).max(200).default(32),
  mainRoomId: z.uuid().optional().nullable(),
  status: z.enum(RECORD_STATUSES).default('ACTIVE'),
});
export const UpdateClassGroupSchema = ClassGroupSchema.omit({ academicYearId: true }).partial();

/** Mengganti wali kelas: yang lama ditutup sehari sebelum validFrom (riwayat tidak ditimpa). */
export const AssignHomeroomSchema = z.object({
  employeeId: z.uuid({ error: 'Pilih guru.' }),
  validFrom: isoDate,
});

export interface HomeroomView {
  id: string;
  employee: { id: string; fullName: string };
  validFrom: string;
  validTo: string | null;
}

export interface ClassGroupListItem {
  id: string;
  code: string;
  status: RecordStatus;
  academicYear: { id: string; name: string };
  gradeLevel: { id: string; code: string; name: string };
  program: { id: string; code: string } | null;
  homeroom: { id: string; fullName: string } | null;
  mainRoom: { id: string; code: string; name: string } | null;
  capacity: number;
  activeCount: number;
}

export interface EnrollmentView {
  id: string;
  studentId: string;
  fullName: string;
  nis: string;
  validFrom: string;
  validTo: string | null;
  status: 'ACTIVE' | 'ENDED' | 'MOVED';
  reason: string | null;
}

export interface ClassGroupDetail extends ClassGroupListItem {
  enrollments: EnrollmentView[];
  homeroomHistory: HomeroomView[];
}

export const ClassGroupListQuerySchema = z.object({
  academicYearId: z.uuid().optional(),
});

export const EnrollStudentsSchema = z.object({
  studentIds: z.array(z.uuid()).min(1, { error: 'Pilih minimal satu siswa.' }).max(200),
  validFrom: isoDate,
});

export const MoveEnrollmentSchema = z.object({
  toClassGroupId: z.uuid({ error: 'Pilih rombel tujuan.' }),
  date: isoDate,
  reason: z.string().trim().min(3).max(200),
});

export const EndEnrollmentSchema = z.object({
  validTo: isoDate,
  reason: z.string().trim().min(3).max(200),
});

export interface EnrollResult {
  enrolled: number;
  rejected: { studentId: string; fullName: string; reason: string }[];
}

// ───────────── Mapel, penugasan, jam pelajaran ─────────────

export const SubjectSchema = z.object({
  code,
  name: z.string().trim().min(2).max(100),
  groupCode: z.string().trim().max(30).optional().nullable(),
  status: z.enum(RECORD_STATUSES).default('ACTIVE'),
});

export interface SubjectView {
  id: string;
  code: string;
  name: string;
  groupCode: string | null;
  status: RecordStatus;
}

export const TEACHING_ROLES = ['MAIN', 'ASSISTANT'] as const;
export const TeachingAssignmentSchema = z.object({
  termId: z.uuid(),
  subjectId: z.uuid({ error: 'Pilih mata pelajaran.' }),
  classGroupId: z.uuid({ error: 'Pilih rombel.' }),
  employeeId: z.uuid({ error: 'Pilih guru.' }),
  teachingRole: z.enum(TEACHING_ROLES).default('MAIN'),
  weeklyPeriods: z.coerce.number().int().min(0).max(40).default(2),
});

export interface TeachingAssignmentView {
  id: string;
  termId: string;
  subject: { id: string; code: string; name: string };
  classGroup: { id: string; code: string };
  employee: { id: string; fullName: string };
  teachingRole: (typeof TEACHING_ROLES)[number];
  weeklyPeriods: number;
  /** Jumlah slot pada jadwal terbit/draf rombel. */
  scheduledSlots: number;
}

export const LessonPeriodsSchema = z
  .object({
    periods: z
      .array(z.object({ sequence: z.coerce.number().int().min(1).max(20), startTime: time, endTime: time }))
      .min(1)
      .max(20),
  })
  .superRefine((v, ctx) => {
    const sorted = [...v.periods].sort((a, b) => a.sequence - b.sequence);
    sorted.forEach((p, i) => {
      if (p.endTime <= p.startTime) ctx.addIssue({ code: 'custom', path: ['periods', i, 'endTime'], message: 'Jam selesai harus setelah jam mulai.' });
      const next = sorted[i + 1];
      if (next && next.startTime < p.endTime) ctx.addIssue({ code: 'custom', path: ['periods', i + 1, 'startTime'], message: 'Jam pelajaran tumpang tindih.' });
    });
  });

export interface LessonPeriodView {
  sequence: number;
  startTime: string;
  endTime: string;
}

// ───────────── Jadwal (timetable_version per rombel per semester) ─────────────

export const WEEKDAY_LABELS: Record<number, string> = { 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat', 6: 'Sabtu', 7: 'Minggu' };

export const TimetableSlotSchema = z
  .object({
    teachingAssignmentId: z.uuid({ error: 'Pilih penugasan (mapel & guru).' }),
    weekday: z.coerce.number().int().min(1).max(7),
    startTime: time,
    endTime: time,
    roomId: z.uuid().optional().nullable(),
  })
  .refine((v) => v.endTime > v.startTime, { path: ['endTime'], message: 'Jam selesai harus setelah jam mulai.' });

export const PublishTimetableSchema = z.object({ effectiveFrom: isoDate });

export interface TimetableSlotView {
  id: string;
  weekday: number;
  startTime: string;
  endTime: string;
  teachingAssignmentId: string;
  subject: { code: string; name: string };
  classGroup: { id: string; code: string };
  employee: { id: string; fullName: string };
  room: { id: string; code: string } | null;
}

export type ConflictKind = 'teacher' | 'class' | 'room';
export interface TimetableConflict {
  kind: ConflictKind;
  weekday: number;
  startTime: string;
  endTime: string;
  /** Slot di versi ini yang bentrok. */
  slotId: string;
  message: string;
}

export interface TimetableVersionView {
  id: string;
  versionNo: number;
  status: 'DRAFT' | 'PUBLISHED' | 'SUPERSEDED';
  effectiveFrom: string | null;
  publishedAt: string | null;
  slots: TimetableSlotView[];
  conflicts: TimetableConflict[];
}

/** Jadwal satu rombel pada satu semester: draf yang sedang disusun dan versi terbit yang berlaku. */
export interface ClassTimetable {
  term: { id: string; name: string; academicYearName: string };
  classGroup: { id: string; code: string };
  periods: LessonPeriodView[];
  draft: TimetableVersionView | null;
  published: TimetableVersionView | null;
}

export const TimetableQuerySchema = z.object({
  termId: z.uuid().optional(),
  classGroupId: z.uuid().optional(),
});

/** Jadwal kelas untuk portal siswa/wali: jadwal terbit + waktu pembaruan + perubahan pertemuan 14 hari ke depan (E5). */
export interface PortalClassTimetable extends PublishedTimetable {
  classGroup: { id: string; code: string } | null;
  versionNo: number | null;
  publishedAt: string | null;
  effectiveFrom: string | null;
  changes: ScheduleExceptionView[];
}

/** Jadwal terbit yang sudah disaring untuk portal siswa, guru, wali. */
export interface PublishedTimetable {
  term: { id: string; name: string } | null;
  periods: LessonPeriodView[];
  slots: TimetableSlotView[];
}

/** Pilihan untuk form akademik dalam satu panggilan (tanpa perlu izin data induk pegawai). */
export interface AcademicOptions {
  academicYear: { id: string; name: string; startDate: string; endDate: string } | null;
  terms: { id: string; name: string; startDate: string; endDate: string; current: boolean }[];
  teachers: { id: string; fullName: string }[];
  rooms: { id: string; code: string; name: string }[];
  gradeLevels: { id: string; code: string; name: string }[];
  programs: { id: string; code: string; name: string }[];
  subjects: { id: string; code: string; name: string }[];
}

// ───────────── Pengecualian jadwal (FR-5.5) dan tampilan per guru/ruang (FR-5.6) ─────────────

export const SCHEDULE_EXCEPTION_KINDS = ['CANCELLED', 'SUBSTITUTED'] as const;
export type ScheduleExceptionKind = (typeof SCHEDULE_EXCEPTION_KINDS)[number];
export const SCHEDULE_EXCEPTION_LABELS: Record<ScheduleExceptionKind, string> = { CANCELLED: 'Dibatalkan', SUBSTITUTED: 'Diganti' };

export const ScheduleExceptionSchema = z
  .object({
    date: isoDate,
    kind: z.enum(SCHEDULE_EXCEPTION_KINDS),
    substituteEmployeeId: z.uuid().optional().nullable(),
    roomId: z.uuid().optional().nullable(),
    reason: z.string().trim().min(5, { error: 'Jelaskan alasannya.' }).max(200),
  })
  .refine((v) => v.kind !== 'SUBSTITUTED' || !!v.substituteEmployeeId || !!v.roomId, { path: ['substituteEmployeeId'], message: 'Pilih guru pengganti atau ruang pengganti.' });

export interface ScheduleExceptionView {
  id: string;
  date: string;
  kind: ScheduleExceptionKind;
  timetableSlotId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  classGroup: { id: string; code: string };
  subject: { code: string; name: string };
  employee: { id: string; fullName: string };
  substitute: { id: string; fullName: string } | null;
  room: { id: string; code: string } | null;
  reason: string;
}

export const ScheduleExceptionQuerySchema = z.object({ from: isoDate, to: isoDate, classGroupId: z.uuid().optional() });

/** Jadwal terbit dilihat dari sisi guru atau ruang (data yang sama dengan jadwal rombel). */
export const TimetableLensQuerySchema = z
  .object({ termId: z.uuid().optional(), employeeId: z.uuid().optional(), roomId: z.uuid().optional() })
  .refine((v) => !!v.employeeId !== !!v.roomId, { path: ['employeeId'], message: 'Pilih guru atau ruang.' });
