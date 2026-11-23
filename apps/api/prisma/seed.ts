/**
 * Data contoh untuk development lokal. Semua nama dan email sintetis; jangan dijalankan di production.
 * Jalankan: npm run db:seed -w api   (aman diulang: memakai upsert)
 *
 * Akun contoh (kata sandi sama untuk semua, lihat DEV_PASSWORD):
 *   admin@smartschool.test   — Admin sekolah
 *   kepsek@smartschool.test  — Manajemen
 *   guru@smartschool.test    — Guru
 *   wali@smartschool.test    — Orang tua/wali dari Andi Pratama (terverifikasi)
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type RoleKey } from '../src/generated/prisma/client.js';
import { hashPassword } from '../src/auth/crypto.js';

const DEV_PASSWORD = process.env.SEED_PASSWORD ?? 'SmartSchool#2026';

if (process.env.NODE_ENV === 'production') {
  console.error('Seed contoh tidak boleh dijalankan di production.');
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const d = (s: string) => new Date(`${s}T00:00:00.000Z`);

async function main() {
  const school =
    (await prisma.school.findFirst({ where: { npsn: '00000000' } })) ??
    (await prisma.school.create({ data: { name: 'Sekolah Contoh Smart School', npsn: '00000000', address: 'Jl. Contoh No. 1' } }));

  // Dua gedung, lantai, dan beberapa ruang.
  const layout = [
    { code: 'A', name: 'Gedung A', floors: [{ level: 1, rooms: [['A101', 'Kelas 7A'], ['A102', 'Kelas 7B'], ['A-TU', 'Ruang Tata Usaha', 'OFFICE']] }, { level: 2, rooms: [['A201', 'Kelas 8A'], ['A-LAB', 'Lab IPA', 'LAB']] }] },
    { code: 'B', name: 'Gedung B', floors: [{ level: 1, rooms: [['B-PUS', 'Perpustakaan', 'LIBRARY'], ['B-AULA', 'Aula', 'HALL']] }, { level: 2, rooms: [['B201', 'Kelas 9A']] }, { level: 3, rooms: [['B-KOM', 'Lab Komputer', 'LAB']] }] },
  ] as const;
  for (const b of layout) {
    const building = await prisma.building.upsert({
      where: { schoolId_code: { schoolId: school.id, code: b.code } },
      create: { schoolId: school.id, code: b.code, name: b.name },
      update: {},
    });
    for (const f of b.floors) {
      const floor = await prisma.floor.upsert({
        where: { buildingId_level: { buildingId: building.id, level: f.level } },
        create: { buildingId: building.id, level: f.level, name: `Lantai ${f.level}` },
        update: {},
      });
      for (const [code, name, type] of f.rooms as readonly (readonly string[])[]) {
        await prisma.room.upsert({
          where: { buildingId_code: { buildingId: building.id, code: code! } },
          create: { buildingId: building.id, floorId: floor.id, code: code!, name: name!, type: (type ?? 'CLASSROOM') as never, capacity: type ? null : 32 },
          update: {},
        });
      }
    }
  }

  // Tahun ajaran aktif.
  const activeYear = await prisma.academicYear.findFirst({ where: { schoolId: school.id, status: 'ACTIVE' } });
  if (!activeYear) {
    await prisma.academicYear.upsert({
      where: { schoolId_name: { schoolId: school.id, name: '2026/2027' } },
      create: {
        schoolId: school.id,
        name: '2026/2027',
        startDate: d('2026-07-13'),
        endDate: d('2027-06-26'),
        status: 'ACTIVE',
        terms: {
          create: [
            { name: 'Semester Ganjil', sequence: 1, startDate: d('2026-07-13'), endDate: d('2026-12-19') },
            { name: 'Semester Genap', sequence: 2, startDate: d('2027-01-04'), endDate: d('2027-06-26') },
          ],
        },
      },
      update: { status: 'ACTIVE' },
    });
  }

  const passwordHash = await hashPassword(DEV_PASSWORD);

  async function account(personId: string, email: string, roles: RoleKey[]) {
    const user = await prisma.user.upsert({ where: { email }, create: { email, passwordHash, personId }, update: {} });
    for (const role of roles) {
      await prisma.userRole.upsert({
        where: { userId_role_schoolId: { userId: user.id, role, schoolId: school.id } },
        create: { userId: user.id, role, schoolId: school.id },
        update: {},
      });
    }
    return user;
  }

  async function employee(employeeNumber: string, fullName: string, position: string, isTeacher: boolean, email: string, roles: RoleKey[]) {
    let e = await prisma.employee.findUnique({ where: { schoolId_employeeNumber: { schoolId: school.id, employeeNumber } } });
    if (!e) {
      const person = await prisma.person.create({ data: { schoolId: school.id, fullName, email } });
      e = await prisma.employee.create({ data: { schoolId: school.id, personId: person.id, employeeNumber, position, isTeacher } });
    }
    await account(e.personId, email, roles);
  }

  await employee('P-001', 'Admin Sekolah', 'Operator Tata Usaha', false, 'admin@smartschool.test', ['ADMIN']);
  await employee('P-002', 'Kepala Sekolah Contoh', 'Kepala Sekolah', true, 'kepsek@smartschool.test', ['MANAGEMENT', 'TEACHER']);
  await employee('P-003', 'Guru Contoh', 'Guru Matematika', true, 'guru@smartschool.test', ['TEACHER']);

  const students = [
    ['2026001', 'Andi Pratama', 'MALE'],
    ['2026002', 'Bunga Lestari', 'FEMALE'],
    ['2026003', 'Citra Ayu', 'FEMALE'],
    ['2026004', 'Dimas Saputra', 'MALE'],
    ['2026005', 'Eka Wulandari', 'FEMALE'],
    ['2026006', 'Fajar Nugroho', 'MALE'],
  ] as const;
  const studentIds: string[] = [];
  for (const [nis, fullName, gender] of students) {
    let s = await prisma.student.findUnique({ where: { schoolId_nis: { schoolId: school.id, nis } } });
    if (!s) {
      const person = await prisma.person.create({ data: { schoolId: school.id, fullName, gender } });
      s = await prisma.student.create({ data: { schoolId: school.id, personId: person.id, nis, enrolledAt: d('2026-07-13') } });
    }
    studentIds.push(s.id);
  }

  // Wali terverifikasi untuk Andi Pratama.
  let guardian = await prisma.guardian.findFirst({ where: { schoolId: school.id, person: { email: 'wali@smartschool.test' } } });
  if (!guardian) {
    const person = await prisma.person.create({ data: { schoolId: school.id, fullName: 'Wali Contoh', email: 'wali@smartschool.test', phone: '081200000000' } });
    guardian = await prisma.guardian.create({ data: { schoolId: school.id, personId: person.id } });
  }
  await prisma.studentGuardian.upsert({
    where: { studentId_guardianId: { studentId: studentIds[0]!, guardianId: guardian.id } },
    create: { studentId: studentIds[0]!, guardianId: guardian.id, relationship: 'FATHER', status: 'VERIFIED', verifiedAt: new Date(), isPrimaryContact: true },
    update: {},
  });
  await account(guardian.personId, 'wali@smartschool.test', ['GUARDIAN']);

  // ───────────── R1: kurikulum, siswa, struktur kelas, jadwal ─────────────
  await employee('P-004', 'Wakasek Kurikulum', 'Wakil Kepala Sekolah Kurikulum', true, 'kurikulum@smartschool.test', ['CURRICULUM', 'TEACHER']);
  const andi = await prisma.student.findUniqueOrThrow({ where: { id: studentIds[0]! } });
  await prisma.person.update({ where: { id: andi.personId }, data: { email: 'siswa@smartschool.test' } });
  await account(andi.personId, 'siswa@smartschool.test', ['STUDENT']);

  const emp = async (no: string) => (await prisma.employee.findUniqueOrThrow({ where: { schoolId_employeeNumber: { schoolId: school.id, employeeNumber: no } } })).id;
  const guruId = await emp('P-003');
  const kepsekId = await emp('P-002');
  const kurikulumId = await emp('P-004');
  const year = await prisma.academicYear.findFirstOrThrow({ where: { schoolId: school.id, status: 'ACTIVE' }, include: { terms: { orderBy: { sequence: 'asc' } } } });
  const term = year.terms[0]!;

  const grades: Record<string, string> = {};
  for (const [code, ordinal, name] of [['7', 1, 'Kelas 7'], ['8', 2, 'Kelas 8'], ['9', 3, 'Kelas 9']] as const) {
    grades[code] = (await prisma.gradeLevel.upsert({ where: { schoolId_code: { schoolId: school.id, code } }, create: { schoolId: school.id, code, ordinal, name }, update: {} })).id;
  }
  const roomId = async (code: string) => (await prisma.room.findFirstOrThrow({ where: { code, floor: { building: { schoolId: school.id } } } })).id;
  const classes: Record<string, string> = {};
  for (const [code, grade, room] of [['7A', '7', 'A101'], ['7B', '7', 'A102'], ['8A', '8', 'A201']] as const) {
    classes[code] = (
      await prisma.classGroup.upsert({
        where: { academicYearId_code: { academicYearId: year.id, code } },
        create: { schoolId: school.id, academicYearId: year.id, gradeLevelId: grades[grade]!, code, capacity: 32, mainRoomId: await roomId(room) },
        update: {},
      })
    ).id;
  }
  for (const [cls, employeeId] of [['7A', guruId], ['7B', kurikulumId]] as const) {
    if (!(await prisma.homeroomAssignment.findFirst({ where: { classGroupId: classes[cls]!, validTo: null } }))) {
      await prisma.homeroomAssignment.create({ data: { classGroupId: classes[cls]!, employeeId, validFrom: year.startDate } });
    }
  }
  for (const [i, id] of studentIds.entries()) {
    if (!(await prisma.enrollment.findFirst({ where: { studentId: id } }))) {
      await prisma.enrollment.create({ data: { studentId: id, classGroupId: classes[i < 3 ? '7A' : '7B']!, validFrom: year.startDate } });
    }
  }

  const subjects: Record<string, string> = {};
  for (const [code, name, groupCode] of [['MTK', 'Matematika', 'Umum'], ['BIN', 'Bahasa Indonesia', 'Umum'], ['IPA', 'Ilmu Pengetahuan Alam', 'Umum'], ['IPS', 'Ilmu Pengetahuan Sosial', 'Umum'], ['PJOK', 'Pendidikan Jasmani', 'Umum']] as const) {
    subjects[code] = (await prisma.subject.upsert({ where: { schoolId_code: { schoolId: school.id, code } }, create: { schoolId: school.id, code, name, groupCode }, update: {} })).id;
  }

  const periods = [['07:00', '07:40'], ['07:40', '08:20'], ['08:20', '09:00'], ['09:00', '09:40'], ['10:00', '10:40'], ['10:40', '11:20'], ['11:20', '12:00'], ['12:30', '13:10']];
  for (const [i, [startTime, endTime]] of periods.entries()) {
    await prisma.lessonPeriod.upsert({ where: { schoolId_sequence: { schoolId: school.id, sequence: i + 1 } }, create: { schoolId: school.id, sequence: i + 1, startTime: startTime!, endTime: endTime! }, update: {} });
  }

  async function assignment(cls: string, subject: string, employeeId: string, weeklyPeriods: number) {
    const key = { termId: term.id, classGroupId: classes[cls]!, subjectId: subjects[subject]!, employeeId };
    return (await prisma.teachingAssignment.upsert({ where: { termId_classGroupId_subjectId_employeeId: key }, create: { ...key, schoolId: school.id, weeklyPeriods }, update: {} })).id;
  }
  // Jadwal terbit Senin–Sabtu supaya guru contoh selalu punya jadwal "hari ini".
  const plan: Record<string, [string, string, string, string][]> = {
    '7A': [['MTK', guruId, '07:00', '08:20'], ['BIN', kepsekId, '08:20', '09:40'], ['IPA', kurikulumId, '10:00', '11:20']],
    '7B': [['MTK', guruId, '08:20', '09:40'], ['IPA', kurikulumId, '07:00', '08:20'], ['BIN', kepsekId, '10:00', '11:20']],
  };
  for (const [cls, rows] of Object.entries(plan)) {
    if (await prisma.timetableVersion.findFirst({ where: { termId: term.id, classGroupId: classes[cls]! } })) continue;
    const slots = [];
    for (const [subject, employeeId, startTime, endTime] of rows) {
      const teachingAssignmentId = await assignment(cls, subject, employeeId, 12);
      for (let weekday = 1; weekday <= 6; weekday++) slots.push({ teachingAssignmentId, weekday, startTime, endTime });
    }
    await prisma.timetableVersion.create({
      data: { schoolId: school.id, termId: term.id, classGroupId: classes[cls]!, versionNo: 1, status: 'PUBLISHED', effectiveFrom: term.startDate, publishedAt: new Date(), slots: { create: slots } },
    });
  }

  const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@smartschool.test' } });
  if (!(await prisma.announcement.findFirst({ where: { schoolId: school.id } }))) {
    await prisma.announcement.create({
      data: {
        schoolId: school.id,
        title: 'Selamat datang di Elvara',
        body: 'Jadwal pelajaran, absensi, dan pengumuman sekolah kini bisa dilihat di satu aplikasi. Hubungi tata usaha bila ada data yang belum sesuai.',
        audienceKind: 'ALL',
        status: 'PUBLISHED',
        publishAt: new Date(),
        publishedAt: new Date(),
        createdById: admin.id,
      },
    });
  }

  console.log(`Seed selesai: ${school.name}. Akun contoh memakai kata sandi dari prisma/seed.ts (DEV_PASSWORD).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
