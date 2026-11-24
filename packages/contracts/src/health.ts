import { z } from 'zod';

export const HealthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  service: z.literal('api'),
  version: z.string(),
  time: z.string(),
  checks: z.object({
    database: z.enum(['up', 'down']),
  }),
  /** Status job terjadwal (tanpa pesan error; detail ada di log). */
  jobs: z
    .record(
      z.string(),
      z.object({
        state: z.enum(['pending', 'ok', 'failed', 'stale']),
        lastRunAt: z.string().nullable(),
        lastSuccessAt: z.string().nullable(),
        consecutiveFailures: z.number(),
      }),
    )
    .optional(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
