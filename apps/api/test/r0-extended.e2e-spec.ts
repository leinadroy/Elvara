import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import type { PrismaClient } from '../src/generated/prisma/client.js';
import { totp } from '../src/auth/totp.js';
import { createApp, createPrisma, loginAs, PASSWORD, resetDb, seedFixture, type Fixture } from './helpers.js';

let app: INestApplication<App>;
let prisma: PrismaClient;
let fx: Fixture;
const api = (path: string) => `/api/v1${path}`;

const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);

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

async function personIdOf(email: string) {
  return (await prisma.user.findUniqueOrThrow({ where: { email } })).personId!;
}

describe('FR-3.7 private documents', () => {
  it('admin uploads, owner and admin download, others cannot, and every download is audited', async () => {
    const admin = await loginAs(app, fx.emails.admin);
    const teacherPerson = await personIdOf(fx.emails.teacher);
    const up = await admin
      .post(api(`/people/${teacherPerson}/documents`))
      .field('category', 'IDENTITY')
      .field('title', 'KTP')
      .attach('file', PDF, { filename: '../../ktp guru.pdf', contentType: 'application/pdf' })
      .expect(201);

    const list = await admin.get(api(`/people/${teacherPerson}/documents`)).expect(200);
    expect(list.body[0]).toMatchObject({ id: up.body.id, mimeType: 'application/pdf', originalName: 'ktp guru.pdf' });

    const dl = await admin.get(api(`/documents/${up.body.id}/content`)).expect(200);
    expect(dl.headers['cache-control']).toContain('no-store');
    expect(dl.headers['content-disposition']).toContain('attachment');
    expect(Buffer.from(dl.body as Buffer).equals(PDF)).toBe(true);

    const teacher = await loginAs(app, fx.emails.teacher);
    await teacher.get(api('/me/documents')).expect(200);
    await teacher.get(api(`/documents/${up.body.id}/content`)).expect(200);

    const curriculum = await loginAs(app, fx.emails.curriculum);
    await curriculum.get(api(`/documents/${up.body.id}/content`)).expect(404);
    await curriculum.get(api(`/people/${teacherPerson}/documents`)).expect(404);
    await curriculum.post(api(`/people/${teacherPerson}/documents`)).field('category', 'OTHER').field('title', 'X').attach('file', PDF, 'x.pdf').expect(403);

    expect(await prisma.auditEvent.count({ where: { action: 'document.download' } })).toBe(2);
  });

  it('rejects files whose content is not PDF/JPG/PNG, regardless of the name', async () => {
    const admin = await loginAs(app, fx.emails.admin);
    const pid = await personIdOf(fx.emails.teacher);
    const res = await admin
      .post(api(`/people/${pid}/documents`))
      .field('category', 'OTHER')
      .field('title', 'Skrip')
      .attach('file', Buffer.from('<script>alert(1)</script>'), { filename: 'foto.png', contentType: 'image/png' })
      .expect(422);
    expect(res.body.fieldErrors.file).toBeDefined();
    await admin.post(api(`/people/${pid}/documents`)).field('category', 'PHOTO').field('title', 'Foto').attach('file', PNG, 'f.png').expect(201);
  });

  it('deleted documents disappear and their content is no longer served', async () => {
    const admin = await loginAs(app, fx.emails.admin);
    const pid = await personIdOf(fx.emails.teacher);
    const up = await admin.post(api(`/people/${pid}/documents`)).field('category', 'OTHER').field('title', 'Surat').attach('file', PDF, 's.pdf').expect(201);
    await admin.delete(api(`/documents/${up.body.id}`)).expect(204);
    await admin.get(api(`/documents/${up.body.id}/content`)).expect(404);
    expect((await admin.get(api(`/people/${pid}/documents`))).body).toHaveLength(0);
  });
});

