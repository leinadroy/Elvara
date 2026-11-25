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

describe('R2 skema nilai & capaian (E11)', () => {
  it('draf → terbit hanya bila bobot 100%, terbit tidak diubah, versi baru menggantikan', async () => {
    const a = await setupClass(app, fx, s, '7A', [2]);
    const cur = a.cur;
    const before = (await cur.get(api('/dashboard/summary')).expect(200)).body.metrics.find((m: { key: string }) => m.key === 'grade_schemes_missing');
    expect(before).toMatchObject({ value: 1, note: 'dari 1 mapel × tingkat' });

    const list0 = await cur.get(api(`/grade-schemes?termId=${s.termId}`)).expect(200);
    expect(list0.body).toEqual([expect.objectContaining({ subject: expect.objectContaining({ code: 'MTK' }), taught: true, published: null, draft: null })]);

    const base = { termId: s.termId, subjectId: s.mathId, gradeLevelId: s.gradeId };
    const v1 = await cur
      .post(api('/grade-schemes'))
      .send({ ...base, components: [{ code: 'formatif', name: 'Formatif', weight: 30 }, { code: 'STS', name: 'Sumatif tengah', weight: 30 }] })
      .expect(201);
    expect(v1.body.versionNo).toBe(1);
    await cur.post(api('/grade-schemes')).send({ ...base, components: [{ code: 'X', name: 'Lain', weight: 100 }] }).expect(409);
    await cur.post(api('/grade-schemes')).send({ ...base, components: [{ code: 'A', name: 'Aa', weight: 50 }, { code: 'A', name: 'Ab', weight: 50 }] }).expect(422);
    // Bobot 60% → terbit ditolak.
    await cur.post(api(`/grade-schemes/${v1.body.id}/publish`)).expect(409);
    await cur
      .put(api(`/grade-schemes/${v1.body.id}`))
      .send({ passingScore: 75, components: [{ code: 'FORMATIF', name: 'Formatif', weight: 30 }, { code: 'STS', name: 'Sumatif tengah', weight: 30 }, { code: 'SAS', name: 'Sumatif akhir', weight: 40 }] })
      .expect(204);
    await cur.post(api(`/grade-schemes/${v1.body.id}/publish`)).expect(204);
    await cur.put(api(`/grade-schemes/${v1.body.id}`)).send({ components: [{ code: 'X', name: 'Lain', weight: 100 }] }).expect(409);

    const list1 = await cur.get(api(`/grade-schemes?termId=${s.termId}`)).expect(200);
    expect(list1.body[0].published).toMatchObject({ versionNo: 1, passingScore: 75, weightTotal: 100 });
    expect(list1.body[0].published.components.map((c: { code: string }) => c.code)).toEqual(['FORMATIF', 'STS', 'SAS']);
    expect((await cur.get(api('/dashboard/summary')).expect(200)).body.metrics.find((m: { key: string }) => m.key === 'grade_schemes_missing').value).toBe(0);

    // Versi baru menyalin komponen; terbit menggantikan v1 (SUPERSEDED, tidak dihapus).
    const v2 = await cur.post(api(`/grade-schemes/${v1.body.id}/revise`)).expect(201);
    expect(v2.body.versionNo).toBe(2);
    await cur.put(api(`/grade-schemes/${v2.body.id}`)).send({ passingScore: 70, components: [{ code: 'FORMATIF', name: 'Formatif', weight: 40 }, { code: 'SAS', name: 'Sumatif akhir', weight: 60 }] }).expect(204);
    await cur.post(api(`/grade-schemes/${v2.body.id}/publish`)).expect(204);
    const versions = await prisma.gradeSchemeVersion.findMany({ where: base, orderBy: { versionNo: 'asc' } });
    expect(versions.map((v) => v.status)).toEqual(['SUPERSEDED', 'PUBLISHED']);
    expect(await prisma.gradeComponent.count({ where: { schemeVersionId: v1.body.id } })).toBe(3);

    const teacher = await loginAs(app, fx.emails.teacher);
    await teacher.get(api(`/grade-schemes?termId=${s.termId}`)).expect(403);
    await teacher.post(api('/grade-schemes')).send({ ...base, components: [{ code: 'X', name: 'Lain', weight: 100 }] }).expect(403);
  });

  it('capaian pembelajaran unik per mapel × tingkat', async () => {
    await setupClass(app, fx, s, '7A', [2]);
    const cur = await loginAs(app, fx.emails.curriculum);
    const body = { subjectId: s.mathId, gradeLevelId: s.gradeId, code: 'CP-1', description: 'Menyelesaikan persamaan linear satu variabel.' };
    const o = await cur.post(api('/learning-outcomes')).send(body).expect(201);
    await cur.post(api('/learning-outcomes')).send(body).expect(409);
    await cur.put(api(`/learning-outcomes/${o.body.id}`)).send({ ...body, description: 'Menyelesaikan persamaan dan pertidaksamaan linear.' }).expect(200);
    const list = await cur.get(api(`/learning-outcomes?subjectId=${s.mathId}`)).expect(200);
    expect(list.body).toEqual([expect.objectContaining({ code: 'CP-1', description: 'Menyelesaikan persamaan dan pertidaksamaan linear.' })]);
  });
});

