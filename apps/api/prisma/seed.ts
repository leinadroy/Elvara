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
import { addDays, atTimeIn, todayIn } from '../src/common/school-time.js';

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
      const teachingAssignmentId = await assignment(cls, subject, employeeId, 6);
      for (let weekday = 1; weekday <= 6; weekday++) slots.push({ teachingAssignmentId, weekday, startTime, endTime });
    }
    await prisma.timetableVersion.create({
      data: { schoolId: school.id, termId: term.id, classGroupId: classes[cls]!, versionNo: 1, status: 'PUBLISHED', effectiveFrom: term.startDate, publishedAt: new Date(), slots: { create: slots } },
    });
  }

  const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@smartschool.test' } });

  // Skema nilai terbit untuk mapel kelas 7 semester ganjil + capaian pembelajaran contoh (R2 E11).
  for (const code of ['MTK', 'BIN', 'IPA']) {
    const where = { termId: term.id, subjectId: subjects[code]!, gradeLevelId: grades['7']! };
    if (await prisma.gradeSchemeVersion.findFirst({ where })) continue;
    await prisma.gradeSchemeVersion.create({
      data: {
        ...where,
        schoolId: school.id,
        versionNo: 1,
        status: 'PUBLISHED',
        passingScore: 75,
        publishedAt: new Date(),
        publishedById: admin.id,
        createdById: admin.id,
        components: {
          create: [
            { code: 'FORMATIF', name: 'Formatif (tugas & kuis)', weight: 30, sortOrder: 0 },
            { code: 'STS', name: 'Sumatif tengah semester', weight: 30, sortOrder: 1 },
            { code: 'SAS', name: 'Sumatif akhir semester', weight: 40, sortOrder: 2 },
          ],
        },
      },
    });
  }
  const outcomes: [string, string, string][] = [
    ['MTK', 'CP-1', 'Menyelesaikan persamaan dan pertidaksamaan linear satu variabel.'],
    ['MTK', 'CP-2', 'Menyajikan dan menafsirkan data dalam tabel dan diagram.'],
    ['BIN', 'CP-1', 'Menulis teks deskripsi dengan struktur dan kebahasaan yang tepat.'],
    ['IPA', 'CP-1', 'Menjelaskan klasifikasi makhluk hidup berdasarkan ciri-cirinya.'],
  ];
  for (const [subject, code, description] of outcomes) {
    await prisma.learningOutcome.upsert({
      where: { subjectId_gradeLevelId_code: { subjectId: subjects[subject]!, gradeLevelId: grades['7']!, code } },
      create: { schoolId: school.id, subjectId: subjects[subject]!, gradeLevelId: grades['7']!, code, description },
      update: {},
    });
  }

  // Penilaian contoh Matematika 7A (R2 E13): dua terbit, satu draf.
  const mtk7a = await prisma.teachingAssignment.findFirst({ where: { termId: term.id, classGroupId: classes['7A']!, subjectId: subjects['MTK']!, employeeId: guruId } });
  const mtkScheme = await prisma.gradeSchemeVersion.findFirst({ where: { termId: term.id, subjectId: subjects['MTK']!, gradeLevelId: grades['7']!, status: 'PUBLISHED' }, include: { components: true } });
  if (mtk7a && mtkScheme && !(await prisma.assessment.findFirst({ where: { teachingAssignmentId: mtk7a.id } }))) {
    const comp = (code: string) => mtkScheme.components.find((c) => c.code === code)!.id;
    const guruUser = await prisma.user.findUniqueOrThrow({ where: { email: 'guru@smartschool.test' } });
    const sevenA = studentIds.slice(0, 3);
    const plan: [string, string, number, 'PUBLISHED' | 'DRAFT', (number | 'MISSING' | null)[]][] = [
      ['Tugas 1: persamaan linear', 'FORMATIF', -40, 'PUBLISHED', [85, 'MISSING', 78]],
      ['Sumatif tengah semester', 'STS', -20, 'PUBLISHED', [80, 72, 90]],
      ['Kuis 2: diagram batang', 'FORMATIF', -3, 'DRAFT', [88, null, 70]],
    ];
    for (const [title, code, offset, status, scores] of plan) {
      await prisma.assessment.create({
        data: {
          schoolId: school.id,
          teachingAssignmentId: mtk7a.id,
          componentId: comp(code),
          title,
          assessedOn: d(addDays(todayIn(school.timezone), offset)),
          status,
          publishedAt: status === 'PUBLISHED' ? new Date() : null,
          publishedById: status === 'PUBLISHED' ? guruUser.id : null,
          createdById: guruUser.id,
          entries: {
            create: sevenA.flatMap((studentId, i) => {
              const v = scores[i];
              if (v === null || v === undefined) return [];
              return [v === 'MISSING' ? { studentId, state: 'MISSING' as const, updatedById: guruUser.id } : { studentId, state: 'SCORED' as const, score: v, updatedById: guruUser.id }];
            }),
          },
        },
      });
    }
  }

  // Tugas contoh Matematika 7A (R2 E12): terbit, tenggat 3 hari lagi, tertaut ke komponen formatif.
  if (mtk7a && mtkScheme && !(await prisma.learningActivity.findFirst({ where: { teachingAssignmentId: mtk7a.id } }))) {
    const guruUser = await prisma.user.findUniqueOrThrow({ where: { email: 'guru@smartschool.test' } });
    const due = new Date(Date.now() + 3 * 86_400_000);
    const act = await prisma.learningActivity.create({
      data: {
        schoolId: school.id,
        teachingAssignmentId: mtk7a.id,
        kind: 'ASSIGNMENT',
        title: 'Tugas 3: tabel frekuensi',
        instructions: 'Buat tabel frekuensi dari data tinggi badan teman sekelas (minimal 15 data), lalu jelaskan kelas dengan frekuensi terbanyak.',
        opensAt: new Date(Date.now() - 86_400_000),
        dueAt: due,
        allowLate: true,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        createdById: guruUser.id,
      },
    });
    await prisma.assessment.create({
      data: { schoolId: school.id, teachingAssignmentId: mtk7a.id, componentId: mtkScheme.components.find((c) => c.code === 'FORMATIF')!.id, activityId: act.id, title: act.title, assessedOn: d(todayIn(school.timezone)), createdById: guruUser.id },
    });
    const bunga = studentIds[1]!;
    await prisma.submission.create({
      data: {
        activityId: act.id,
        studentId: bunga,
        status: 'ON_TIME',
        submittedAt: new Date(),
        latestVersionNo: 1,
        versions: { create: { versionNo: 1, text: 'Kelas 150–154 cm memiliki frekuensi terbanyak (6 siswa).', late: false, idempotencyKey: 'seed-bunga-1' } },
      },
    });
  }

  // Agenda akademik contoh (R2 E10): terbit, kecuali satu draf.
  if (!(await prisma.academicCalendarEvent.findFirst({ where: { schoolId: school.id } }))) {
    const base = todayIn(school.timezone);
    const events: [string, 'EXAM' | 'HOLIDAY' | 'REPORT_DAY' | 'ACTIVITY', number, number, 'DRAFT' | 'PUBLISHED'][] = [
      ['Sumatif akhir semester ganjil', 'EXAM', 14, 19, 'PUBLISHED'],
      ['Libur akhir semester', 'HOLIDAY', 28, 40, 'PUBLISHED'],
      ['Pembagian rapor semester ganjil', 'REPORT_DAY', 26, 26, 'PUBLISHED'],
      ['Pentas seni kelas 7', 'ACTIVITY', 7, 7, 'DRAFT'],
    ];
    for (const [title, category, from, to, status] of events) {
      await prisma.academicCalendarEvent.create({
        data: { schoolId: school.id, title, category, startsOn: d(addDays(base, from)), endsOn: d(addDays(base, to)), status, publishedAt: status === 'PUBLISHED' ? new Date() : null, createdById: admin.id },
      });
    }
  }

  // Staf non-guru dengan jadwal tugas 7 hari mulai hari ini (ADR 0004).
  await employee('P-005', 'Staf Tata Usaha', 'Staf Tata Usaha', false, 'staf@smartschool.test', ['STAFF']);
  const stafId = await emp('P-005');
  if (!(await prisma.workShift.findFirst({ where: { employeeId: stafId } }))) {
    const tz = school.timezone;
    const start = todayIn(tz);
    const gate = await prisma.room.findFirst({ where: { code: 'A-TU', floor: { building: { schoolId: school.id } } } });
    const lib = await prisma.room.findFirst({ where: { code: 'B-PUS', floor: { building: { schoolId: school.id } } } });
    for (let i = 0; i < 7; i++) {
      const day = addDays(start, i);
      const shifts: [string, string, string, string | null][] = [
        ['Layanan tata usaha', '07:00', '12:00', gate?.id ?? null],
        ['Jaga perpustakaan', '12:30', '15:00', lib?.id ?? null],
      ];
      for (const [title, from, to, roomId] of shifts) {
        await prisma.workShift.create({ data: { schoolId: school.id, employeeId: stafId, title, startsAt: atTimeIn(day, from, tz), endsAt: atTimeIn(day, to, tz), roomId, createdById: admin.id } });
      }
    }
    // Guru piket gerbang hari ini.
    await prisma.workShift.create({ data: { schoolId: school.id, employeeId: guruId, title: 'Piket gerbang pagi', startsAt: atTimeIn(start, '06:30', tz), endsAt: atTimeIn(start, '07:00', tz), roomId: null, createdById: admin.id } });
  }
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
