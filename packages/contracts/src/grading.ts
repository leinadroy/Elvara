import { z } from 'zod';
import { RECORD_STATUSES, type RecordStatus } from './academics.js';

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

// ───────────── Penilaian dan buku nilai (PRD R2 E13) ─────────────

export const GRADE_STATES = ['PENDING', 'SCORED', 'MISSING', 'EXCUSED'] as const;
export type GradeState = (typeof GRADE_STATES)[number];
export const GRADE_STATE_LABELS: Record<GradeState, string> = {
  PENDING: 'Belum dinilai',
  SCORED: 'Dinilai',
  MISSING: 'Tidak mengumpulkan (0)',
  EXCUSED: 'Tidak berlaku',
};

export const AssessmentSchema = z.object({
  teachingAssignmentId: z.uuid(),
  componentId: z.uuid({ error: 'Pilih komponen.' }),
  title: z.string().trim().min(3, { error: 'Judul minimal 3 karakter.' }).max(120),
  assessedOn: z.iso.date({ error: 'Tanggal tidak valid.' }).optional().nullable(),
});

export const GradeEntryInputSchema = z
  .object({
    studentId: z.uuid(),
    state: z.enum(GRADE_STATES),
    score: z.coerce.number().min(0, { error: 'Nilai minimal 0.' }).max(100, { error: 'Nilai maksimal 100.' }).optional().nullable(),
    feedback: z.string().trim().max(500).optional().nullable(),
    /** Versi yang dilihat saat mengedit; berbeda dengan versi tersimpan → 409 (FR-13.5). Kosong untuk nilai baru. */
    versionNo: z.number().int().positive().optional().nullable(),
  })
  .refine((v) => (v.state === 'SCORED') === (v.score !== undefined && v.score !== null), { path: ['score'], message: 'Isi nilai hanya untuk keadaan "Dinilai".' });

export const SaveGradesSchema = z.object({
  entries: z.array(GradeEntryInputSchema).min(1).max(200),
  /** Wajib bila penilaian sudah terbit (FR-13.4). */
  reason: z.string().trim().min(5, { error: 'Jelaskan alasan perubahan nilai terbit.' }).max(300).optional().nullable(),
});

export const GradebookQuerySchema = z.object({ teachingAssignmentId: z.uuid() });

export interface AssessmentView {
  id: string;
  title: string;
  component: { id: string; code: string; name: string; weight: number };
  assessedOn: string | null;
  status: 'DRAFT' | 'PUBLISHED';
  publishedAt: string | null;
  /** Kegiatan (tugas) sumber penilaian ini, bila ada. */
  activityId: string | null;
  /** Ringkasan keadaan nilai pada penilaian ini. */
  counts: Record<GradeState, number>;
}

export interface GradeCell {
  state: GradeState;
  score: number | null;
  feedback: string | null;
  versionNo: number;
}

/** Hasil perhitungan backend (aturan skema berversi). Nilai kosong tidak pernah dianggap nol. */
export interface FinalGrade {
  /** Rata-rata per kode komponen; null bila belum ada nilai yang dihitung. */
  components: Record<string, number | null>;
  /** Nilai akhir sebelum dibulatkan; null bila belum lengkap. */
  raw: number | null;
  /** Dibulatkan sekali ke bilangan bulat (setengah ke atas). */
  rounded: number | null;
  complete: boolean;
  /** Penyebab belum lengkap, dalam kalimat. */
  issues: string[];
  /** Di bawah KKTP (bila skema punya KKTP). */
  belowPassing: boolean;
}

export interface GradebookRow {
  studentId: string;
  fullName: string;
  nis: string;
  cells: Record<string, GradeCell>;
  final: FinalGrade;
}

export interface Gradebook {
  assignment: { id: string; subject: { id: string; code: string; name: string }; classGroup: { id: string; code: string }; term: { id: string; name: string }; teacher: string };
  scheme: GradeSchemeView | null;
  assessments: AssessmentView[];
  rows: GradebookRow[];
  /** Guru penugasan boleh mengubah; pembaca (kurikulum/pimpinan/wali kelas) hanya melihat. */
  canEdit: boolean;
}

/** Penugasan mengajar guru yang sedang masuk, untuk daftar buku nilai. */
export interface MyTeachingAssignment {
  id: string;
  subject: { id: string; code: string; name: string };
  classGroup: { id: string; code: string };
  term: { id: string; name: string };
  hasScheme: boolean;
  assessments: number;
  unpublished: number;
}
