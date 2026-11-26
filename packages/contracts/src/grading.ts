import { z } from 'zod';
import { RECORD_STATUSES, type RecordStatus } from './academics.js';
import { isoDate } from './common.js';

// Skema nilai dan capaian pembelajaran (PRD R2 E11, ADR 0005). Skema per mapel × tingkat × semester,
// ditetapkan kurikulum; terbit tidak diubah, perubahan = versi baru.

const componentCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9-]{1,12}$/, { error: 'Kode komponen: huruf, angka, tanda hubung (maks. 12).' });

export const GradeComponentInputSchema = z.object({
  code: componentCode,
  name: z.string().trim().min(2, { error: 'Nama komponen minimal 2 karakter.' }).max(60),
  weight: z.coerce.number().gt(0, { error: 'Bobot harus lebih dari 0.' }).max(100, { error: 'Bobot maksimal 100.' }),
});

const componentsSchema = z
  .array(GradeComponentInputSchema)
  .min(1, { error: 'Isi minimal satu komponen.' })
  .max(12)
  .superRefine((items, ctx) => {
    const seen = new Set<string>();
    items.forEach((c, i) => {
      if (seen.has(c.code)) ctx.addIssue({ code: 'custom', path: [i, 'code'], message: 'Kode komponen ganda.' });
      seen.add(c.code);
    });
  });

const passingScore = z.coerce.number().min(0).max(100).optional().nullable();

export const GradeSchemeSchema = z.object({
  termId: z.uuid({ error: 'Pilih semester.' }),
  subjectId: z.uuid({ error: 'Pilih mata pelajaran.' }),
  gradeLevelId: z.uuid({ error: 'Pilih tingkat.' }),
  passingScore,
  components: componentsSchema,
});

/** Ubah draf: komponen dan KKTP (mapel/tingkat/semester tetap). */
export const UpdateGradeSchemeSchema = z.object({ passingScore, components: componentsSchema });

export const GradeSchemeQuerySchema = z.object({ termId: z.uuid() });

export type SchemeStatus = 'DRAFT' | 'PUBLISHED' | 'SUPERSEDED';
export const SCHEME_STATUS_LABELS: Record<SchemeStatus, string> = { DRAFT: 'Draf', PUBLISHED: 'Terbit', SUPERSEDED: 'Versi lama' };

/** Toleransi pembulatan saat menjumlah bobot desimal. */
export const WEIGHT_TOTAL = 100;
export const weightTotal = (components: { weight: number }[]) => Math.round(components.reduce((n, c) => n + c.weight, 0) * 1000) / 1000;

export interface GradeSchemeView {
  id: string;
  versionNo: number;
  status: SchemeStatus;
  subject: { id: string; code: string; name: string };
  gradeLevel: { id: string; name: string };
  passingScore: number | null;
  roundingRule: string;
  components: { id: string; code: string; name: string; weight: number }[];
  weightTotal: number;
  publishedAt: string | null;
}

/** Ringkasan per mapel × tingkat pada satu semester: versi terbit dan draf yang sedang disusun. */
export interface GradeSchemeRow {
  subject: { id: string; code: string; name: string };
  gradeLevel: { id: string; name: string };
  /** Ada penugasan mengajar untuk mapel ini di tingkat ini pada semester tersebut. */
  taught: boolean;
  published: GradeSchemeView | null;
  draft: GradeSchemeView | null;
}

export const LearningOutcomeSchema = z.object({
  subjectId: z.uuid({ error: 'Pilih mata pelajaran.' }),
  gradeLevelId: z.uuid({ error: 'Pilih tingkat.' }),
  code: z.string().trim().min(1).max(20),
  description: z.string().trim().min(10, { error: 'Deskripsi minimal 10 karakter.' }).max(400),
  status: z.enum(RECORD_STATUSES).default('ACTIVE'),
});

export const LearningOutcomeQuerySchema = z.object({ subjectId: z.uuid().optional(), gradeLevelId: z.uuid().optional() });

export interface LearningOutcomeView {
  id: string;
  subject: { id: string; code: string; name: string };
  gradeLevel: { id: string; name: string };
  code: string;
  description: string;
  status: RecordStatus;
}

/** Penilaian langsung oleh guru pada satu penugasan mengajar (R2 E13 tahap awal). */
export const AssessmentQuerySchema = z.object({ teachingAssignmentId: z.uuid() });

export const CreateAssessmentSchema = z.object({
  teachingAssignmentId: z.uuid({ error: 'Pilih kelas yang diajar.' }),
  componentId: z.uuid({ error: 'Pilih komponen nilai.' }),
  title: z.string().trim().min(3, { error: 'Judul minimal 3 karakter.' }).max(120),
  assessedOn: isoDate.optional(),
});

export const CreateActivitySchema = CreateAssessmentSchema.extend({
  kind: z.enum(['ASSIGNMENT', 'QUIZ', 'EXAM', 'PRACTICE']),
  instructions: z.string().trim().max(10000),
  opensAt: z.iso.datetime({ offset: true }),
  dueAt: z.iso.datetime({ offset: true }),
  allowLate: z.boolean().default(false),
  allowResubmit: z.boolean().default(true),
  acceptsSubmissions: z.boolean().default(true),
}).refine((input) => Date.parse(input.opensAt) < Date.parse(input.dueAt), {
  path: ['dueAt'], message: 'Tenggat harus setelah waktu buka.',
});

