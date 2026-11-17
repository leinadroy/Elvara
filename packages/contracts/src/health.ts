import { z } from 'zod';

export const HealthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  service: z.literal('api'),
  version: z.string(),
  time: z.string(),
  checks: z.object({
    database: z.enum(['up', 'down']),
  }),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
