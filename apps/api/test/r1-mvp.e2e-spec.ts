import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import { AttendanceService } from '../src/attendance/attendance.service.js';
import { hashPassword } from '../src/auth/crypto.js';
import { addDays, todayIn } from '../src/common/school-time.js';
import type { PrismaClient, RoleKey } from '../src/generated/prisma/client.js';
import { createApp, createPrisma, loginAs, PASSWORD, resetDb, seedFixture, type Fixture } from './helpers.js';

// Alur R1 memanggil banyak endpoint; PGlite (satu koneksi) lambat bila seluruh suite berjalan.
vi.setConfig({ testTimeout: 120_000 });

let app: INestApplication<App>;
let prisma: PrismaClient;
let fx: Fixture;
const api = (path: string) => `/api/v1${path}`;
const today = () => todayIn('Asia/Jakarta');
const d = (s: string) => new Date(`${s}T00:00:00.000Z`);

interface R1 {
  termId: string;
  yearId: string;
  gradeId: string;
  mathId: string;
  homeroomEmail: string;
  homeroomEmployeeId: string;
  teacherEmployeeId: string;
  studentEmail: string;
  guardianEmail: string;
  otherStudentEmail: string;
}
let r1: R1;

async function user(fullName: string, email: string, role: RoleKey, kind: 'employee' | 'student' | 'guardian') {
  const passwordHash = await hashPassword(PASSWORD);
  const person = await prisma.person.create({ data: { schoolId: fx.schoolId, fullName, email } });
  let id = '';
  if (kind === 'employee') id = (await prisma.employee.create({ data: { schoolId: fx.schoolId, personId: person.id, employeeNumber: email, position: 'Guru', isTeacher: true } })).id;
  if (kind === 'student') id = (await prisma.student.create({ data: { schoolId: fx.schoolId, personId: person.id, nis: email.slice(0, 8) } })).id;
  if (kind === 'guardian') id = (await prisma.guardian.create({ data: { schoolId: fx.schoolId, personId: person.id } })).id;
  await prisma.user.create({ data: { email, passwordHash, personId: person.id, roles: { create: { role, schoolId: fx.schoolId } } } });
  return id;
}

beforeAll(async () => {
  prisma = createPrisma();
  app = await createApp();
});
beforeEach(async () => {
  await resetDb(prisma);
  fx = await seedFixture(prisma);
  // Guru fixture menjadi guru mapel; tambah wali kelas, siswa berakun, wali murid.
  const teacherPerson = (await prisma.user.findUniqueOrThrow({ where: { email: fx.emails.teacher } })).personId!;
  await prisma.employee.updateMany({ where: { personId: teacherPerson }, data: { isTeacher: true } });
  const t = today();
  const year = await prisma.academicYear.create({
    data: { schoolId: fx.schoolId, name: 'TA Tes', startDate: d(addDays(t, -150)), endDate: d(addDays(t, 150)), status: 'ACTIVE', terms: { create: { name: 'Semester Tes', sequence: 1, startDate: d(addDays(t, -150)), endDate: d(addDays(t, 150)) } } },
    include: { terms: true },
  });
  const homeroomEmployeeId = await user('Wali Kelas', 'walikelas@tes.test', 'TEACHER', 'employee');
  const studentId = await user('Siswa Berakun', 'siswa@tes.test', 'STUDENT', 'student');
  const otherStudentId = await user('Siswa Lain', 'siswa2@tes.test', 'STUDENT', 'student');
  const guardianId = await user('Wali Murid', 'walimurid@tes.test', 'GUARDIAN', 'guardian');
  await prisma.studentGuardian.create({ data: { studentId, guardianId, relationship: 'MOTHER', status: 'VERIFIED', verifiedAt: new Date() } });
  fx.studentIds.push(studentId, otherStudentId);
  r1 = {
    termId: year.terms[0]!.id,
    yearId: year.id,
    gradeId: '',
    mathId: '',
    homeroomEmail: 'walikelas@tes.test',
    homeroomEmployeeId,
    teacherEmployeeId: (await prisma.employee.findFirstOrThrow({ where: { personId: teacherPerson } })).id,
    studentEmail: 'siswa@tes.test',
    guardianEmail: 'walimurid@tes.test',
    otherStudentEmail: 'siswa2@tes.test',
  };
});
afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

