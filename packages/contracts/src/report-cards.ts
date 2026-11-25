import { z } from 'zod';
import type { AttendanceStatus } from './attendance.js';

// Rapor (PRD R2 E15, ADR 0005). Satu rapor per siswa per semester. Guru mapel menulis deskripsi capaian,
// wali kelas mengajukan, kepala sekolah menyetujui (terbit) atau mengembalikan. Terbit = versi tetap
// (snapshot + PDF); revisi setelah terbit membuat versi baru beralasan.

export const REPORT_CARD_STATUSES = ['DRAFT', 'SUBMITTED', 'RETURNED', 'PUBLISHED'] as const;
export type ReportCardStatus = (typeof REPORT_CARD_STATUSES)[number];
export const REPORT_CARD_STATUS_LABELS: Record<ReportCardStatus, string> = {
  DRAFT: 'Draf',
  SUBMITTED: 'Menunggu persetujuan',
  RETURNED: 'Dikembalikan',
  PUBLISHED: 'Terbit',
};

const description = z.string().trim().max(500, { error: 'Maksimal 500 karakter.' });

// ───────────── Deskripsi capaian (guru mapel) ─────────────

export const ReportDescriptionsQuerySchema = z.object({ teachingAssignmentId: z.uuid() });

export const SaveReportDescriptionsSchema = z.object({
  teachingAssignmentId: z.uuid(),
  entries: z
    .array(z.object({ studentId: z.uuid(), highestAchievement: description.nullable().optional(), needsImprovement: description.nullable().optional() }))
    .min(1)
    .max(60),
});

export interface ReportDescriptionRow {
  studentId: string;
  fullName: string;
  nis: string | null;
  /** Nilai akhir terbit mapel ini (null bila belum lengkap). */
  finalScore: number | null;
  belowPassing: boolean;
  highestAchievement: string | null;
  needsImprovement: string | null;
  status: ReportCardStatus;
  /** Rapor sudah diajukan/terbit: deskripsi terkunci. */
  locked: boolean;
}

export interface ReportDescriptions {
  assignment: { id: string; subject: { id: string; code: string; name: string }; classGroup: { id: string; code: string }; term: { id: string; name: string } };
  outcomes: { id: string; code: string; description: string }[];
  rows: ReportDescriptionRow[];
  canEdit: boolean;
}

// ───────────── Rapor rombel (wali kelas, kurikulum, pimpinan) ─────────────

export const ReportCardClassQuerySchema = z.object({ classGroupId: z.uuid(), termId: z.uuid().optional() });
export const ReportCardOverviewQuerySchema = z.object({ termId: z.uuid().optional() });

export interface ReportCardSubjectView {
  subject: { id: string; code: string; name: string };
  teacher: string | null;
  finalScore: number | null;
  passingScore: number | null;
  belowPassing: boolean;
  highestAchievement: string | null;
  needsImprovement: string | null;
}

export type AttendanceSummary = Record<AttendanceStatus, number>;

/** Isi rapor: dipakai untuk pratinjau dan disalin utuh sebagai snapshot saat terbit. */
export interface ReportCardContent {
  school: { name: string; npsn: string | null; address: string | null };
  student: { id: string; fullName: string; nis: string | null; nisn: string | null };
  classGroup: { id: string; code: string };
  term: { id: string; name: string; academicYear: string };
  homeroomTeacher: string | null;
  subjects: ReportCardSubjectView[];
  attendance: AttendanceSummary;
  homeroomNote: string | null;
}

export interface ReportCardVersionView {
  id: string;
  versionNo: number;
  publishedAt: string;
  publishedBy: string | null;
  revisionReason: string | null;
  fileUrl: string;
}

export interface ReportCardRow {
  id: string;
  student: { id: string; fullName: string; nis: string | null };
  status: ReportCardStatus;
  issues: string[];
  currentVersionNo: number;
  submittedAt: string | null;
  returnNote: string | null;
}

export interface ReportCardClass {
  classGroup: { id: string; code: string };
  term: { id: string; name: string };
  homeroomTeacher: string | null;
  rows: ReportCardRow[];
  /** Wali kelas rombel ini: boleh mengisi catatan dan mengajukan. */
  canSubmit: boolean;
  canApprove: boolean;
}

export interface ReportCardDetail {
  id: string;
  status: ReportCardStatus;
  content: ReportCardContent;
  issues: string[];
  returnNote: string | null;
  pendingRevisionReason: string | null;
  submittedAt: string | null;
  decidedAt: string | null;
  versions: ReportCardVersionView[];
  canSubmit: boolean;
  canApprove: boolean;
}

/** Ringkasan per rombel untuk daftar rapor (progres kurikulum, antrean pimpinan, rombel binaan wali kelas). */
export interface ReportCardClassSummary {
  classGroup: { id: string; code: string };
  homeroomTeacher: string | null;
  students: number;
  counts: Record<ReportCardStatus, number>;
}

export interface ReportCardOverview {
  term: { id: string; name: string } | null;
  classes: ReportCardClassSummary[];
  canApprove: boolean;
}

export const ReportCardNoteSchema = z.object({ homeroomNote: z.string().trim().max(1000, { error: 'Maksimal 1000 karakter.' }).nullable() });
export const ReportCardIdsSchema = z.object({ ids: z.array(z.uuid()).min(1, { error: 'Pilih minimal satu rapor.' }).max(60) });
export const ReturnReportCardSchema = z.object({ note: z.string().trim().min(5, { error: 'Tulis alasan pengembalian (min. 5 karakter).' }).max(500) });
export const ReviseReportCardSchema = z.object({ reason: z.string().trim().min(5, { error: 'Tulis alasan revisi (min. 5 karakter).' }).max(500) });

// ───────────── Portal siswa dan wali ─────────────

export const PortalReportCardsQuerySchema = z.object({ studentId: z.uuid().optional() });

export interface PortalReportCard {
  id: string;
  term: { id: string; name: string };
  versionNo: number;
  publishedAt: string;
  content: ReportCardContent;
  versions: ReportCardVersionView[];
}

export interface PortalReportCards {
  student: { id: string; fullName: string };
  items: PortalReportCard[];
}
