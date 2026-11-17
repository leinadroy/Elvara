import { z } from 'zod';

/**
 * Format kesalahan API yang konsisten (lihat docs, bagian "Kontrak API dan kesalahan").
 * Setiap respons gagal memuat `code`, `message`, `requestId`, dan `fieldErrors` bila relevan.
 */
export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  requestId: z.string(),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

/** Header yang membawa ID permintaan antara web, API, dan log. */
export const REQUEST_ID_HEADER = 'x-request-id';
