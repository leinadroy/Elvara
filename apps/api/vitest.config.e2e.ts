import 'dotenv/config';
import { defineConfig } from 'vitest/config';

/** Tes e2e memakai database terpisah (TEST_DATABASE_URL) agar data development tidak tersentuh. */
const DATABASE_URL = process.env.TEST_DATABASE_URL;
if (!DATABASE_URL) throw new Error('TEST_DATABASE_URL belum diisi di apps/api/.env (lihat .env.example).');
if (DATABASE_URL === process.env.DATABASE_URL) throw new Error('TEST_DATABASE_URL tidak boleh sama dengan DATABASE_URL.');

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    globalSetup: ['./test/global-setup.ts'],
    // Batas login dinaikkan agar banyak login di tes tidak terkena rate limit; tes khusus menurunkannya.
    env: { DATABASE_URL, NODE_ENV: 'test', LOGIN_RATE_LIMIT: '1000', STORAGE_DIR: './storage-test', DATABASE_POOL_MAX: process.env.DATABASE_POOL_MAX ?? '1' },
    provide: { DATABASE_URL },
    fileParallelism: false,
    hookTimeout: 60_000,
    testTimeout: 30_000,
  },
});
