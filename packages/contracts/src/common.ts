import { z } from 'zod';

/** Field teks opsional: string kosong dianggap tidak diisi. */
export const optionalText = (max = 200) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const isoDate = z.iso.date({ error: 'Gunakan format tanggal YYYY-MM-DD.' });
export const optionalIsoDate = isoDate.optional().nullable();

export const PageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export type PageQuery = z.infer<typeof PageQuerySchema>;

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export const UuidParamSchema = z.uuid({ error: 'ID tidak valid.' });
