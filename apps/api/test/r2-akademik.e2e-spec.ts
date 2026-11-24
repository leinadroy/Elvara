import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import { addDays } from '../src/common/school-time.js';
import type { PrismaClient } from '../src/generated/prisma/client.js';
import { createApp, createPrisma, loginAs, resetDb, seedFixture, type Fixture } from './helpers.js';
import { api, seedSchool, setupClass, today, type School } from './school-fixture.js';

// Alur R2 memanggil banyak endpoint; PGlite (satu koneksi) lambat bila seluruh suite berjalan.
vi.setConfig({ testTimeout: 120_000 });

let app: INestApplication<App>;
let prisma: PrismaClient;
let fx: Fixture;
let s: School;

beforeAll(async () => {
  prisma = createPrisma();
  app = await createApp();
});
beforeEach(async () => {
  await resetDb(prisma);
  fx = await seedFixture(prisma);
  s = await seedSchool(prisma, fx);
});
afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

describe('R2 kalender akademik (E10)', () => {
  it('draf tidak tampil, terbit tampil sesuai audiens, irisan ujian/libur ditandai', async () => {
    const a = await setupClass(app, fx, s, '7A', [2]);
    const t = today();
    const cur = a.cur;

    const exam = await cur.post(api('/calendar')).send({ title: 'Sumatif akhir semester', category: 'EXAM', startsOn: addDays(t, 10), endsOn: addDays(t, 14), audience: 'ALL' }).expect(201);
    expect(exam.body.clashes).toEqual([]);
    const trip = await cur
      .post(api('/calendar'))
      .send({ title: 'Kunjungan museum kelas 7', category: 'ACTIVITY', startsOn: addDays(t, 12), endsOn: addDays(t, 12), audience: 'GRADE_LEVEL', gradeLevelId: s.gradeId })
      .expect(201);
    expect(trip.body.clashes.map((c: { title: string }) => c.title)).toEqual(['Sumatif akhir semester']);
    const staffOnly = await cur.post(api('/calendar')).send({ title: 'Rapat guru', category: 'DEADLINE', startsOn: addDays(t, 3), endsOn: addDays(t, 3), audience: 'STAFF' }).expect(201);
    await cur.post(api('/calendar')).send({ title: 'Tanpa tingkat', category: 'ACTIVITY', startsOn: t, endsOn: t, audience: 'GRADE_LEVEL' }).expect(422);
    await cur.post(api('/calendar')).send({ title: 'Terbalik', category: 'ACTIVITY', startsOn: addDays(t, 2), endsOn: t }).expect(422);

    const range = `from=${t}&to=${addDays(t, 30)}`;
    const student = await loginAs(app, s.studentEmail);
    expect((await student.get(api(`/calendar?${range}`)).expect(200)).body).toHaveLength(0);

    for (const id of [exam.body.id, trip.body.id, staffOnly.body.id]) await cur.post(api(`/calendar/${id}/publish`)).expect(204);
    await cur.post(api(`/calendar/${exam.body.id}/publish`)).expect(409);

    const seen = (await student.get(api(`/calendar?${range}`)).expect(200)).body.map((e: { title: string }) => e.title);
    expect(seen).toEqual(['Sumatif akhir semester', 'Kunjungan museum kelas 7']);
    // Siswa lain tanpa rombel tingkat 7 tidak melihat agenda tingkat.
    const other = await loginAs(app, s.otherStudentEmail);
    expect((await other.get(api(`/calendar?${range}`)).expect(200)).body.map((e: { title: string }) => e.title)).toEqual(['Sumatif akhir semester']);
    const guardian = await loginAs(app, s.guardianEmail);
    expect((await guardian.get(api(`/calendar?${range}`)).expect(200)).body).toHaveLength(2);
    const teacher = await loginAs(app, fx.emails.teacher);
    expect((await teacher.get(api(`/calendar?${range}`)).expect(200)).body).toHaveLength(3);
    await teacher.post(api('/calendar')).send({ title: 'Tidak boleh', category: 'ACTIVITY', startsOn: t, endsOn: t }).expect(403);

    // Batal: hilang dari portal, tetap ada untuk pengelola; perubahan agenda terbit tercatat di audit.
    await cur.put(api(`/calendar/${exam.body.id}`)).send({ title: 'Sumatif akhir semester (diundur)', category: 'EXAM', startsOn: addDays(t, 11), endsOn: addDays(t, 15), audience: 'ALL' }).expect(200);
    await cur.post(api(`/calendar/${trip.body.id}/cancel`)).send({ reason: 'Museum tutup untuk renovasi' }).expect(204);
    expect((await student.get(api(`/calendar?${range}`)).expect(200)).body.map((e: { title: string }) => e.title)).toEqual(['Sumatif akhir semester (diundur)']);
    const manage = await cur.get(api(`/calendar/manage?${range}`)).expect(200);
    expect(manage.body.find((e: { id: string }) => e.id === trip.body.id).status).toBe('CANCELLED');
    const admin = await loginAs(app, fx.emails.admin);
    const audit = await admin.get(api(`/audit-events?entityType=academic_calendar_event&entityId=${exam.body.id}`)).expect(200);
    expect(audit.body.items.map((x: { action: string }) => x.action)).toEqual(expect.arrayContaining(['calendar.create', 'calendar.publish', 'calendar.update']));
  });
});