describe('R2 penilaian & buku nilai (E13)', () => {
  /** Rombel 7A dengan skema MTK terbit: FORMATIF 30, STS 30, SAS 40, KKTP 75. */
  async function withScheme() {
    const a = await setupClass(app, fx, s, '7A', [0, 2]);
    const v = await a.cur
      .post(api('/grade-schemes'))
      .send({ termId: s.termId, subjectId: s.mathId, gradeLevelId: s.gradeId, passingScore: 75, components: [{ code: 'FORMATIF', name: 'Formatif', weight: 30 }, { code: 'STS', name: 'Sumatif tengah', weight: 30 }, { code: 'SAS', name: 'Sumatif akhir', weight: 40 }] })
      .expect(201);
    await a.cur.post(api(`/grade-schemes/${v.body.id}/publish`)).expect(204);
    return a;
  }

  it('guru mengisi dan menerbitkan nilai; nilai akhir dihitung dari penilaian terbit', async () => {
    const a = await withScheme();
    const teacher = await loginAs(app, fx.emails.teacher);
    const mine = await teacher.get(api('/me/teaching-assignments')).expect(200);
    expect(mine.body).toEqual([expect.objectContaining({ id: a.ta, hasScheme: true, assessments: 0 })]);

    const gb0 = await teacher.get(api(`/gradebook?teachingAssignmentId=${a.ta}`)).expect(200);
    expect(gb0.body).toMatchObject({ canEdit: true, assessments: [] });
    expect(gb0.body.rows).toHaveLength(2);
    const comp = Object.fromEntries(gb0.body.scheme.components.map((c: { code: string; id: string }) => [c.code, c.id]));

    const mk = async (code: string, title: string) => (await teacher.post(api('/assessments')).send({ teachingAssignmentId: a.ta, componentId: comp[code], title }).expect(201)).body.id as string;
    const f1 = await mk('FORMATIF', 'Tugas 1');
    const sts = await mk('STS', 'Sumatif tengah semester');
    const sas = await mk('SAS', 'Sumatif akhir semester');
    const [s0, s2] = [fx.studentIds[0]!, fx.studentIds[2]!];

    await teacher.put(api(`/assessments/${f1}/grades`)).send({ entries: [{ studentId: s0, state: 'SCORED', score: 101 }] }).expect(422);
    await teacher.put(api(`/assessments/${f1}/grades`)).send({ entries: [{ studentId: s0, state: 'SCORED' }] }).expect(422);
    await teacher.put(api(`/assessments/${f1}/grades`)).send({ entries: [{ studentId: fx.studentIds[1], state: 'SCORED', score: 80 }] }).expect(422);
    await teacher.put(api(`/assessments/${f1}/grades`)).send({ entries: [{ studentId: s0, state: 'SCORED', score: 80, feedback: 'Rapi' }, { studentId: s2, state: 'MISSING' }] }).expect(200);
    await teacher.put(api(`/assessments/${sts}/grades`)).send({ entries: [{ studentId: s0, state: 'SCORED', score: 70 }] }).expect(200);
    await teacher.put(api(`/assessments/${sas}/grades`)).send({ entries: [{ studentId: s0, state: 'SCORED', score: 90 }, { studentId: s2, state: 'EXCUSED' }] }).expect(200);

    // Belum terbit → nilai akhir belum dihitung.
    const gb1 = await teacher.get(api(`/gradebook?teachingAssignmentId=${a.ta}`)).expect(200);
    expect(gb1.body.rows.find((r: { studentId: string }) => r.studentId === s0).final.complete).toBe(false);

    for (const id of [f1, sts, sas]) await teacher.post(api(`/assessments/${id}/publish`)).expect(204);
    await teacher.post(api(`/assessments/${f1}/publish`)).expect(409);
    const gb2 = await teacher.get(api(`/gradebook?teachingAssignmentId=${a.ta}`)).expect(200);
    const row0 = gb2.body.rows.find((r: { studentId: string }) => r.studentId === s0);
    // 0.3*80 + 0.3*70 + 0.4*90 = 81
    expect(row0.final).toMatchObject({ complete: true, raw: 81, rounded: 81, belowPassing: false });
    expect(row0.cells[f1]).toMatchObject({ state: 'SCORED', score: 80, feedback: 'Rapi', versionNo: 1 });
    const row2 = gb2.body.rows.find((r: { studentId: string }) => r.studentId === s2);
    expect(row2.final).toMatchObject({ complete: false, rounded: null });
    expect(row2.final.components.FORMATIF).toBe(0);
    expect(row2.final.issues).toEqual(['1 nilai Sumatif tengah belum diisi.', 'Semua nilai Sumatif akhir tidak berlaku.']);
    expect(gb2.body.assessments.find((x: { id: string }) => x.id === sts).counts).toMatchObject({ SCORED: 1, PENDING: 1 });

    await teacher.delete(api(`/assessments/${sas}`)).expect(409);
  });

  it('hak akses, pemeriksaan versi, dan koreksi nilai terbit beralasan', async () => {
    const a = await withScheme();
    const teacher = await loginAs(app, fx.emails.teacher);
    const gb = await teacher.get(api(`/gradebook?teachingAssignmentId=${a.ta}`)).expect(200);
    const compId = gb.body.scheme.components[0].id;
    const s0 = fx.studentIds[0]!;

    const homeroom = await loginAs(app, s.homeroomEmail);
    await homeroom.post(api('/assessments')).send({ teachingAssignmentId: a.ta, componentId: compId, title: 'Bukan guru mapel' }).expect(403);
    expect((await homeroom.get(api(`/gradebook?teachingAssignmentId=${a.ta}`)).expect(200)).body.canEdit).toBe(false);
    const student = await loginAs(app, s.studentEmail);
    await student.get(api(`/gradebook?teachingAssignmentId=${a.ta}`)).expect(403);
    expect((await a.cur.get(api(`/gradebook?teachingAssignmentId=${a.ta}`)).expect(200)).body.canEdit).toBe(false);

    const id = (await teacher.post(api('/assessments')).send({ teachingAssignmentId: a.ta, componentId: compId, title: 'Kuis 1' }).expect(201)).body.id;
    await teacher.put(api(`/assessments/${id}/grades`)).send({ entries: [{ studentId: s0, state: 'SCORED', score: 60 }] }).expect(200);
    // Dua tab: keduanya membuka versi 1; tab pertama menyimpan, tab kedua ditolak.
    await teacher.put(api(`/assessments/${id}/grades`)).send({ entries: [{ studentId: s0, state: 'SCORED', score: 65, versionNo: 1 }] }).expect(200);
    const stale = await teacher.put(api(`/assessments/${id}/grades`)).send({ entries: [{ studentId: s0, state: 'SCORED', score: 99, versionNo: 1 }] }).expect(409);
    expect(stale.body.fieldErrors.entries).toEqual(['Siswa Satu']);

    await teacher.post(api(`/assessments/${id}/publish`)).expect(204);
    await teacher.put(api(`/assessments/${id}/grades`)).send({ entries: [{ studentId: s0, state: 'SCORED', score: 75, versionNo: 2 }] }).expect(422);
    await teacher.put(api(`/assessments/${id}/grades`)).send({ reason: 'Salah input dari lembar jawaban', entries: [{ studentId: s0, state: 'SCORED', score: 75, versionNo: 2 }] }).expect(200);
    // Hanya umpan balik yang berubah: tidak perlu alasan, tidak masuk riwayat nilai.
    await teacher.put(api(`/assessments/${id}/grades`)).send({ entries: [{ studentId: s0, state: 'SCORED', score: 75, feedback: 'Sudah diperbaiki', versionNo: 3 }] }).expect(200);
    const changes = await teacher.get(api(`/assessments/${id}/changes`)).expect(200);
    expect(changes.body).toEqual([expect.objectContaining({ student: 'Siswa Satu', oldScore: 65, newScore: 75, reason: 'Salah input dari lembar jawaban' })]);
    const admin = await loginAs(app, fx.emails.admin);
    const audit = await admin.get(api(`/audit-events?entityType=assessment&entityId=${id}`)).expect(200);
    expect(audit.body.items.map((x: { action: string }) => x.action)).toEqual(expect.arrayContaining(['assessment.create', 'grade.save', 'assessment.publish', 'grade.correct']));
  });
});