export const ActivityStatusSchema = z.object({ status: z.enum(['PUBLISHED', 'CLOSED', 'CANCELLED']) });
export const SubmitActivitySchema = z.object({ text: z.string().trim().max(20000).optional(), idempotencyKey: z.uuid() });

export interface PortalActivity {
  id: string;
  title: string;
  instructions: string;
  dueAt: string;
  status: 'PUBLISHED' | 'CLOSED';
  canSubmit: boolean;
  acceptsSubmissions: boolean;
  teachingAssignment: { subject: { name: string } };
  submissions: { status: 'ON_TIME' | 'LATE'; submittedAt: string; latestVersionNo: number }[];
}

export interface AssessmentView {
  id: string;
  teachingAssignmentId: string;
  title: string;
  assessedOn: string | null;
  status: 'DRAFT' | 'PUBLISHED';
  component: { id: string; code: string; name: string; schemeVersionNo: number };
  createdAt: string;
}

/** Kelas yang diajar guru aktif dan komponen nilai dari skema terbit. */
export interface TeacherAssessmentOption {
  teachingAssignmentId: string;
  classCode: string;
  subjectName: string;
  termName: string;
  components: { id: string; code: string; name: string }[];
}

/** Nilai per siswa pada satu penilaian. Versi 0 berarti belum ada baris grade_entry. */
export const GradeEntrySaveSchema = z.object({
  state: z.enum(['PENDING', 'SCORED', 'MISSING', 'EXCUSED']),
  score: z.number().min(0).max(100).nullable(),
  feedback: z.string().trim().max(1000).nullable(),
  versionNo: z.number().int().min(0),
}).superRefine((value, ctx) => {
  if (value.state === 'SCORED' && value.score === null) {
    ctx.addIssue({ code: 'custom', path: ['score'], message: 'Isi nilai untuk keadaan Dinilai.' });
  }
  if (value.state !== 'SCORED' && value.score !== null) {
    ctx.addIssue({ code: 'custom', path: ['score'], message: 'Nilai angka hanya untuk keadaan Dinilai.' });
  }
  if (value.score !== null && Math.abs(value.score * 10 - Math.round(value.score * 10)) > 1e-8) {
    ctx.addIssue({ code: 'custom', path: ['score'], message: 'Nilai maksimal satu angka desimal.' });
  }
});

export type GradeState = 'PENDING' | 'SCORED' | 'MISSING' | 'EXCUSED';
export const GRADE_STATE_LABELS: Record<GradeState, string> = {
  PENDING: 'Belum dinilai', SCORED: 'Dinilai', MISSING: 'Tidak mengumpulkan', EXCUSED: 'Tidak berlaku',
};

export interface AssessmentGradeRow {
  studentId: string;
  nis: string;
  fullName: string;
  state: GradeState;
  score: number | null;
  feedback: string | null;
  versionNo: number;
}

export interface AssessmentGradeSheet {
  assessment: AssessmentView;
  rosterDate: string;
  students: AssessmentGradeRow[];
}

export interface AssignmentGradeBook {
  assessments: Pick<AssessmentView, 'id' | 'title' | 'status'>[];
  students: {
    studentId: string;
    fullName: string;
    nis: string;
    cells: Record<string, { state: GradeState; score: number | null; feedback: string | null }>;
  }[];
}

export type GradeAggregateStatus = 'COMPLETE' | 'INCOMPLETE' | 'EXCUSED';

export interface GradeAggregateVersion {
  schemeVersionId: string;
  versionNo: number;
  passingScore: number | null;
  students: {
    studentId: string;
    fullName: string;
    nis: string;
    components: { id: string; name: string; weight: number; average: number | null; status: GradeAggregateStatus }[];
    finalScore: number | null;
    status: GradeAggregateStatus;
    needsFollowUp: boolean | null;
  }[];
}

export const BulkGradeSaveSchema = z.object({
  rows: z.array(GradeEntrySaveSchema.safeExtend({ studentId: z.uuid() })).min(1).max(100),
}).superRefine(({ rows }, ctx) => {
  const seen = new Set<string>();
  rows.forEach((row, index) => {
    if (seen.has(row.studentId)) ctx.addIssue({ code: 'custom', path: ['rows', index, 'studentId'], message: 'Siswa muncul lebih dari sekali.' });
    seen.add(row.studentId);
  });
});

export const PublishedGradeCorrectionSchema = GradeEntrySaveSchema.safeExtend({
  state: z.enum(['SCORED', 'MISSING', 'EXCUSED']),
  reason: z.string().trim().min(10, { error: 'Alasan koreksi minimal 10 karakter.' }).max(500),
});

export interface PublishedGradeChange {
  id: string;
  oldState: GradeState;
  oldScore: number | null;
  newState: GradeState;
  newScore: number | null;
  reason: string;
  actorName: string;
  createdAt: string;
}

/** Hanya nilai dari penilaian terbit yang boleh terlihat pada portal siswa/wali. */
export const PortalGradesQuerySchema = z.object({ studentId: z.uuid().optional() });

export interface PortalGradeItem {
  assessmentId: string;
  title: string;
  assessedOn: string;
  publishedAt: string;
  subject: string;
  classCode: string;
  component: string;
  state: GradeState;
  score: number | null;
  feedback: string | null;
}

export interface PortalGradesView {
  studentId: string;
  items: PortalGradeItem[];
  summaries: {
    key: string;
    subject: string;
    classCode: string;
    term: string;
    academicYear: string;
    versionNo: number;
    finalScore: number | null;
    status: GradeAggregateStatus;
  }[];
}
