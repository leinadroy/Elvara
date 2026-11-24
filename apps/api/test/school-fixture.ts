import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import { hashPassword } from '../src/auth/crypto.js';
import { addDays, todayIn } from '../src/common/school-time.js';
import type { PrismaClient, RoleKey } from '../src/generated/prisma/client.js';
import { loginAs, PASSWORD, type Fixture } from './helpers.js';

/**
 * Fixture sekolah bersama untuk tes R1 dan R2: tahun ajaran aktif dengan satu semester yang memuat hari ini,
 * guru mapel (guru fixture), wali kelas, dua siswa berakun, dan wali murid terverifikasi untuk siswa pertama.
 */
export interface School {
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

export const api = (path: string) => `/api/v1${path}`;
export const today = () => todayIn('Asia/Jakarta');
const d = (s: string) => new Date(`${s}T00:00:00.000Z`);

export async function createUser(prisma: PrismaClient, fx: Fixture, fullName: string, email: string, role: RoleKey, kind: 'employee' | 'student' | 'guardian') {
  const passwordHash = await hashPassword(PASSWORD);
  const person = await prisma.person.create({ data: { schoolId: fx.schoolId, fullName, email } });
  let id = '';
  if (kind === 'employee') id = (await prisma.employee.create({ data: { schoolId: fx.schoolId, personId: person.id, employeeNumber: email, position: 'Guru', isTeacher: true } })).id;
  if (kind === 'student') id = (await prisma.student.create({ data: { schoolId: fx.schoolId, personId: person.id, nis: email.slice(0, 8) } })).id;
  if (kind === 'guardian') id = (await prisma.guardian.create({ data: { schoolId: fx.schoolId, personId: person.id } })).id;
  await prisma.user.create({ data: { email, passwordHash, personId: person.id, roles: { create: { role, schoolId: fx.schoolId } } } });
  return id;
}

/** Menyiapkan sekolah di atas seedFixture. Menambahkan dua siswa berakun ke fx.studentIds (indeks 2 dan 3). */
export async function seedSchool(prisma: PrismaClient, fx: Fixture): Promise<School> {
  const teacherPerson = (await prisma.user.findUniqueOrThrow({ where: { email: fx.emails.teacher } })).personId!;
  await prisma.employee.updateMany({ where: { personId: teacherPerson }, data: { isTeacher: true } });
  const t = today();
  const year = await prisma.academicYear.create({
    data: { schoolId: fx.schoolId, name: 'TA Tes', startDate: d(addDays(t, -150)), endDate: d(addDays(t, 150)), status: 'ACTIVE', terms: { create: { name: 'Semester Tes', sequence: 1, startDate: d(addDays(t, -150)), endDate: d(addDays(t, 150)) } } },
    include: { terms: true },
  });
  const homeroomEmployeeId = await createUser(prisma, fx, 'Wali Kelas', 'walikelas@tes.test', 'TEACHER', 'employee');
  const studentId = await createUser(prisma, fx, 'Siswa Berakun', 'siswa@tes.test', 'STUDENT', 'student');
  const otherStudentId = await createUser(prisma, fx, 'Siswa Lain', 'siswa2@tes.test', 'STUDENT', 'student');
  const guardianId = await createUser(prisma, fx, 'Wali Murid', 'walimurid@tes.test', 'GUARDIAN', 'guardian');
  await prisma.studentGuardian.create({ data: { studentId, guardianId, relationship: 'MOTHER', status: 'VERIFIED', verifiedAt: new Date() } });
  fx.studentIds.push(studentId, otherStudentId);
  return {
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
}

/**
 * Menyusun rombel lewat API: tingkat 7 dan mapel MTK (sekali), wali kelas, penempatan siswa, penugasan
 * Matematika untuk guru fixture, dan draf jadwal dengan slot setiap hari pukul 07:00–08:20.
 */
export async function setupClass(app: INestApplication<App>, fx: Fixture, s: School, code = '7A', studentIdx = [0, 2]) {
  const cur = await loginAs(app, fx.emails.curriculum);
  const admin = await loginAs(app, fx.emails.admin);
  if (!s.gradeId) s.gradeId = (await admin.post(api('/grade-levels')).send({ code: '7', ordinal: 1, name: 'Kelas 7' }).expect(201)).body.id;
  if (!s.mathId) s.mathId = (await cur.post(api('/subjects')).send({ code: 'MTK', name: 'Matematika' }).expect(201)).body.id;
  const cls = (await admin.post(api('/class-groups')).send({ academicYearId: s.yearId, gradeLevelId: s.gradeId, code, capacity: 30 }).expect(201)).body.id as string;
  await admin.post(api(`/class-groups/${cls}/homeroom`)).send({ employeeId: s.homeroomEmployeeId, validFrom: addDays(today(), -100) }).expect(204);
  const enrolled = await admin.post(api(`/class-groups/${cls}/enrollments`)).send({ studentIds: studentIdx.map((i) => fx.studentIds[i]), validFrom: addDays(today(), -100) }).expect(200);
  if (enrolled.body.rejected.length) throw new Error(`Penempatan ditolak: ${JSON.stringify(enrolled.body.rejected)}`);
  const ta = (await cur.post(api('/teaching-assignments')).send({ termId: s.termId, classGroupId: cls, subjectId: s.mathId, employeeId: s.teacherEmployeeId, weeklyPeriods: 14 }).expect(201)).body.id as string;
  const draft = (await cur.post(api('/timetable/drafts')).send({ termId: s.termId, classGroupId: cls }).expect(201)).body.id as string;
  for (let weekday = 1; weekday <= 7; weekday++) {
    await cur.post(api(`/timetable/versions/${draft}/slots`)).send({ teachingAssignmentId: ta, weekday, startTime: '07:00', endTime: '08:20' }).expect(201);
  }
  return { cls, ta, draft, cur, admin };
}