/** Menyusun rombel + jadwal terbit lewat API, slot setiap hari pukul 07:00–08:20. Mengembalikan id penting. */
async function setupClass(code = '7A', studentIdx = [0, 2]) {
  const cur = await loginAs(app, fx.emails.curriculum);
  const admin = await loginAs(app, fx.emails.admin);
  if (!r1.gradeId) r1.gradeId = (await admin.post(api('/grade-levels')).send({ code: '7', ordinal: 1, name: 'Kelas 7' }).expect(201)).body.id;
  if (!r1.mathId) r1.mathId = (await cur.post(api('/subjects')).send({ code: 'MTK', name: 'Matematika' }).expect(201)).body.id;
  const cls = (await admin.post(api('/class-groups')).send({ academicYearId: r1.yearId, gradeLevelId: r1.gradeId, code, capacity: 30 }).expect(201)).body.id as string;
  await admin.post(api(`/class-groups/${cls}/homeroom`)).send({ employeeId: r1.homeroomEmployeeId, validFrom: addDays(today(), -100) }).expect(204);
  const enrolled = await admin.post(api(`/class-groups/${cls}/enrollments`)).send({ studentIds: studentIdx.map((i) => fx.studentIds[i]), validFrom: addDays(today(), -100) }).expect(200);
  expect(enrolled.body).toMatchObject({ enrolled: studentIdx.length, rejected: [] });
  const ta = (await cur.post(api('/teaching-assignments')).send({ termId: r1.termId, classGroupId: cls, subjectId: r1.mathId, employeeId: r1.teacherEmployeeId, weeklyPeriods: 14 }).expect(201)).body.id as string;
  const draft = (await cur.post(api('/timetable/drafts')).send({ termId: r1.termId, classGroupId: cls }).expect(201)).body.id as string;
  for (let weekday = 1; weekday <= 7; weekday++) {
    await cur.post(api(`/timetable/versions/${draft}/slots`)).send({ teachingAssignmentId: ta, weekday, startTime: '07:00', endTime: '08:20' }).expect(201);
  }
  return { cls, ta, draft, cur, admin };
}

describe('R1 struktur kelas & jadwal', () => {
  it('menerbitkan jadwal, menolak benturan guru, dan menyimpan riwayat versi', async () => {
    const a = await setupClass('7A', [0]);
    await a.cur.post(api(`/timetable/versions/${a.draft}/publish`)).send({ effectiveFrom: addDays(today(), -100) }).expect(204);

    // Rombel kedua dengan guru yang sama pada jam yang sama → benturan guru, terbit ditolak.
    const b = await setupClass('7B', [1]);
    const tt = await b.cur.get(api(`/timetable?termId=${r1.termId}&classGroupId=${b.cls}`)).expect(200);
    expect(tt.body.draft.conflicts.length).toBe(7);
    expect(tt.body.draft.conflicts[0]).toMatchObject({ kind: 'teacher' });
    await b.cur.post(api(`/timetable/versions/${b.draft}/publish`)).send({ effectiveFrom: today() }).expect(409);

    // Draf baru untuk 7A menyalin versi terbit; terbit ulang membuat versi lama SUPERSEDED.
    const v2 = (await a.cur.post(api('/timetable/drafts')).send({ termId: r1.termId, classGroupId: a.cls }).expect(201)).body.id;
    const t2 = await a.cur.get(api(`/timetable?termId=${r1.termId}&classGroupId=${a.cls}`)).expect(200);
    expect(t2.body.draft).toMatchObject({ id: v2, versionNo: 2 });
    expect(t2.body.draft.slots).toHaveLength(7);
    await a.cur.post(api(`/timetable/versions/${v2}/publish`)).send({ effectiveFrom: today() }).expect(204);
    const versions = await prisma.timetableVersion.findMany({ where: { classGroupId: a.cls }, orderBy: { versionNo: 'asc' } });
    expect(versions.map((v) => v.status)).toEqual(['SUPERSEDED', 'PUBLISHED']);

    // Guru tidak boleh mengubah struktur kelas.
    const teacher = await loginAs(app, fx.emails.teacher);
    await teacher.post(api('/class-groups')).send({ academicYearId: r1.yearId, gradeLevelId: r1.gradeId, code: '7C' }).expect(403);
  });

  it('pindah kelas menutup penempatan lama dan menolak penempatan ganda', async () => {
    const a = await setupClass('7A', [0]);
    const b = (await a.admin.post(api('/class-groups')).send({ academicYearId: r1.yearId, gradeLevelId: r1.gradeId, code: '7B' }).expect(201)).body.id;
    const dup = await a.admin.post(api(`/class-groups/${b}/enrollments`)).send({ studentIds: [fx.studentIds[0]], validFrom: today() }).expect(200);
    expect(dup.body.rejected[0].reason).toContain('7A');
    const detail = await a.admin.get(api(`/class-groups/${a.cls}`)).expect(200);
    await a.admin.post(api(`/enrollments/${detail.body.enrollments[0].id}/move`)).send({ toClassGroupId: b, date: today(), reason: 'Permintaan orang tua' }).expect(204);
    const rows = await prisma.enrollment.findMany({ where: { studentId: fx.studentIds[0] }, orderBy: { validFrom: 'asc' } });
    expect(rows.map((r) => [r.status, r.validTo ? 'closed' : 'open'])).toEqual([['MOVED', 'closed'], ['ACTIVE', 'open']]);
  });
});

