import { z } from 'zod';

/** Hanya untuk development dan tes. Production wajib mengisi APP_SECRET sendiri. */
const DEV_APP_SECRET = 'dev-only-secret-do-not-use-in-production-0000';

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z.string().url(),
    /**
     * Ukuran pool koneksi PostgreSQL. Harus 1 untuk `prisma dev` (PGlite): server itu mencampur pesan
     * antar-koneksi bila ada beberapa koneksi aktif bersamaan. PostgreSQL biasa memakai nilai lebih besar.
     */
    DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
    WEB_ORIGIN: z.string().default('http://localhost:3000'),
    /** Kunci untuk mengenkripsi rahasia MFA. Minimal 32 karakter acak; jangan diganti tanpa migrasi rahasia MFA. */
    APP_SECRET: z.string().min(32).optional(),
    /** Folder penyimpanan dokumen privat (di luar folder publik web). */
    STORAGE_DIR: z.string().default('./storage'),
    MAX_UPLOAD_MB: z.coerce.number().int().min(1).max(50).default(5),
  })
  .transform((env, ctx) => {
    if (!env.APP_SECRET && env.NODE_ENV === 'production') {
      ctx.addIssue({ code: 'custom', path: ['APP_SECRET'], message: 'wajib diisi di production' });
      return z.NEVER;
    }
    return { ...env, APP_SECRET: env.APP_SECRET ?? DEV_APP_SECRET };
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
