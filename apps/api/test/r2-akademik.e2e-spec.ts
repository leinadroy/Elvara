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

describe('R2 penilaian draf (E13 tahap awal)', () => {
  it('menangani kegiatan dan kiriman privat berversi tanpa duplikasi', async () => {
    const a = await setupClass(app, fx, s, '7A', [2]);
    const scheme = await a.cur.post(api('/grade-schemes')).send({
      termId: s.termId, subjectId: s.mathId, gradeLevelId: s.gradeId,
      components: [{ code: 'TUGAS', name: 'Tugas', weight: 100 }],
    }).expect(201);
    await a.cur.post(api(`/grade-schemes/${scheme.body.id}/publish`)).expect(204);
    const componentId = (await prisma.gradeComponent.findFirstOrThrow({ where: { schemeVersionId: scheme.body.id } })).id;
    const teacher = await loginAs(app, fx.emails.teacher);
    const student = await loginAs(app, s.studentEmail);
    const other = await loginAs(app, s.otherStudentEmail);
    const guardian = await loginAs(app, s.guardianEmail);
    const { body: activity } = await teacher.post(api('/activities')).send({
      teachingAssignmentId: a.ta, componentId, kind: 'ASSIGNMENT', title: 'Latihan aljabar', instructions: 'Kerjakan soal.',
      opensAt: new Date(Date.now() - 60_000).toISOString(), dueAt: new Date(Date.now() + 600_000).toISOString(),
    }).expect(201);
    const path = api(`/activities/${activity.id}/submissions`);
    const input = { text: 'Jawaban', idempotencyKey: crypto.randomUUID() };
    expect((await student.get(api('/activities/portal')).expect(200)).body).toEqual([]);
    await teacher.post(api(`/activities/${activity.id}/status`)).send({ status: 'PUBLISHED' }).expect(204);
    expect((await guardian.get(api('/notifications')).expect(200)).body.items).toEqual([
      expect.objectContaining({ eventType: 'activity.published', link: `/guardian/activities?studentId=${fx.studentIds[2]}` }),
    ]);
    expect((await other.get(api('/notifications')).expect(200)).body.items).toEqual([]);
    await other.post(path).send(input).expect(404);
    await guardian.post(path).send(input).expect(403);
    expect((await student.post(path).send(input).expect(200)).body.versionNo).toBe(1);
    expect((await student.post(path).send(input).expect(200)).body.versionNo).toBe(1);
    await student.post(path).field('idempotencyKey', crypto.randomUUID()).attach('file', Buffer.from('not a PDF'), 'invalid.pdf').expect(422);
    const attachment = Buffer.from('%PDF-1.4\n%%EOF\n');
    expect((await student.post(path).field('idempotencyKey', crypto.randomUUID()).attach('file', attachment, 'jawaban.pdf').expect(200)).body.versionNo).toBe(2);
    const review = await teacher.get(path).expect(200);
    const filePath = `${path}/${review.body.submissions[0].versions[0].id}/file`;
    await teacher.get(filePath).expect('Content-Type', /application\/pdf/).expect(200);
    await guardian.get(filePath).expect(403);
    const portal = await guardian.get(api('/activities/portal')).expect(200);
    expect(portal.body[0]).toMatchObject({ canSubmit: false, submissions: [{ latestVersionNo: 2 }] });
    await teacher.post(api(`/activities/${activity.id}/status`)).send({ status: 'CLOSED' }).expect(204);
    await student.post(path).send({ ...input, idempotencyKey: crypto.randomUUID() }).expect(409);
  });
  it('koreksi nilai terbit wajib beralasan, berversi, dan tercatat', async () => {
    const a = await setupClass(app, fx, s, '7A', [2]);
    const scheme = await a.cur.post(api('/grade-schemes')).send({ termId: s.termId, subjectId: s.mathId, gradeLevelId: s.gradeId, components: [{ code: 'FORMATIF', name: 'Formatif', weight: 100 }] }).expect(201);
    await a.cur.post(api(`/grade-schemes/${scheme.body.id}/publish`)).expect(204);
    const componentId = (await prisma.gradeComponent.findFirstOrThrow({ where: { schemeVersionId: scheme.body.id } })).id;
    const teacher = await loginAs(app, fx.emails.teacher);
    const student = await loginAs(app, s.studentEmail);
    const id = (await teacher.post(api('/assessments')).send({ teachingAssignmentId: a.ta, componentId, title: 'Koreksi ulangan' }).expect(201)).body.id as string;
    const gradePath = api(`/assessments/${id}/grades/${fx.studentIds[2]}`);
    const correctionPath = `${gradePath}/correction`;
    await teacher.put(gradePath).send({ state: 'SCORED', score: 70, feedback: null, versionNo: 0 }).expect(200);
    const input = { state: 'SCORED', score: 85, feedback: 'Perbaikan jawaban', versionNo: 1, reason: 'Jawaban nomor tiga sebelumnya belum dihitung.' };
    await teacher.put(correctionPath).send(input).expect(409);
    await teacher.post(api(`/assessments/${id}/publish`)).expect(204);
    await teacher.put(correctionPath).send({ ...input, reason: '' }).expect(422);
    await student.put(correctionPath).send(input).expect(403);
    const otherTeacher = await loginAs(app, s.homeroomEmail);
    await otherTeacher.put(correctionPath).send(input).expect(404);
    const corrected = await teacher.put(correctionPath).send(input).expect(200);
    expect(corrected.body).toMatchObject({ score: 85, versionNo: 2, feedback: 'Perbaikan jawaban' });
    await teacher.put(correctionPath).send(input).expect(409);
    const history = await teacher.get(`${gradePath}/changes`).expect(200);
    expect(history.body).toEqual([expect.objectContaining({ oldState: 'SCORED', oldScore: 70, newState: 'SCORED', newScore: 85, reason: input.reason })]);
    await otherTeacher.get(`${gradePath}/changes`).expect(404);
    expect((await student.get(api('/me/grades')).expect(200)).body.items[0]).toMatchObject({ score: 85, feedback: 'Perbaikan jawaban' });
    expect(await prisma.auditEvent.count({ where: { action: 'grade_entry.correct_published' } })).toBe(1);
  });
  it('portal hanya menampilkan nilai terbit untuk siswa sendiri dan wali berizin', async () => {
    const a = await setupClass(app, fx, s, '7A', [2, 3]);
    const scheme = await a.cur.post(api('/grade-schemes')).send({ termId: s.termId, subjectId: s.mathId, gradeLevelId: s.gradeId, components: [{ code: 'FORMATIF', name: 'Formatif', weight: 100 }] }).expect(201);
    await a.cur.post(api(`/grade-schemes/${scheme.body.id}/publish`)).expect(204);
    const componentId = (await prisma.gradeComponent.findFirstOrThrow({ where: { schemeVersionId: scheme.body.id } })).id;
    const teacher = await loginAs(app, fx.emails.teacher);
    const student = await loginAs(app, s.studentEmail);
    const other = await loginAs(app, s.otherStudentEmail);
    const guardian = await loginAs(app, s.guardianEmail);
    const studentId = fx.studentIds[2]!;
    const otherId = fx.studentIds[3]!;
    const id = (await teacher.post(api('/assessments')).send({ teachingAssignmentId: a.ta, componentId, title: 'Ulangan portal' }).expect(201)).body.id as string;
    await teacher.put(api(`/assessments/${id}/grades/${studentId}`)).send({ state: 'SCORED', score: 0, feedback: 'Perlu latihan', versionNo: 0 }).expect(200);
    await teacher.put(api(`/assessments/${id}/grades/${otherId}`)).send({ state: 'EXCUSED', score: null, feedback: null, versionNo: 0 }).expect(200);
    expect((await student.get(api('/me/grades')).expect(200)).body.items).toEqual([]);
    expect((await guardian.get(api('/notifications')).expect(200)).body.items).toEqual([]);
    const aggregatesPath = api(`/assessments/aggregates?teachingAssignmentId=${a.ta}`);
    expect((await teacher.get(aggregatesPath).expect(200)).body).toEqual([]);
    await student.get(aggregatesPath).expect(403);
    await student.get(api(`/me/grades?studentId=${otherId}`)).expect(403);
    await guardian.get(api(`/me/grades?studentId=${otherId}`)).expect(403);
    await teacher.post(api(`/assessments/${id}/publish`)).expect(204);
    const aggregate = await teacher.get(aggregatesPath).expect(200);
    const academicRecap = api(`/grade-recap?teachingAssignmentId=${a.ta}`);
    await teacher.get(academicRecap).expect(403);
    expect((await a.cur.get(academicRecap).expect(200)).body).toEqual(aggregate.body);
    expect((await a.cur.get(api('/grade-recap/options')).expect(200)).body).toContainEqual(expect.objectContaining({ id: a.ta }));
    await teacher.post(api(`/assessments/${id}/publish`)).expect(409);
    expect((await student.get(api('/notifications')).expect(200)).body.items).toEqual([
      expect.objectContaining({ eventType: 'assessment.published', link: '/student/grades' }),
    ]);
    expect((await guardian.get(api('/notifications')).expect(200)).body.items).toEqual([
      expect.objectContaining({ eventType: 'assessment.published', link: `/guardian/grades?studentId=${studentId}` }),
    ]);
    expect((await teacher.get(api('/notifications')).expect(200)).body.items).toEqual([]);
    expect(aggregate.body).toEqual([expect.objectContaining({
      students: expect.arrayContaining([
        expect.objectContaining({ studentId, finalScore: 0, status: 'COMPLETE' }),
        expect.objectContaining({ studentId: otherId, finalScore: null, status: 'EXCUSED' }),
      ]),
    })]);
    const personalGrades = (await student.get(api('/me/grades')).expect(200)).body;
    await student.get(api('/report-cards/teacher-dashboard')).expect(403);
    expect((await teacher.get(api('/report-cards/teacher-dashboard')).expect(200)).body).toMatchObject({ drafts: 0, missingDescriptions: 2 });
    const curriculumDashboard = api('/report-cards/curriculum-dashboard');
    await teacher.get(curriculumDashboard).expect(403);
    expect((await a.cur.get(curriculumDashboard).expect(200)).body).toMatchObject({
      missingSchemes: 0, groups: [expect.objectContaining({ id: a.cls, total: 2, counts: expect.objectContaining({ NOT_STARTED: 2 }) })],
    });
    expect(personalGrades.items).toEqual([expect.objectContaining({ assessmentId: id, score: 0, state: 'SCORED', feedback: 'Perlu latihan' })]);
    expect(personalGrades.summaries).toEqual([expect.objectContaining({ subject: 'Matematika', classCode: '7A', finalScore: 0, status: 'COMPLETE' })]);
    const homeroom = await loginAs(app, s.homeroomEmail);
    expect((await homeroom.get(api('/report-cards/homeroom-options')).expect(200)).body).toContainEqual(
      expect.objectContaining({ classGroupId: a.cls, termId: s.termId }),
    );
    expect((await teacher.get(api('/report-cards/homeroom-options')).expect(200)).body).toEqual([]);
    const preview = api(`/report-cards/preview?classGroupId=${a.cls}&termId=${s.termId}`);
    await teacher.get(preview).expect(404);
    const before = await homeroom.get(preview).expect(200);
    const submission = { classGroupId: a.cls, termId: s.termId, studentId, homeroomNote: 'Terus berlatih.' };
    await homeroom.post(api('/report-cards/submit')).send(submission).expect(409);
    expect(before.body.students).toContainEqual(expect.objectContaining({
      studentId, ready: false, subjects: [expect.objectContaining({ score: 0, issues: ['DESCRIPTION_MISSING'] })],
    }));
    const description = { teachingAssignmentId: a.ta, studentId, highestAchievement: 'Memahami dasar aljabar.', needsImprovement: 'Latih persamaan linear.' };
    await homeroom.put(api('/report-cards/subject-description')).send(description).expect(404);
    await teacher.put(api('/report-cards/subject-description')).send(description).expect(200);
    const descriptionsPath = api(`/report-cards/subject-descriptions?teachingAssignmentId=${a.ta}`);
    await homeroom.get(descriptionsPath).expect(404);
    expect((await teacher.get(descriptionsPath).expect(200)).body).toContainEqual(expect.objectContaining({
      studentId, editable: true, description: { highestAchievement: description.highestAchievement, needsImprovement: description.needsImprovement },
    }));
    const after = await homeroom.get(preview).expect(200);
    expect(after.body.students).toContainEqual(expect.objectContaining({ studentId, ready: true }));
    const report = after.body.students.find((row: { studentId: string }) => row.studentId === studentId);
    await teacher.post(api('/report-cards/submit')).send(submission).expect(404);
    await homeroom.post(api('/report-cards/submit')).send(submission).expect(204);
    expect((await teacher.get(descriptionsPath).expect(200)).body).toContainEqual(expect.objectContaining({ studentId, editable: false }));
    await teacher.put(api('/report-cards/subject-description')).send(description).expect(409);
    await homeroom.get(api('/report-cards/review-queue')).expect(403);
    const admin = await loginAs(app, fx.emails.admin);
    expect((await admin.get(api('/report-cards/review-queue')).expect(200)).body).toContainEqual(expect.objectContaining({ id: report.reportId }));
    await admin.post(api(`/report-cards/${report.reportId}/return`)).send({ reason: 'Tinjau catatan wali kelas.' }).expect(204);
    const returned = await homeroom.get(preview).expect(200);
    expect(returned.body.students).toContainEqual(expect.objectContaining({ studentId, status: 'RETURNED', returnNote: 'Tinjau catatan wali kelas.' }));
    await homeroom.post(api('/report-cards/submit')).send(submission).expect(204);
    const approve = api(`/report-cards/${report.reportId}/approve`);
    await homeroom.post(approve).expect(403);
    await admin.get(api(`/report-cards/${report.reportId}/review`)).expect(200);
    await admin.post(approve).expect(204);
    await admin.post(approve).expect(409);
    const versions = await student.get(api('/report-cards/portal')).expect(200);
    expect(versions.body).toHaveLength(1);
    const file = api(`/report-cards/portal/${versions.body[0].id}/file`);
    const original = await student.get(file).expect('Content-Type', /application\/pdf/).expect(200);
    expect(Buffer.from(original.body).subarray(0, 5).toString()).toBe('%PDF-');
    await other.get(file).expect(404);
    await guardian.get(`${file}?studentId=${studentId}`).expect(200);
    await teacher.put(api(`/assessments/${id}/grades/${studentId}/correction`)).send({
      state: 'SCORED', score: 79, feedback: null, reason: 'Koreksi setelah rapor terbit.', versionNo: 1,
    }).expect(200);
    const downloaded = await student.get(file).expect(200);
    expect(downloaded.body).toEqual(original.body);
    const reopen = api(`/report-cards/${report.reportId}/reopen`);
    const reason = 'Perbaikan nilai setelah pemeriksaan.';
    await homeroom.post(reopen).send({ reason }).expect(403);
    await admin.post(reopen).send({ reason }).expect(204);
    await student.get(file).expect(200);
    await homeroom.post(api('/report-cards/submit')).send(submission).expect(204);
    await admin.post(approve).expect(409);
    await admin.post(approve).send({ revisionReason: reason }).expect(204);
    const revised = await student.get(api('/report-cards/portal')).expect(200);
    expect(revised.body.map((version: { versionNo: number }) => version.versionNo)).toEqual([2, 1]);
    expect((await student.get(file).expect(200)).body).toEqual(original.body);
    expect((await prisma.reportCardVersion.findUniqueOrThrow({ where: { id: revised.body[0].id } })).revisionReason).toBe(reason);
    expect((await guardian.get(api('/notifications')).expect(200)).body.items.filter((item: { eventType: string }) => item.eventType === 'report_card.published')).toEqual([
      expect.objectContaining({ link: `/guardian/reports?studentId=${studentId}` }),
      expect.objectContaining({ link: `/guardian/reports?studentId=${studentId}` }),
    ]);
    expect((await other.get(api('/me/grades')).expect(200)).body.items).toEqual([expect.objectContaining({ state: 'EXCUSED', score: null })]);
    expect((await guardian.get(api(`/me/grades?studentId=${studentId}`)).expect(200)).body.items).toHaveLength(1);
    await prisma.studentGuardian.updateMany({ where: { studentId }, data: { canViewAcademic: false } });
    await guardian.get(api(`/me/grades?studentId=${studentId}`)).expect(403);
  });
  it('hanya guru penugasan membuat dan melihat penilaian dari komponen skema terbit', async () => {
    const a = await setupClass(app, fx, s, '7A', [2]);
    const teacher = await loginAs(app, fx.emails.teacher);
    const noScheme = { teachingAssignmentId: a.ta, componentId: crypto.randomUUID(), title: 'Ulangan harian 1', assessedOn: today() };
    await teacher.post(api('/assessments')).send(noScheme).expect(409);

    const scheme = await a.cur.post(api('/grade-schemes')).send({
      termId: s.termId,
      subjectId: s.mathId,
      gradeLevelId: s.gradeId,
      components: [{ code: 'FORMATIF', name: 'Formatif', weight: 100 }],
    }).expect(201);
    await a.cur.post(api(`/grade-schemes/${scheme.body.id}/publish`)).expect(204);
    const componentId = (await prisma.gradeComponent.findFirstOrThrow({ where: { schemeVersionId: scheme.body.id } })).id;
    const options = await teacher.get(api('/assessments/options')).expect(200);
    expect(options.body).toEqual([expect.objectContaining({ teachingAssignmentId: a.ta, classCode: '7A', subjectName: 'Matematika', components: [expect.objectContaining({ id: componentId })] })]);

    await teacher.post(api('/assessments')).send({ ...noScheme, componentId: crypto.randomUUID() }).expect(422);
    await teacher.post(api('/assessments')).send({ ...noScheme, componentId, assessedOn: addDays(today(), 200) }).expect(422);
    const created = await teacher.post(api('/assessments')).send({ ...noScheme, componentId }).expect(201);
    expect(created.body).toMatchObject({ title: 'Ulangan harian 1', status: 'DRAFT', teachingAssignmentId: a.ta, component: { id: componentId, code: 'FORMATIF', schemeVersionNo: 1 } });

    const list = await teacher.get(api(`/assessments?teachingAssignmentId=${a.ta}`)).expect(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].id).toBe(created.body.id);
    const otherTeacher = await loginAs(app, s.homeroomEmail);
    expect((await otherTeacher.get(api('/assessments/options')).expect(200)).body).toEqual([]);
    await otherTeacher.get(api(`/assessments?teachingAssignmentId=${a.ta}`)).expect(404);
    await otherTeacher.post(api('/assessments')).send({ ...noScheme, componentId }).expect(404);
    const student = await loginAs(app, s.studentEmail);
    await student.get(api(`/assessments?teachingAssignmentId=${a.ta}`)).expect(403);
    await student.post(api('/assessments')).send({ ...noScheme, componentId }).expect(403);
    expect(await prisma.auditEvent.count({ where: { action: 'assessment.create', entityId: created.body.id } })).toBe(1);
  });

  it('lembar nilai membedakan empat keadaan dan menolak versi lama atau siswa di luar rombel', async () => {
    const a = await setupClass(app, fx, s, '7A', [0, 2]);
    const scheme = await a.cur.post(api('/grade-schemes')).send({
      termId: s.termId, subjectId: s.mathId, gradeLevelId: s.gradeId,
      components: [{ code: 'FORMATIF', name: 'Formatif', weight: 100 }],
    }).expect(201);
    await a.cur.post(api(`/grade-schemes/${scheme.body.id}/publish`)).expect(204);
    const componentId = (await prisma.gradeComponent.findFirstOrThrow({ where: { schemeVersionId: scheme.body.id } })).id;
    const teacher = await loginAs(app, fx.emails.teacher);
    const assessmentId = (await teacher.post(api('/assessments')).send({ teachingAssignmentId: a.ta, componentId, title: 'Latihan persamaan', assessedOn: today() }).expect(201)).body.id as string;
    const sheetPath = api(`/assessments/${assessmentId}/grades`);
    const initial = await teacher.get(sheetPath).expect(200);
    expect(initial.body.students).toHaveLength(2);
    expect(initial.body.students.every((r: { state: string; score: number | null; versionNo: number }) => r.state === 'PENDING' && r.score === null && r.versionNo === 0)).toBe(true);
    const studentId = fx.studentIds[0]!;
    const rowPath = api(`/assessments/${assessmentId}/grades/${studentId}`);
    await teacher.put(rowPath).send({ state: 'SCORED', score: -1, feedback: null, versionNo: 0 }).expect(422);
    await teacher.put(rowPath).send({ state: 'SCORED', score: 90.55, feedback: null, versionNo: 0 }).expect(422);
    await teacher.put(rowPath).send({ state: 'PENDING', score: 0, feedback: null, versionNo: 0 }).expect(422);
    const scored = await teacher.put(rowPath).send({ state: 'SCORED', score: 0, feedback: 'Perlu latihan', versionNo: 0 }).expect(200);
    expect(scored.body).toMatchObject({ state: 'SCORED', score: 0, versionNo: 1 });
    await teacher.put(rowPath).send({ state: 'SCORED', score: 80, feedback: null, versionNo: 0 }).expect(409);
    const missing = await teacher.put(rowPath).send({ state: 'MISSING', score: null, feedback: null, versionNo: 1 }).expect(200);
    expect(missing.body).toMatchObject({ state: 'MISSING', score: null, versionNo: 2 });
    const excused = await teacher.put(rowPath).send({ state: 'EXCUSED', score: null, feedback: 'Dispensasi', versionNo: 2 }).expect(200);
    expect(excused.body).toMatchObject({ state: 'EXCUSED', score: null, versionNo: 3 });
    const pending = await teacher.put(rowPath).send({ state: 'PENDING', score: null, feedback: null, versionNo: 3 }).expect(200);
    expect(pending.body).toMatchObject({ state: 'PENDING', score: null, versionNo: 4 });
    await teacher.put(api(`/assessments/${assessmentId}/grades/${fx.studentIds[1]}`)).send({ state: 'SCORED', score: 80, feedback: null, versionNo: 0 }).expect(404);
    const other = await loginAs(app, s.homeroomEmail);
    await other.get(sheetPath).expect(404);
    await other.put(rowPath).send({ state: 'SCORED', score: 80, feedback: null, versionNo: 4 }).expect(404);
    const student = await loginAs(app, s.studentEmail);
    await student.get(sheetPath).expect(403);
    expect(await prisma.auditEvent.count({ where: { action: 'grade_entry.save_draft', entityType: 'grade_entry' } })).toBe(4);
    const first = { studentId, state: 'SCORED', score: 75, feedback: null, versionNo: 4 };
    const second = { ...first, studentId: fx.studentIds[2], score: 0, versionNo: 0 };
    await teacher.put(sheetPath).send({ rows: [first, first] }).expect(422);
    await teacher.put(sheetPath).send({ rows: [second, { ...first, versionNo: 3 }] }).expect(409);
    const bulk = await teacher.put(sheetPath).send({ rows: [first, second] }).expect(200);
    expect(bulk.body).toMatchObject({ changed: 2, rows: [{ versionNo: 5, score: 75 }, { versionNo: 1, score: 0 }] });
    const bookPath = api(`/assessments/grade-book?teachingAssignmentId=${a.ta}`);
    await other.get(bookPath).expect(404);
    const book = await teacher.get(bookPath).expect(200);
    expect(book.body.assessments).toEqual([expect.objectContaining({ id: assessmentId, status: 'DRAFT' })]);
    expect(book.body.students).toHaveLength(2);
    expect(book.body.students).toContainEqual(expect.objectContaining({
      studentId: fx.studentIds[2], cells: { [assessmentId]: { state: 'SCORED', score: 0, feedback: null } },
    }));
  });

  it('hanya menerbitkan penilaian setelah seluruh siswa selesai dinilai', async () => {
    const a = await setupClass(app, fx, s, '7A', [0, 2, 3]);
    const scheme = await a.cur.post(api('/grade-schemes')).send({ termId: s.termId, subjectId: s.mathId, gradeLevelId: s.gradeId, components: [{ code: 'FORMATIF', name: 'Formatif', weight: 100 }] }).expect(201);
    await a.cur.post(api(`/grade-schemes/${scheme.body.id}/publish`)).expect(204);
    const componentId = (await prisma.gradeComponent.findFirstOrThrow({ where: { schemeVersionId: scheme.body.id } })).id;
    const teacher = await loginAs(app, fx.emails.teacher);
    const id = (await teacher.post(api('/assessments')).send({ teachingAssignmentId: a.ta, componentId, title: 'Sumatif bab 1' }).expect(201)).body.id as string;
    const publishPath = api(`/assessments/${id}/publish`);
    await teacher.post(publishPath).expect(409);
    await teacher.put(api(`/assessments/${id}/grades/${fx.studentIds[0]}`)).send({ state: 'SCORED', score: 0, feedback: null, versionNo: 0 }).expect(200);
    await teacher.post(publishPath).expect(409);
    await teacher.put(api(`/assessments/${id}/grades/${fx.studentIds[2]}`)).send({ state: 'MISSING', score: null, feedback: null, versionNo: 0 }).expect(200);
    await teacher.put(api(`/assessments/${id}/grades/${fx.studentIds[3]}`)).send({ state: 'SCORED', score: 90, feedback: null, versionNo: 0 }).expect(200);
    await prisma.enrollment.updateMany({
      where: { classGroupId: a.cls, studentId: fx.studentIds[3] },
      data: { validTo: new Date(`${addDays(today(), -1)}T00:00:00Z`) },
    });
    const [publication, edit] = await Promise.all([
      teacher.post(publishPath),
      teacher.put(api(`/assessments/${id}/grades/${fx.studentIds[0]}`)).send({ state: 'PENDING', score: null, feedback: null, versionNo: 1 }),
    ]);
    expect([publication.status, edit.status]).toEqual(
      publication.status === 204 ? [204, 409] : [409, 200],
    );
    if (edit.status === 200) {
      await teacher.put(api(`/assessments/${id}/grades/${fx.studentIds[0]}`)).send({ state: 'SCORED', score: 0, feedback: null, versionNo: 2 }).expect(200);
      await teacher.post(publishPath).expect(204);
    }
    const published = await teacher.get(api(`/assessments/${id}/grades`)).expect(200);
    expect(published.body.assessment).toMatchObject({ status: 'PUBLISHED', assessedOn: today() });
    expect(published.body.students).toHaveLength(2);
    const moved = await loginAs(app, s.otherStudentEmail);
    expect((await moved.get(api('/me/grades')).expect(200)).body.items).toEqual([]);
    await teacher.post(publishPath).expect(409);
    await teacher.put(api(`/assessments/${id}/grades/${fx.studentIds[0]}`)).send({ state: 'SCORED', score: 70, feedback: null, versionNo: 1 }).expect(409);
    const sheet = await teacher.get(api(`/assessments/${id}/grades`)).expect(200);
    expect(sheet.body.assessment.status).toBe('PUBLISHED');
    const other = await loginAs(app, s.homeroomEmail);
    await other.post(publishPath).expect(404);
    const student = await loginAs(app, s.studentEmail);
    await student.post(publishPath).expect(403);
    expect(await prisma.auditEvent.count({ where: { action: 'assessment.publish', entityId: id } })).toBe(1);
  });
});
