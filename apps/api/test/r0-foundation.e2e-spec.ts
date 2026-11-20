import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { HealthResponseSchema, SESSION_COOKIE } from '@smart-school/contracts';
import type { PrismaClient } from '../src/generated/prisma/client.js';
import { createApp, createPrisma, loginAs, PASSWORD, resetDb, seedFixture, WEB_ORIGIN, type Fixture } from './helpers.js';

let app: INestApplication<App>;
let prisma: PrismaClient;
let fx: Fixture;

beforeAll(async () => {
  prisma = createPrisma();
  app = await createApp();
});

beforeEach(async () => {
  await resetDb(prisma);
  fx = await seedFixture(prisma);
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

const api = (path: string) => `/api/v1${path}`;

describe('health & error format', () => {
  it('health is public and reports the database as up', async () => {
    const res = await request(app.getHttpServer()).get(api('/health')).expect(200);
    expect(HealthResponseSchema.parse(res.body).checks.database).toBe('up');
  });

  it('unknown routes return ApiError with the request id', async () => {
    const res = await request(app.getHttpServer()).get(api('/nope')).expect(404);
    expect(res.body).toMatchObject({ code: 'NOT_FOUND', requestId: res.headers['x-request-id'] });
  });
});

describe('E1 authentication & sessions', () => {
  it('rejects wrong password and unknown email with the same generic message', async () => {
    const server = app.getHttpServer();
    const a = await request(server).post(api('/auth/login')).send({ email: fx.emails.admin, password: 'salah-sekali' }).expect(401);
    const b = await request(server).post(api('/auth/login')).send({ email: 'tidak.ada@tes.test', password: 'salah-sekali' }).expect(401);
    expect(a.body.message).toBe(b.body.message);
    expect(await prisma.auditEvent.count({ where: { action: 'auth.login_failed' } })).toBe(2);
  });

  it('sets an HttpOnly SameSite=Lax session cookie and returns the profile', async () => {
    const res = await request(app.getHttpServer()).post(api('/auth/login')).send({ email: 'ADMIN@tes.test', password: PASSWORD }).expect(200);
    const cookie = String(res.headers['set-cookie']);
    expect(cookie).toContain(`${SESSION_COOKIE}=`);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(res.body).toMatchObject({ activeRole: 'ADMIN', roles: ['ADMIN'], school: { name: 'Sekolah Tes' } });
    expect(res.body.permissions).toContain('people:manage');
  });

  it('stores only a hash of the session token', async () => {
    const res = await request(app.getHttpServer()).post(api('/auth/login')).send({ email: fx.emails.admin, password: PASSWORD });
    const token = /ss_session=([^;]+)/.exec(String(res.headers['set-cookie']))![1]!;
    const sessions = await prisma.session.findMany();
    expect(sessions).toHaveLength(1);
    expect(sessions[0]!.tokenHash).not.toContain(token);
  });

  it('requires a session for protected routes and ends it on logout', async () => {
    await request(app.getHttpServer()).get(api('/students')).expect(401);
    const agent = await loginAs(app, fx.emails.admin);
    await agent.get(api('/auth/me')).expect(200);
    await agent.post(api('/auth/logout')).expect(204);
    await agent.get(api('/auth/me')).expect(401);
  });

  it('disabling an account ends its sessions immediately', async () => {
    const admin = await loginAs(app, fx.emails.admin);
    const teacher = await loginAs(app, fx.emails.teacher);
    await teacher.get(api('/auth/me')).expect(200);
    const teacherUser = await prisma.user.findUniqueOrThrow({ where: { email: fx.emails.teacher } });
    await admin.post(api(`/accounts/${teacherUser.id}/disable`)).expect(204);
    await teacher.get(api('/auth/me')).expect(401);
    await request(app.getHttpServer()).post(api('/auth/login')).send({ email: fx.emails.teacher, password: PASSWORD }).expect(401);
  });

  it('rate-limits repeated login attempts (429)', async () => {
    // Instance terpisah: penyimpanan throttler sendiri, sehingga blokir tidak bocor ke tes lain.
    const isolated = await createApp();
    const previous = process.env.LOGIN_RATE_LIMIT;
    process.env.LOGIN_RATE_LIMIT = '3';
    try {
      const statuses: number[] = [];
      for (let i = 0; i < 5; i++) {
        const res = await request(isolated.getHttpServer()).post(api('/auth/login')).send({ email: 'x@tes.test', password: 'salah-sekali' });
        statuses.push(res.status);
      }
      expect(statuses.slice(0, 3)).toEqual([401, 401, 401]);
      expect(statuses.slice(3)).toEqual([429, 429]);
    } finally {
      process.env.LOGIN_RATE_LIMIT = previous;
      await isolated.close();
    }
  });

  it('rejects mutations from a foreign origin', async () => {
    const agent = await loginAs(app, fx.emails.admin);
    await agent.post(api('/buildings')).set('Origin', 'https://evil.example').send({ code: 'X', name: 'X' }).expect(403);
    await agent.post(api('/buildings')).set('Origin', WEB_ORIGIN).send({ code: 'X', name: 'Gedung X' }).expect(201);
  });
});

describe('E1 permissions are enforced on the server', () => {
  it('a teacher cannot read or create students even with a known id', async () => {
    const teacher = await loginAs(app, fx.emails.teacher);
    await teacher.get(api('/students')).expect(403);
    await teacher.get(api(`/students/${fx.studentIds[0]}`)).expect(403);
    await teacher.post(api('/students')).send({ nis: '9999', fullName: 'Coba' }).expect(403);
  });

  it('curriculum can manage academic years but not people', async () => {
    const cur = await loginAs(app, fx.emails.curriculum);
    await cur.get(api('/academic-years')).expect(200);
    await cur.post(api('/students')).send({ nis: '9999', fullName: 'Coba' }).expect(403);
  });
});

describe('E3 students', () => {
  it('validates input with field errors (422)', async () => {
    const admin = await loginAs(app, fx.emails.admin);
    const res = await admin.post(api('/students')).send({ nis: '!', fullName: 'A', nisn: '123' }).expect(422);
    expect(res.body.code).toBe('VALIDATION_FAILED');
    expect(Object.keys(res.body.fieldErrors)).toEqual(expect.arrayContaining(['nis', 'fullName', 'nisn']));
  });

  it('rejects a duplicate NIS with a field-level conflict (409)', async () => {
    const admin = await loginAs(app, fx.emails.admin);
    const res = await admin.post(api('/students')).send({ nis: '1001', fullName: 'Orang Lain' }).expect(409);
    expect(res.body.fieldErrors.nis[0]).toContain('Siswa Satu');
  });

  it('creates, lists with search and pagination, and audits', async () => {
    const admin = await loginAs(app, fx.emails.admin);
    const created = await admin.post(api('/students')).send({ nis: '1003', fullName: 'Andi Baru', gender: 'MALE', birthDate: '2013-05-01' }).expect(201);
    const list = await admin.get(api('/students?q=andi&pageSize=1')).expect(200);
    expect(list.body).toMatchObject({ total: 1, page: 1, pageSize: 1 });
    expect(list.body.items[0]).toMatchObject({ id: created.body.id, nis: '1003' });
    const detail = await admin.get(api(`/students/${created.body.id}`)).expect(200);
    expect(detail.body.person.birthDate).toBe('2013-05-01');
    expect(await prisma.auditEvent.count({ where: { action: 'student.create', entityId: created.body.id } })).toBe(1);
  });
});

describe('E3 guardian linking and portal isolation', () => {
  async function linkGuardian() {
    const admin = await loginAs(app, fx.emails.admin);
    const g = await admin.post(api('/guardians')).send({ fullName: 'Bapak Wali', email: 'bapak@tes.test' }).expect(201);
    const inv = await admin
      .post(api(`/students/${fx.studentIds[0]}/guardians`))
      .send({ guardianId: g.body.id, relationship: 'FATHER', isPrimaryContact: true })
      .expect(201);
    const token = String(inv.body.invitePath).split('/').pop()!;
    return { admin, guardianId: g.body.id as string, token };
  }

  it('a guardian sees only the verified child, never another student', async () => {
    const { token } = await linkGuardian();
    const preview = await request(app.getHttpServer()).get(api(`/invitations/${token}`)).expect(200);
    expect(preview.body).toMatchObject({ studentName: 'Siswa Satu', hasAccount: false, role: 'GUARDIAN' });

    const guardian = request.agent(app.getHttpServer());
    await guardian.post(api(`/invitations/${token}/accept`)).send({}).expect(422);
    await guardian.post(api(`/invitations/${token}/accept`)).send({ password: 'KataSandiWali123' }).expect(200);

    const children = await guardian.get(api('/guardian/children')).expect(200);
    expect(children.body.map((c: { studentId: string }) => c.studentId)).toEqual([fx.studentIds[0]]);
    await guardian.get(api(`/guardian/children/${fx.studentIds[1]}`)).expect(404);
    await guardian.get(api(`/students/${fx.studentIds[1]}`)).expect(403);
    await guardian.get(api('/students')).expect(403);

    // Tautan undangan hanya bisa dipakai sekali.
    await request(app.getHttpServer()).post(api(`/invitations/${token}/accept`)).send({ password: 'KataSandiWali123' }).expect(404);
  });

  it('a pending link grants nothing until verified', async () => {
    await linkGuardian();
    const link = await prisma.studentGuardian.findFirstOrThrow();
    expect(link.status).toBe('PENDING');
    expect(await prisma.user.count({ where: { email: 'bapak@tes.test' } })).toBe(0);
  });

  it('revoking a link removes access immediately', async () => {
    const { admin, token } = await linkGuardian();
    const guardian = request.agent(app.getHttpServer());
    await guardian.post(api(`/invitations/${token}/accept`)).send({ password: 'KataSandiWali123' }).expect(200);
    const link = await prisma.studentGuardian.findFirstOrThrow();
    await admin.post(api(`/student-guardians/${link.id}/revoke`)).expect(204);
    const res = await guardian.get(api(`/guardian/children/${fx.studentIds[0]}`));
    expect([401, 403, 404]).toContain(res.status);
  });

  it('an invitation for an existing account requires signing in as that account', async () => {
    const admin = await loginAs(app, fx.emails.admin);
    // Guru yang juga orang tua: data wali memakai person yang sama tidak didukung di R0,
    // jadi undangan akun ulang untuk pegawai yang sudah punya akun dipakai sebagai contoh.
    const teacher = await prisma.user.findUniqueOrThrow({ where: { email: fx.emails.teacher } });
    const inv = await admin.post(api(`/people/${teacher.personId}/invitations`)).send({ role: 'STAFF' }).expect(201);
    const token = String(inv.body.invitePath).split('/').pop()!;
    const res = await request(app.getHttpServer()).post(api(`/invitations/${token}/accept`)).send({ password: 'apasajaboleh1' }).expect(409);
    expect(res.body.code).toBe('LOGIN_REQUIRED');
    const signedIn = await loginAs(app, fx.emails.teacher);
    await signedIn.post(api(`/invitations/${token}/accept`)).send({}).expect(200);
    const me = await signedIn.get(api('/auth/me')).expect(200);
    expect(me.body.roles).toEqual(expect.arrayContaining(['TEACHER', 'STAFF']));
  });
});

describe('E2 academic years', () => {
  const year = (name: string, start: string, end: string) => ({
    name,
    startDate: start,
    endDate: end,
    terms: [{ name: 'Semester 1', sequence: 1, startDate: start, endDate: end }],
  });

  it('rejects overlapping terms with field errors', async () => {
    const admin = await loginAs(app, fx.emails.admin);
    const res = await admin
      .post(api('/academic-years'))
      .send({
        name: '2030/2031',
        startDate: '2030-07-01',
        endDate: '2031-06-30',
        terms: [
          { name: 'A', sequence: 1, startDate: '2030-07-01', endDate: '2030-12-31' },
          { name: 'B', sequence: 2, startDate: '2030-12-01', endDate: '2031-06-30' },
        ],
      })
      .expect(422);
    expect(JSON.stringify(res.body.fieldErrors)).toContain('tumpang tindih');
  });

  it('allows only one active year and requires closing the current one first', async () => {
    const admin = await loginAs(app, fx.emails.admin);
    const a = await admin.post(api('/academic-years')).send(year('2030/2031', '2030-07-01', '2031-06-30')).expect(201);
    const b = await admin.post(api('/academic-years')).send(year('2031/2032', '2031-07-01', '2032-06-30')).expect(201);
    await admin.post(api(`/academic-years/${a.body.id}/activate`)).expect(200);
    const blocked = await admin.post(api(`/academic-years/${b.body.id}/activate`)).expect(409);
    expect(blocked.body.message).toContain('2030/2031');
    await admin.post(api(`/academic-years/${a.body.id}/close`)).expect(200);
    await admin.post(api(`/academic-years/${b.body.id}/activate`)).expect(200);
    await admin.post(api(`/academic-years/${a.body.id}/activate`)).expect(409);
    expect(await prisma.academicYear.count({ where: { status: 'ACTIVE' } })).toBe(1);
    expect(await prisma.auditEvent.count({ where: { action: 'academic_year.activate' } })).toBe(2);
  });
});

describe('E3 student import', () => {
  const csv = ['nis;nama_lengkap;jenis_kelamin;tanggal_lahir', '2001;Rina Putri;P;2013-01-02', '2002;Budi Santoso;L;', '2003;X;Z;'].join('\n');

  it('reports per-row results and is safe to repeat', async () => {
    const admin = await loginAs(app, fx.emails.admin);
    const first = await admin.post(api('/imports/students')).send({ fileName: 'siswa.csv', content: csv }).expect(201);
    expect(first.body).toMatchObject({ totalRows: 3, createdCount: 2, skippedCount: 0, errorCount: 1, isRepeat: false });
    expect(first.body.rows[2]).toMatchObject({ rowNumber: 4, status: 'ERROR' });

    const second = await admin.post(api('/imports/students')).send({ fileName: 'siswa.csv', content: csv }).expect(201);
    expect(second.body).toMatchObject({ createdCount: 0, skippedCount: 2, errorCount: 1, isRepeat: true });
    expect(await prisma.student.count()).toBe(4);
  });

  it('flags a NIS that belongs to a different student', async () => {
    const admin = await loginAs(app, fx.emails.admin);
    const res = await admin.post(api('/imports/students')).send({ content: 'nis,nama_lengkap\n1001,Bukan Siswa Satu' }).expect(201);
    expect(res.body.rows[0]).toMatchObject({ status: 'ERROR' });
    expect(res.body.rows[0].message).toContain('Siswa Satu');
  });

  it('rejects a file with an unknown header', async () => {
    const admin = await loginAs(app, fx.emails.admin);
    const res = await admin.post(api('/imports/students')).send({ content: 'nomor,nama\n1,A' }).expect(422);
    expect(res.body.fieldErrors.content.join(' ')).toContain('nis');
  });
});

describe('E9 audit', () => {
  it('audit events cannot be updated or deleted', async () => {
    await loginAs(app, fx.emails.admin);
    const ev = await prisma.auditEvent.findFirstOrThrow({ where: { action: 'auth.login' } });
    await expect(prisma.auditEvent.update({ where: { id: ev.id }, data: { action: 'x' } })).rejects.toThrow();
    await expect(prisma.auditEvent.delete({ where: { id: ev.id } })).rejects.toThrow();
  });

  it('only permitted roles can read audit events', async () => {
    const admin = await loginAs(app, fx.emails.admin);
    const res = await admin.get(api('/audit-events?action=auth.')).expect(200);
    expect(res.body.items[0]).toMatchObject({ action: 'auth.login', actor: { email: fx.emails.admin } });
    const teacher = await loginAs(app, fx.emails.teacher);
    await teacher.get(api('/audit-events')).expect(403);
  });
});