describe('R1 absensi', () => {
  it('guru mengisi absensi hari ini, alpa memberi notifikasi wali sekali, guru lain ditolak', async () => {
    const a = await setupClass('7A', [0, 2]);
    await a.cur.post(api(`/timetable/versions/${a.draft}/publish`)).send({ effectiveFrom: addDays(today(), -100) }).expect(204);
    const teacher = await loginAs(app, fx.emails.teacher);
    const todayView = await teacher.get(api('/teacher/today')).expect(200);
    expect(todayView.body.lessons).toHaveLength(1);
    const slotId = todayView.body.lessons[0].timetableSlotId;

    const sid = (await teacher.post(api('/attendance/sessions')).send({ timetableSlotId: slotId, date: today() }).expect(200)).body.id;
    // Membuka lagi mengembalikan sesi yang sama.
    expect((await teacher.post(api('/attendance/sessions')).send({ timetableSlotId: slotId, date: today() }).expect(200)).body.id).toBe(sid);
    const detail = await teacher.get(api(`/attendance/sessions/${sid}`)).expect(200);
    expect(detail.body).toMatchObject({ canEdit: true, canRequestCorrection: false });
    expect(detail.body.roster).toHaveLength(2);
    const guardedStudent = fx.studentIds[2]!;

    await teacher.post(api(`/attendance/sessions/${sid}/close`)).expect(409); // belum terisi
    const save = (status: string) =>
      teacher.post(api(`/attendance/sessions/${sid}/records`)).send({ records: [{ studentId: fx.studentIds[0], status: 'PRESENT' }, { studentId: guardedStudent, status }] }).expect(200);
    await save('ABSENT');
    await save('PRESENT');
    await save('ABSENT');

    // FR-7.3: belum ada notifikasi selama sesi masih terbuka (status belum final).
    const guardian = await loginAs(app, r1.guardianEmail);
    expect((await guardian.get(api('/notifications')).expect(200)).body.unread).toBe(0);
    const rec = await prisma.studentAttendanceRecord.findFirstOrThrow({ where: { sessionId: sid, studentId: guardedStudent } });
    expect(rec.versionNo).toBe(3);

    await teacher.post(api(`/attendance/sessions/${sid}/close`)).expect(204);
    const notes = await guardian.get(api('/notifications')).expect(200);
    expect(notes.body.unread).toBe(1);
    expect(notes.body.items[0]).toMatchObject({ eventType: 'attendance.absent' });
    // Perubahan setelah ditutup langsung final, tapi tidak menggandakan notifikasi.
    await save('PRESENT');
    await save('ABSENT');
    expect((await guardian.get(api('/notifications')).expect(200)).body.unread).toBe(1);

    const other = await loginAs(app, r1.homeroomEmail);
    await other.post(api(`/attendance/sessions/${sid}/records`)).send({ records: [{ studentId: guardedStudent, status: 'PRESENT' }] }).expect(403);
    await other.get(api(`/attendance/sessions/${sid}`)).expect(200); // wali kelas boleh melihat

    // Siswa dan wali melihat kehadiran sendiri; siswa lain tidak bisa melihat data orang lain.
    const student = await loginAs(app, r1.studentEmail);
    expect((await student.get(api('/me/attendance')).expect(200)).body.counts.ABSENT).toBe(1);
    expect((await guardian.get(api('/me/attendance')).expect(200)).body.counts.ABSENT).toBe(1);
    const stranger = await loginAs(app, r1.otherStudentEmail);
    await stranger.get(api(`/me/attendance?studentId=${guardedStudent}`)).expect(403);

    const recap = await other.get(api(`/attendance/recap?classGroupId=${a.cls}&from=${addDays(today(), -7)}&to=${today()}`)).expect(200);
    expect(recap.body.sessionCount).toBe(1);
    await teacher.get(api(`/attendance/recap?classGroupId=${a.cls}&from=${today()}&to=${today()}`)).expect(403);
  });

  it('setelah hari sesi, perubahan lewat koreksi yang disetujui wali kelas (D4)', async () => {
    const a = await setupClass('7A', [0, 2]);
    await a.cur.post(api(`/timetable/versions/${a.draft}/publish`)).send({ effectiveFrom: addDays(today(), -100) }).expect(204);
    const slot = await prisma.timetableSlot.findFirstOrThrow({ where: { version: { classGroupId: a.cls, status: 'PUBLISHED' } } });
    const teacher = await loginAs(app, fx.emails.teacher);
    const yesterday = addDays(today(), -1);
    const ySlot = await prisma.timetableSlot.findFirstOrThrow({ where: { versionId: slot.versionId, weekday: ((new Date(`${yesterday}T12:00:00Z`).getUTCDay() + 6) % 7) + 1 } });
    const sid = (await teacher.post(api('/attendance/sessions')).send({ timetableSlotId: ySlot.id, date: yesterday }).expect(200)).body.id;
    await teacher.post(api(`/attendance/sessions/${sid}/records`)).send({ records: [{ studentId: fx.studentIds[0], status: 'PRESENT' }] }).expect(409);
    const detail = await teacher.get(api(`/attendance/sessions/${sid}`)).expect(200);
    expect(detail.body).toMatchObject({ canEdit: false, canRequestCorrection: true });

    const recordId = detail.body.roster.find((r: { studentId: string }) => r.studentId === fx.studentIds[2]).recordId;
    const cid = (await teacher.post(api(`/attendance/records/${recordId}/corrections`)).send({ proposedStatus: 'ABSENT', reason: 'Lupa diisi kemarin' }).expect(201)).body.id;
    await teacher.post(api(`/attendance/records/${recordId}/corrections`)).send({ proposedStatus: 'SICK', reason: 'Koreksi kedua' }).expect(409);
    await teacher.post(api(`/attendance/corrections/${cid}/approve`)).send({}).expect(403);

    const homeroom = await loginAs(app, r1.homeroomEmail);
    const pending = await homeroom.get(api('/attendance/corrections?decision=PENDING')).expect(200);
    expect(pending.body).toHaveLength(1);
    await homeroom.post(api(`/attendance/corrections/${cid}/approve`)).send({ note: 'Sesuai' }).expect(204);
    const rec = await prisma.studentAttendanceRecord.findUniqueOrThrow({ where: { id: recordId } });
    expect(rec.status).toBe('ABSENT');
    const guardian = await loginAs(app, r1.guardianEmail);
    expect((await guardian.get(api('/notifications')).expect(200)).body.unread).toBe(1);
  });
});

