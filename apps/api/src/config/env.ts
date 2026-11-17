import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().url(),
  WEB_ORIGIN: z.string().default('http://localhost:3000'),
});

export type Env = z.infer<typeof EnvSchema>;

/** Dipakai oleh ConfigModule: aplikasi gagal start bila env wajib tidak valid. */
export function validateEnv(config: Record<string, unknown>): Env {
  const result = EnvSchema.safeParse(config);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Konfigurasi environment tidak valid: ${issues}`);
  }
  return result.data;
}
