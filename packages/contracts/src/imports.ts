import { z } from 'zod';

/** Kolom CSV impor siswa (baris pertama = header, pemisah koma atau titik koma). */
export const STUDENT_IMPORT_COLUMNS = [
  'nis',
  'nama_lengkap',
  'jenis_kelamin',
  'tanggal_lahir',
  'tempat_lahir',
  'nisn',
  'email',
  'telepon',
] as const;
export const STUDENT_IMPORT_REQUIRED = ['nis', 'nama_lengkap'] as const;

export const ImportStudentsSchema = z.object({
  fileName: z.string().trim().max(200).optional(),
  content: z
    .string()
    .min(1, { error: 'File kosong.' })
    .max(2_000_000, { error: 'File maksimal 2 MB.' }),
});

export type ImportRowStatus = 'CREATED' | 'SKIPPED' | 'ERROR';

export interface ImportBatchSummary {
  id: string;
  fileName: string | null;
  totalRows: number;
  createdCount: number;
  skippedCount: number;
  errorCount: number;
  createdAt: string;
  /** true bila isi file identik dengan impor sebelumnya. */
  isRepeat: boolean;
}

export interface ImportBatchDetail extends ImportBatchSummary {
  rows: { rowNumber: number; status: ImportRowStatus; message: string | null; entityId: string | null }[];
}