describe('R1 pengumuman', () => {
  it('pengumuman rombel hanya terlihat oleh audiensnya dan memberi notifikasi', async () => {
    const a = await setupClass('7A', [2]);
    const res = await a.cur.post(api('/announcements')).send({ title: 'Ulangan Matematika', body: 'Ulangan bab 3 hari Senin, bawa kalkulator.', audienceKind: 'CLASS_GROUP', classGroupId: a.cls }).expect(201);
    // siswa, wali murid, guru mapel, wali kelas
    expect(res.body.recipientCount).toBe(4);
    const student = await loginAs(app, r1.studentEmail);
    expect((await student.get(api('/announcements')).expect(200)).body.map((x: { id: string }) => x.id)).toContain(res.body.id);
    await student.post(api(`/announcements/${res.body.id}/read`)).expect(204);
    const stranger = await loginAs(app, r1.otherStudentEmail);
    expect((await stranger.get(api('/announcements')).expect(200)).body).toHaveLength(0);
    await stranger.post(api(`/announcements/${res.body.id}/read`)).expect(403);
    const teacher = await loginAs(app, fx.emails.teacher);
    await teacher.post(api('/announcements')).send({ title: 'Tidak boleh', body: 'Guru tanpa izin menerbitkan.', audienceKind: 'ALL' }).expect(403);
  });
});

