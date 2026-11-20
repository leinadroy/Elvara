import { z } from 'zod';
import { GENDERS } from './people.js';
import { optionalIsoDate } from './common.js';

/** Field data diri yang boleh diajukan koreksinya oleh pemilik data. Identifier (NIS/NIP) hanya diubah admin. */
export const CORRECTABLE_FIELDS = ['fullName', 'gender', 'birthDate', 'birthPlace', 'phone', 'address'] as const;
export type CorrectableField = (typeof CORRECTABLE_FIELDS)[number];
export const CORRECTABLE_FIELD_LABELS: Record<CorrectableField, string> = {
  fullName: 'Nama lengkap',
  gender: 'Jenis kelamin',
  birthDate: 'Tanggal lahir',
  birthPlace: 'Tempat lahir',
  phone: 'Telepon',
  address: 'Alamat',
};

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v ? v : null))
    .nullable();

export const CreateCorrectionSchema = z
  .object({
    changes: z
      .object({
        fullName: z.string().trim().min(2).max(150).optional(),
        gender: z.enum(GENDERS).nullable().optional(),
        birthDate: optionalIsoDate,
        birthPlace: text(100).optional(),
        phone: text(30).optional(),
        address: text(300).optional(),
      })
      .strict(),
    reason: z.string().trim().min(5, { error: 'Jelaskan alasan koreksi (minimal 5 karakter).' }).max(500),
  })
  .refine((v) => Object.values(v.changes).some((x) => x !== undefined), {
    path: ['changes'],
    message: 'Ubah minimal satu data.',
  });
export type CreateCorrectionInput = z.input<typeof CreateCorrectionSchema>;

export const ReviewCorrectionSchema = z.object({
  note: z.string().trim().max(500).optional().transform((v) => (v ? v : null)),
});

export type CorrectionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export const CORRECTION_STATUS_LABELS: Record<CorrectionStatus, string> = {
  PENDING: 'Menunggu tinjauan',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
  CANCELLED: 'Dibatalkan',
};

export const CorrectionListQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).optional(),
});

export interface CorrectionView {
  id: string;
  person: { id: string; fullName: string; kind: 'student' | 'employee' | 'guardian' | 'other'; detailPath: string | null };
  changes: Partial<Record<CorrectableField, { from: unknown; to: unknown }>>;
  reason: string;
  status: CorrectionStatus;
  requestedBy: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
}
