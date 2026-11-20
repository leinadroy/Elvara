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

  console.log(`Seed selesai: ${school.name}. Akun contoh memakai kata sandi dari prisma/seed.ts (DEV_PASSWORD).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