describe('R1 finalisasi, pengecualian jadwal, beranda', () => {
  it('sesi yang lewat hari tanpa ditutup difinalkan job dan wali diberi tahu sekali', async () => {
    const a = await setupClass('7A', [0, 2]);
    await a.cur.post(api(`/timetable/versions/${a.draft}/publish`)).send({ effectiveFrom: addDays(today(), -100) }).expect(204);
    const yesterday = addDays(today(), -1);
    const weekday = ((new Date(`${yesterday}T12:00:00Z`).getUTCDay() + 6) % 7) + 1;
    const ySlot = await prisma.timetableSlot.findFirstOrThrow({ where: { version: { classGroupId: a.cls, status: 'PUBLISHED' }, weekday } });
    const teacher = await loginAs(app, fx.emails.teacher);
    const sid = (await teacher.post(api('/attendance/sessions')).send({ timetableSlotId: ySlot.id, date: yesterday }).expect(200)).body.id;
    await prisma.studentAttendanceRecord.updateMany({ where: { sessionId: sid, studentId: fx.studentIds[2] }, data: { status: 'ABSENT' } });
    const guardian = await loginAs(app, r1.guardianEmail);
    expect((await guardian.get(api('/notifications')).expect(200)).body.unread).toBe(0);

    const job = app.get(AttendanceService);
    expect(await job.finalizeDue()).toBeGreaterThanOrEqual(1);
    expect(await prisma.studentAttendanceRecord.count({ where: { sessionId: sid, finalizedAt: null } })).toBe(0);
    await job.finalizeDue();
    expect((await guardian.get(api('/notifications')).expect(200)).body.unread).toBe(1);
  });

  it('pertemuan bisa diganti guru atau dibatalkan per tanggal tanpa mengubah jadwal mingguan', async () => {
    const a = await setupClass('7A', [0]);
    await a.cur.post(api(`/timetable/versions/${a.draft}/publish`)).send({ effectiveFrom: addDays(today(), -100) }).expect(204);
    const weekday = ((new Date(`${today()}T12:00:00Z`).getUTCDay() + 6) % 7) + 1;
    const slot = await prisma.timetableSlot.findFirstOrThrow({ where: { version: { classGroupId: a.cls, status: 'PUBLISHED' }, weekday } });

    // Wali kelas fixture juga guru: jadikan pengganti hari ini.
    const ex = await a.cur.post(api(`/timetable/slots/${slot.id}/exceptions`)).send({ date: today(), kind: 'SUBSTITUTED', substituteEmployeeId: r1.homeroomEmployeeId, reason: 'Guru mapel dinas luar' }).expect(201);
    await a.cur.post(api(`/timetable/slots/${slot.id}/exceptions`)).send({ date: addDays(today(), 1), kind: 'CANCELLED', reason: 'Tanggal salah hari' }).expect(422);

    const teacher = await loginAs(app, fx.emails.teacher);
    const own = await teacher.get(api('/teacher/today')).expect(200);
    expect(own.body.lessons[0].unavailable).toMatchObject({ kind: 'SUBSTITUTED' });
    await teacher.post(api('/attendance/sessions')).send({ timetableSlotId: slot.id, date: today() }).expect(403);

    const sub = await loginAs(app, r1.homeroomEmail);
    const subToday = await sub.get(api('/teacher/today')).expect(200);
    expect(subToday.body.lessons[0]).toMatchObject({ timetableSlotId: slot.id, unavailable: null, substituteFor: { fullName: 'Pegawai teacher' } });
    const sid = (await sub.post(api('/attendance/sessions')).send({ timetableSlotId: slot.id, date: today() }).expect(200)).body.id;
    expect((await sub.get(api(`/attendance/sessions/${sid}`)).expect(200)).body.canEdit).toBe(true);
    // Sesi sudah dibuka: perubahan pertemuan tidak bisa dihapus lagi.
    await a.cur.delete(api(`/timetable/exceptions/${ex.body.id}`)).expect(409);

    // Jadwal mingguan tetap: tampilan per guru masih 7 pertemuan milik guru mapel.
    const lens = await a.cur.get(api(`/timetable/lens?employeeId=${r1.teacherEmployeeId}`)).expect(200);
    expect(lens.body.slots).toHaveLength(7);

    await a.cur.post(api(`/timetable/slots/${slot.id}/exceptions`)).send({ date: addDays(today(), 7), kind: 'CANCELLED', reason: 'Ujian sekolah' }).expect(201);
    const list = await a.cur.get(api(`/timetable/exceptions?from=${today()}&to=${addDays(today(), 14)}`)).expect(200);
    expect(list.body.map((x: { kind: string }) => x.kind)).toEqual(['SUBSTITUTED', 'CANCELLED']);
  });

  it('beranda membawa angka per peran dengan definisi dan sumber', async () => {
    const a = await setupClass('7A', [0]);
    const cur = await a.cur.get(api('/dashboard/summary')).expect(200);
    expect(cur.body.generatedAt).toBeTruthy();
    const keys = cur.body.metrics.map((m: { key: string }) => m.key);
    expect(keys).toEqual(expect.arrayContaining(['students_unplaced', 'classes_without_timetable', 'timetable_drafts', 'assignments_underscheduled']));
    for (const m of cur.body.metrics) expect(m.definition.length).toBeGreaterThan(10);
    const teacher = await loginAs(app, fx.emails.teacher);
    const t = await teacher.get(api('/dashboard/summary')).expect(200);
    expect(t.body.metrics.map((m: { key: string }) => m.key)).toContain('lessons_to_fill_today');
  });
});

