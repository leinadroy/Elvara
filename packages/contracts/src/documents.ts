import { z } from 'zod';

export const DOCUMENT_CATEGORIES = ['IDENTITY', 'FAMILY_CARD', 'BIRTH_CERTIFICATE', 'DIPLOMA', 'PHOTO', 'OTHER'] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];
export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  IDENTITY: 'Kartu identitas',
  FAMILY_CARD: 'Kartu keluarga',
  BIRTH_CERTIFICATE: 'Akta kelahiran',
  DIPLOMA: 'Ijazah / rapor lama',
  PHOTO: 'Pas foto',
  OTHER: 'Lainnya',
};

/** Jenis file yang diterima. Isi file diperiksa dari byte awalnya, bukan hanya dari nama/ekstensi. */
export const DOCUMENT_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;

/** Field form multipart selain file. */
export const UploadDocumentSchema = z.object({
  category: z.enum(DOCUMENT_CATEGORIES),
  title: z.string().trim().min(2, { error: 'Judul minimal 2 karakter.' }).max(120),
});

export interface PersonDocumentView {
  id: string;
  category: DocumentCategory;
  title: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string | null;
  createdAt: string;
}
