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