describe('R1 audiens gedung & peran', () => {
  it('pengumuman per peran dan per gedung hanya sampai ke audiensnya', async () => {
    const a = await setupClass('7A', [2]);
    const building = await prisma.building.create({
      data: { schoolId: fx.schoolId, code: 'G', name: 'Gedung Tes', floors: { create: { level: 1, name: 'L1' } } },
      include: { floors: true },
    });
    const room = await prisma.room.create({ data: { buildingId: building.id, floorId: building.floors[0]!.id, code: 'G101', name: 'Kelas G101' } });
    await prisma.classGroup.update({ where: { id: a.cls }, data: { mainRoomId: room.id } });

    const role = await a.cur.post(api('/announcements')).send({ title: 'Rapat guru', body: 'Rapat seluruh guru hari Jumat pukul 13.00.', audienceKind: 'ROLE', audienceRole: 'TEACHER' }).expect(201);
    expect(role.body.recipientCount).toBe(2); // guru mapel + wali kelas
    await a.cur.post(api('/announcements')).send({ title: 'Tanpa peran', body: 'Audiens peran tanpa memilih peran.', audienceKind: 'ROLE' }).expect(422);
    const bld = await a.cur.post(api('/announcements')).send({ title: 'Perbaikan listrik', body: 'Gedung G tanpa listrik hari Sabtu pagi.', audienceKind: 'BUILDING', buildingId: building.id }).expect(201);

    const student = await loginAs(app, r1.studentEmail);
    const seen = (await student.get(api('/announcements')).expect(200)).body.map((x: { id: string }) => x.id);
    expect(seen).toContain(bld.body.id);
    expect(seen).not.toContain(role.body.id);
    const teacher = await loginAs(app, fx.emails.teacher);
    expect((await teacher.get(api('/announcements')).expect(200)).body.map((x: { id: string }) => x.id)).toEqual(expect.arrayContaining([role.body.id, bld.body.id]));
    const stranger = await loginAs(app, r1.otherStudentEmail);
    expect((await stranger.get(api('/announcements')).expect(200)).body).toHaveLength(0);
  });
});

