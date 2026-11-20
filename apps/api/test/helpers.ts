import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { hashPassword } from '../src/auth/crypto.js';
import { PrismaClient, type RoleKey } from '../src/generated/prisma/client.js';

export const PASSWORD = 'Rahasia-Tes-123';
export const WEB_ORIGIN = 'http://localhost:3000';

export async function createApp(): Promise<INestApplication<App>> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>();
  app.setGlobalPrefix('api/v1');
  await app.init();
  return app;
}

export function createPrisma() {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL!, max: 1 }) });
}

/** Kosongkan semua tabel. TRUNCATE tidak memicu trigger audit (yang hanya menolak UPDATE/DELETE per baris). */
export async function resetDb(prisma: PrismaClient) {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(', ')} CASCADE`);
}

export interface Fixture {
  schoolId: string;
  emails: Record<'admin' | 'teacher' | 'curriculum', string>;
  studentIds: string[];
}

/** Sekolah, satu admin, satu guru, satu kurikulum, dan dua siswa. */
export async function seedFixture(prisma: PrismaClient): Promise<Fixture> {
  const school = await prisma.school.create({ data: { name: 'Sekolah Tes' } });
  const passwordHash = await hashPassword(PASSWORD);
  const emails = { admin: 'admin@tes.test', teacher: 'guru@tes.test', curriculum: 'kurikulum@tes.test' };
  const roles: Record<keyof typeof emails, RoleKey> = { admin: 'ADMIN', teacher: 'TEACHER', curriculum: 'CURRICULUM' };
  let n = 0;
  for (const key of Object.keys(emails) as (keyof typeof emails)[]) {
    const person = await prisma.person.create({ data: { schoolId: school.id, fullName: `Pegawai ${key}`, email: emails[key] } });
    await prisma.employee.create({ data: { schoolId: school.id, personId: person.id, employeeNumber: `E-${++n}`, position: key } });
    await prisma.user.create({
      data: { email: emails[key], passwordHash, personId: person.id, roles: { create: { role: roles[key], schoolId: school.id } } },
    });
  }
  const studentIds: string[] = [];
  for (const [nis, name] of [['1001', 'Siswa Satu'], ['1002', 'Siswa Dua']]) {
    const person = await prisma.person.create({ data: { schoolId: school.id, fullName: name! } });
    const s = await prisma.student.create({ data: { schoolId: school.id, personId: person.id, nis: nis! } });
    studentIds.push(s.id);
  }
  return { schoolId: school.id, emails, studentIds };
}

/** Agent supertest yang menyimpan cookie sesi setelah login. */
export async function loginAs(app: INestApplication<App>, email: string, password = PASSWORD) {
  const agent = request.agent(app.getHttpServer());
  await agent.post('/api/v1/auth/login').send({ email, password }).expect(200);
  return agent;
}