describe('FR-3.6 profile corrections', () => {
  it('official data changes only after approval', async () => {
    const teacher = await loginAs(app, fx.emails.teacher);
    const created = await teacher.post(api('/me/corrections')).send({ changes: { fullName: 'Pegawai Teacher Baru', phone: '0812' }, reason: 'Nama di KTP berbeda' }).expect(201);
    expect(created.body.changes.fullName).toEqual({ from: 'Pegawai teacher', to: 'Pegawai Teacher Baru' });
    await teacher.post(api('/me/corrections')).send({ changes: { phone: '0813' }, reason: 'Nomor baru' }).expect(409);

    const pid = await personIdOf(fx.emails.teacher);
    expect((await prisma.person.findUniqueOrThrow({ where: { id: pid } })).fullName).toBe('Pegawai teacher');

    const admin = await loginAs(app, fx.emails.admin);
    const queue = await admin.get(api('/corrections?status=PENDING')).expect(200);
    expect(queue.body).toHaveLength(1);
    await admin.post(api(`/corrections/${created.body.id}/approve`)).send({}).expect(204);
    expect(await prisma.person.findUniqueOrThrow({ where: { id: pid } })).toMatchObject({ fullName: 'Pegawai Teacher Baru', phone: '0812' });
    await admin.post(api(`/corrections/${created.body.id}/approve`)).send({}).expect(409);
  });

  it('refuses to approve when the data changed after the request', async () => {
    const teacher = await loginAs(app, fx.emails.teacher);
    const created = await teacher.post(api('/me/corrections')).send({ changes: { phone: '0812' }, reason: 'Nomor baru' }).expect(201);
    await prisma.person.update({ where: { id: await personIdOf(fx.emails.teacher) }, data: { phone: '0899' } });
    const admin = await loginAs(app, fx.emails.admin);
    await admin.post(api(`/corrections/${created.body.id}/approve`)).send({}).expect(409);
    await admin.post(api(`/corrections/${created.body.id}/reject`)).send({}).expect(422);
    await admin.post(api(`/corrections/${created.body.id}/reject`)).send({ note: 'Nomor sudah diperbarui TU' }).expect(204);
  });

  it('only reviewers can see the queue', async () => {
    const teacher = await loginAs(app, fx.emails.teacher);
    await teacher.get(api('/corrections')).expect(403);
  });
});

describe('FR-1.6 MFA and password', () => {
  async function enableMfa(email: string) {
    const agent = await loginAs(app, email);
    const setup = await agent.post(api('/auth/mfa/setup')).expect(200);
    expect(setup.body.otpauthUrl).toMatch(/^otpauth:\/\/totp\//);
    await agent.post(api('/auth/mfa/enable')).send({ code: '000000' }).expect(422);
    await agent.post(api('/auth/mfa/enable')).send({ code: totp(setup.body.secret) }).expect(204);
    return { agent, secret: setup.body.secret as string };
  }

  it('requires a TOTP code after the password once enabled, and stores the secret encrypted', async () => {
    const { secret } = await enableMfa(fx.emails.admin);
    const stored = await prisma.user.findUniqueOrThrow({ where: { email: fx.emails.admin } });
    expect(stored.mfaSecret).not.toContain(secret);

    const server = app.getHttpServer();
    const step1 = await request(server).post(api('/auth/login')).send({ email: fx.emails.admin, password: PASSWORD }).expect(200);
    expect(step1.body).toEqual({ mfaRequired: true, challenge: expect.any(String) });
    expect(step1.headers['set-cookie']).toBeUndefined();

    await request(server).post(api('/auth/mfa/verify')).send({ challenge: step1.body.challenge, code: '123456' }).expect(401);
    const ok = await request(server).post(api('/auth/mfa/verify')).send({ challenge: step1.body.challenge, code: totp(secret) }).expect(200);
    expect(ok.body).toMatchObject({ mfaRequired: false, activeRole: 'ADMIN' });
    expect(String(ok.headers['set-cookie'])).toContain('ss_session=');
    // Tantangan hanya sekali pakai.
    await request(server).post(api('/auth/mfa/verify')).send({ challenge: step1.body.challenge, code: totp(secret) }).expect(401);
  });

  it('an admin can reset another user MFA, which ends that user sessions', async () => {
    const { agent: teacher } = await enableMfa(fx.emails.teacher);
    const admin = await loginAs(app, fx.emails.admin);
    const teacherUser = await prisma.user.findUniqueOrThrow({ where: { email: fx.emails.teacher } });
    await admin.post(api(`/accounts/${teacherUser.id}/mfa/reset`)).expect(204);
    await teacher.get(api('/auth/me')).expect(401);
    await loginAs(app, fx.emails.teacher);
  });

  it('changing the password needs the current one and ends other sessions', async () => {
    const a = await loginAs(app, fx.emails.teacher);
    const b = await loginAs(app, fx.emails.teacher);
    await a.post(api('/auth/password')).send({ currentPassword: 'salah', newPassword: 'KataSandiBaru-123' }).expect(422);
    await a.post(api('/auth/password')).send({ currentPassword: PASSWORD, newPassword: 'KataSandiBaru-123' }).expect(204);
    await a.get(api('/auth/me')).expect(200);
    await b.get(api('/auth/me')).expect(401);
    await request(app.getHttpServer()).post(api('/auth/login')).send({ email: fx.emails.teacher, password: 'KataSandiBaru-123' }).expect(200);
  });
});

describe('global search', () => {
  it('returns only what the active role may see', async () => {
    const admin = await loginAs(app, fx.emails.admin);
    const res = await admin.get(api('/search?q=siswa')).expect(200);
    expect(res.body.hits.map((h: { kind: string }) => h.kind)).toEqual(['student', 'student']);
    const teacher = await loginAs(app, fx.emails.teacher);
    expect((await teacher.get(api('/search?q=siswa')).expect(200)).body.hits).toEqual([]);
    await admin.get(api('/search?q=a')).expect(422);
  });
});
