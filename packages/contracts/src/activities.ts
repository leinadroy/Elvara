import { z } from 'zod';
import type { GradeCell } from './grading.js';

// Tugas dan pengumpulan (PRD R2 E12, blueprint learning_activity / submission / submission_version).

export const ACTIVITY_KINDS = ['ASSIGNMENT', 'QUIZ', 'EXAM', 'PRACTICE'] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];
export const ACTIVITY_KIND_LABELS: Record<ActivityKind, string> = { ASSIGNMENT: 'Tugas', QUIZ: 'Kuis', EXAM: 'Ujian', PRACTICE: 'Praktik' };

export type ActivityStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'CANCELLED';
export const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, string> = { DRAFT: 'Draf', PUBLISHED: 'Terbit', CLOSED: 'Ditutup', CANCELLED: 'Dibatalkan' };

export type SubmissionState = 'NOT_SUBMITTED' | 'ON_TIME' | 'LATE';
export const SUBMISSION_STATE_LABELS: Record<SubmissionState, string> = { NOT_SUBMITTED: 'Belum mengumpulkan', ON_TIME: 'Tepat waktu', LATE: 'Terlambat' };

const datetime = z.iso.datetime({ offset: true, error: 'Tanggal dan jam tidak valid.' });

const activityFields = {
  kind: z.enum(ACTIVITY_KINDS).default('ASSIGNMENT'),
  title: z.string().trim().min(3, { error: 'Judul minimal 3 karakter.' }).max(120),
  instructions: z.string().trim().max(5000).default(''),
  opensAt: datetime,
  dueAt: datetime,
  allowLate: z.boolean().default(false),
  allowResubmit: z.boolean().default(true),
  /** false = dikerjakan di luar aplikasi (mis. ujian tertulis); tidak ada pengumpulan. */
  acceptsSubmissions: z.boolean().default(true),
};

export const ActivitySchema = z
  .object({
    teachingAssignmentId: z.uuid(),
    ...activityFields,
    /** Bila diisi, dibuat penilaian di komponen ini yang tertaut ke tugas. */
    componentId: z.uuid().optional().nullable(),
  })
  .refine((v) => new Date(v.dueAt) > new Date(v.opensAt), { path: ['dueAt'], message: 'Tenggat harus setelah waktu buka.' });

export const UpdateActivitySchema = z.object(activityFields).refine((v) => new Date(v.dueAt) > new Date(v.opensAt), { path: ['dueAt'], message: 'Tenggat harus setelah waktu buka.' });

export const ActivityListQuerySchema = z.object({ teachingAssignmentId: z.uuid() });
export const PortalActivityQuerySchema = z.object({ studentId: z.uuid().optional() });

/** Field multipart pengumpulan (selain berkas). */
export const SubmitSchema = z.object({
  text: z.string().trim().max(10000).optional().nullable(),
  /** Kunci dari klien; kirim ulang dengan kunci yang sama tidak membuat versi baru. */
  idempotencyKey: z.string().trim().min(8).max(80),
});

export interface ActivityView {
  id: string;
  kind: ActivityKind;
  title: string;
  instructions: string;
  opensAt: string;
  dueAt: string;
  allowLate: boolean;
  allowResubmit: boolean;
  acceptsSubmissions: boolean;
  status: ActivityStatus;
  teachingAssignment: { id: string; subject: { code: string; name: string }; classGroup: { id: string; code: string }; teacher: string };
  /** Penilaian tertaut (nilai diisi lewat buku nilai). */
  assessment: { id: string; status: 'DRAFT' | 'PUBLISHED'; component: string } | null;
  counts: { total: number; onTime: number; late: number; notSubmitted: number };
}

export interface SubmissionVersionView {
  versionNo: number;
  text: string | null;
  file: { name: string; mimeType: string; sizeBytes: number; url: string } | null;
  late: boolean;
  submittedAt: string;
}

/** Baris pengumpulan per siswa untuk guru. */
export interface SubmissionRow {
  studentId: string;
  fullName: string;
  nis: string;
  state: SubmissionState;
  submittedAt: string | null;
  versions: SubmissionVersionView[];
  grade: GradeCell | null;
}

export interface ActivityDetail extends ActivityView {
  canEdit: boolean;
  submissions: SubmissionRow[];
}

/** Tugas dari sisi siswa/wali (hanya tugas terbit untuk rombelnya). */
export interface PortalActivity extends ActivityView {
  mine: { state: SubmissionState; submittedAt: string | null; versions: SubmissionVersionView[] };
  /** Nilai hanya tampil bila penilaian tertaut sudah terbit. */
  grade: GradeCell | null;
  canSubmit: boolean;
  /** Alasan tidak bisa mengumpulkan (belum dibuka, lewat tenggat, sudah mengumpulkan, dsb.). */
  blockedReason: string | null;
}
