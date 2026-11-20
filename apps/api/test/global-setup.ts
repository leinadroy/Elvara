import { execSync } from 'node:child_process';
import type { TestProject } from 'vitest/node';

/** Terapkan semua migrasi ke database tes sebelum tes berjalan. */
export default function setup(project: TestProject) {
  execSync('npx prisma migrate deploy', {
    stdio: 'pipe',
    env: { ...process.env, DATABASE_URL: project.config.provide.DATABASE_URL },
  });
}

declare module 'vitest' {
  export interface ProvidedContext {
    DATABASE_URL: string;
  }
}