describe('R1 pelengkap: sesi tambahan, perubahan jadwal di portal, angka admin', () => {
  it('wali kelas membuka sesi tambahan dan melihatnya di daftar hari ini; guru lain ditolak', async () => {
    const a = await setupClass('7A', [0, 2]);
    const homeroom = await loginAs(app, r1.homeroomEmail);
    await homeroom.post(api('/attendance/sessions')).send({ classGroupId: a.cls, date: today(), reason: 'ab' }).expect(422);
    const sid = (await homeroom.post(api('/attendance/sessions')).send({ classGroupId: a.cls, date: today(), reason: 'Kegiatan kelas di luar jadwal' }).expect(200)).body.id;
    const t = await homeroom.get(api('/teacher/today')).expect(200);
    expect(t.body.adHocSessions).toEqual([expect.objectContaining({ id: sid, classGroup: { id: a.cls, code: '7A' }, status: 'OPEN', filled: 0, total: 2 })]);
    const teacher = await loginAs(app, fx.emails.teacher);
    await teacher.post(api('/attendance/sessions')).send({ classGroupId: a.cls, date: today(), reason: 'Bukan wali kelas' }).expect(403);
  });

  it('portal siswa menampilkan versi, waktu terbit, dan perubahan pertemuan', async () => {
    const a = await setupClass('7A', [2]);
    await a.cur.post(api(`/timetable/versions/${a.draft}/publish`)).send({ effectiveFrom: addDays(today(), -100) }).expect(204);
    const nextWeek = addDays(today(), 7);
    const weekday = ((new Date(`${nextWeek}T12:00:00Z`).getUTCDay() + 6) % 7) + 1;
    const slot = await prisma.timetableSlot.findFirstOrThrow({ where: { version: { classGroupId: a.cls, status: 'PUBLISHED' }, weekday } });
    await a.cur.post(api(`/timetable/slots/${slot.id}/exceptions`)).send({ date: nextWeek, kind: 'CANCELLED', reason: 'Ujian sekolah' }).expect(201);

    const student = await loginAs(app, r1.studentEmail);
    const res = await student.get(api('/me/class-timetable')).expect(200);
    expect(res.body).toMatchObject({ classGroup: { code: '7A' }, versionNo: 1, effectiveFrom: addDays(today(), -100) });
    expect(res.body.publishedAt).toBeTruthy();
    expect(res.body.changes).toEqual([expect.objectContaining({ date: nextWeek, kind: 'CANCELLED', reason: 'Ujian sekolah' })]);
    // Wali melihat hal yang sama untuk anaknya.
    const guardian = await loginAs(app, r1.guardianEmail);
    expect((await guardian.get(api('/me/class-timetable')).expect(200)).body.changes).toHaveLength(1);
  });

  it('angka admin (data induk, akun, impor) punya definisi dan sumber', async () => {
    const admin = await loginAs(app, fx.emails.admin);
    const res = await admin.get(api('/dashboard/summary')).expect(200);
    const byKey = Object.fromEntries(res.body.metrics.map((m: { key: string }) => [m.key, m]));
    for (const key of ['students_active', 'employees_active', 'students_without_guardian', 'guardian_links_pending', 'invitations_open', 'invitations_expired', 'profile_corrections_pending']) {
      expect(byKey[key], key).toBeTruthy();
      expect(byKey[key].definition.length).toBeGreaterThan(10);
      expect(byKey[key].source.length).toBeGreaterThan(2);
    }
    expect(byKey.students_active.value).toBe(4);
  });
});
