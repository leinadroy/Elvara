import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  AcademicOptions,
  AssignHomeroomSchema,
  ClassGroupDetail,
  ClassGroupListItem,
  ClassGroupSchema,
  EnrollResult,
  GradeLevelSchema,
  GradeLevelView,
  ProgramSchema,
  ProgramView,
  UpdateClassGroupSchema,
} from '@smart-school/contracts';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service.js';
import type { AuthContext } from '../auth/auth.types.js';
import { conflict, validationFailed } from '../common/api-exception.filter.js';
import { fromDbDate, toDbDate } from '../common/dates.js';
import type { RequestMeta } from '../common/request-meta.js';
import { addDays, todayIn } from '../common/school-time.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** Rentang berlaku pada tanggal tertentu (validTo inklusif). Dipakai untuk penempatan dan wali kelas. */
export function validOn(date: string) {
  const d = toDbDate(date);
  return { validFrom: { lte: d }, OR: [{ validTo: null }, { validTo: { gte: d } }] };
}
/** Penempatan yang berlaku pada tanggal tertentu. */
export function activeOn(date: string): Prisma.EnrollmentWhereInput {
  return validOn(date);
}

const CLASS_INCLUDE = {
  academicYear: { select: { id: true, name: true, startDate: true, endDate: true, status: true } },
  gradeLevel: { select: { id: true, code: true, name: true } },
  program: { select: { id: true, code: true } },
  mainRoom: { select: { id: true, code: true, name: true } },
  homeroomAssignments: {
    orderBy: { validFrom: 'desc' },
    include: { employee: { select: { id: true, person: { select: { fullName: true } } } } },
  },
} satisfies Prisma.ClassGroupInclude;
type ClassRow = Prisma.ClassGroupGetPayload<{ include: typeof CLASS_INCLUDE }>;

@Injectable()
export class ClassesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async tz(schoolId: string) {
    return (await this.prisma.school.findUniqueOrThrow({ where: { id: schoolId }, select: { timezone: true } })).timezone;
  }

  async today(auth: AuthContext) {
    return todayIn(await this.tz(auth.schoolId));
  }

  async options(auth: AuthContext): Promise<AcademicOptions> {
    const today = await this.today(auth);
    const year = await this.prisma.academicYear.findFirst({ where: { schoolId: auth.schoolId, status: 'ACTIVE' }, include: { terms: { orderBy: { sequence: 'asc' } } } });
    const [teachers, rooms, gradeLevels, programs, subjects] = await Promise.all([
      this.prisma.employee.findMany({ where: { schoolId: auth.schoolId, isTeacher: true, status: 'ACTIVE' }, select: { id: true, person: { select: { fullName: true } } }, orderBy: { person: { fullName: 'asc' } } }),
      this.prisma.room.findMany({ where: { isActive: true, floor: { building: { schoolId: auth.schoolId } } }, select: { id: true, code: true, name: true }, orderBy: { code: 'asc' } }),
      this.prisma.gradeLevel.findMany({ where: { schoolId: auth.schoolId }, select: { id: true, code: true, name: true }, orderBy: { ordinal: 'asc' } }),
      this.prisma.program.findMany({ where: { schoolId: auth.schoolId, status: 'ACTIVE' }, select: { id: true, code: true, name: true }, orderBy: { code: 'asc' } }),
      this.prisma.subject.findMany({ where: { schoolId: auth.schoolId, status: 'ACTIVE' }, select: { id: true, code: true, name: true }, orderBy: { name: 'asc' } }),
    ]);
    return {
      academicYear: year ? { id: year.id, name: year.name, startDate: fromDbDate(year.startDate), endDate: fromDbDate(year.endDate) } : null,
      terms: (year?.terms ?? []).map((t) => {
        const startDate = fromDbDate(t.startDate);
        const endDate = fromDbDate(t.endDate);
        return { id: t.id, name: t.name, startDate, endDate, current: startDate <= today && today <= endDate };
      }),
      teachers: teachers.map((t) => ({ id: t.id, fullName: t.person.fullName })),
      rooms,
      gradeLevels,
      programs,
      subjects,
    };
  }

  // ───────────── Tingkat & program ─────────────

  async gradeLevels(auth: AuthContext): Promise<GradeLevelView[]> {
    const rows = await this.prisma.gradeLevel.findMany({
      where: { schoolId: auth.schoolId },
      orderBy: { ordinal: 'asc' },
      include: { _count: { select: { classGroups: true } } },
    });
    return rows.map((g) => ({ id: g.id, code: g.code, ordinal: g.ordinal, name: g.name, classCount: g._count.classGroups }));
  }

  async saveGradeLevel(auth: AuthContext, id: string | null, input: z.infer<typeof GradeLevelSchema>, meta: RequestMeta) {
    const clash = await this.prisma.gradeLevel.findFirst({
      where: { schoolId: auth.schoolId, id: id ? { not: id } : undefined, OR: [{ code: input.code }, { ordinal: input.ordinal }] },
    });
    if (clash) {
      throw conflict('Kode atau urutan tingkat sudah dipakai.', clash.code === input.code ? { code: ['Kode tingkat sudah ada.'] } : { ordinal: ['Urutan sudah dipakai.'] });
    }
    if (id && !(await this.prisma.gradeLevel.findFirst({ where: { id, schoolId: auth.schoolId } }))) throw new NotFoundException('Tingkat tidak ditemukan.');
    const row = id
      ? await this.prisma.gradeLevel.update({ where: { id }, data: input })
      : await this.prisma.gradeLevel.create({ data: { ...input, schoolId: auth.schoolId } });
    await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: id ? 'grade_level.update' : 'grade_level.create', entityType: 'grade_level', entityId: row.id, requestId: meta.requestId, metadata: input });
    return { id: row.id };
  }

  async programs(auth: AuthContext): Promise<ProgramView[]> {
    return this.prisma.program.findMany({ where: { schoolId: auth.schoolId }, orderBy: { code: 'asc' }, select: { id: true, code: true, name: true, status: true } });
  }

  async saveProgram(auth: AuthContext, id: string | null, input: z.infer<typeof ProgramSchema>, meta: RequestMeta) {
    const clash = await this.prisma.program.findFirst({ where: { schoolId: auth.schoolId, code: input.code, id: id ? { not: id } : undefined } });
    if (clash) throw conflict('Kode program sudah dipakai.', { code: ['Kode program sudah dipakai.'] });
    if (id && !(await this.prisma.program.findFirst({ where: { id, schoolId: auth.schoolId } }))) throw new NotFoundException('Program tidak ditemukan.');
    const row = id ? await this.prisma.program.update({ where: { id }, data: input }) : await this.prisma.program.create({ data: { ...input, schoolId: auth.schoolId } });
    await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: id ? 'program.update' : 'program.create', entityType: 'program', entityId: row.id, requestId: meta.requestId, metadata: input });
    return { id: row.id };
  }

  // ───────────── Rombel ─────────────

  private currentHomeroom(c: ClassRow, today: string) {
    const h = c.homeroomAssignments.find((a) => fromDbDate(a.validFrom) <= today && (!a.validTo || fromDbDate(a.validTo) >= today));
    return h ? { id: h.employee.id, fullName: h.employee.person.fullName } : null;
  }

  private listItem(c: ClassRow, activeCount: number, today: string): ClassGroupListItem {
    return {
      id: c.id,
      code: c.code,
      status: c.status,
      academicYear: { id: c.academicYear.id, name: c.academicYear.name },
      gradeLevel: c.gradeLevel,
      program: c.program,
      homeroom: this.currentHomeroom(c, today),
      mainRoom: c.mainRoom,
      capacity: c.capacity,
      activeCount,
    };
  }

  private async activeCounts(classIds: string[], date: string) {
    const rows = await this.prisma.enrollment.groupBy({ by: ['classGroupId'], where: { classGroupId: { in: classIds }, ...activeOn(date) }, _count: true });
    return new Map(rows.map((r) => [r.classGroupId, r._count]));
  }

  async list(auth: AuthContext, academicYearId?: string): Promise<ClassGroupListItem[]> {
    const yearId =
      academicYearId ?? (await this.prisma.academicYear.findFirst({ where: { schoolId: auth.schoolId, status: 'ACTIVE' }, select: { id: true } }))?.id;
    if (!yearId) return [];
    const rows = await this.prisma.classGroup.findMany({
      where: { schoolId: auth.schoolId, academicYearId: yearId },
      include: CLASS_INCLUDE,
      orderBy: [{ gradeLevel: { ordinal: 'asc' } }, { code: 'asc' }],
    });
    const today = await this.today(auth);
    const counts = await this.activeCounts(rows.map((r) => r.id), today);
    return rows.map((r) => this.listItem(r, counts.get(r.id) ?? 0, today));
  }

  private async findClass(auth: AuthContext, id: string) {
    const c = await this.prisma.classGroup.findFirst({ where: { id, schoolId: auth.schoolId }, include: CLASS_INCLUDE });
    if (!c) throw new NotFoundException('Rombel tidak ditemukan.');
    return c;
  }

  async get(auth: AuthContext, id: string): Promise<ClassGroupDetail> {
    const c = await this.findClass(auth, id);
    const today = await this.today(auth);
    const enrollments = await this.prisma.enrollment.findMany({
      where: { classGroupId: id },
      include: { student: { include: { person: { select: { fullName: true } } } } },
      orderBy: [{ student: { person: { fullName: 'asc' } } }, { validFrom: 'desc' }],
    });
    const active = enrollments.filter((e) => fromDbDate(e.validFrom) <= today && (!e.validTo || fromDbDate(e.validTo) >= today));
    return {
      ...this.listItem(c, active.length, today),
      enrollments: enrollments.map((e) => ({
        id: e.id,
        studentId: e.studentId,
        fullName: e.student.person.fullName,
        nis: e.student.nis,
        validFrom: fromDbDate(e.validFrom),
        validTo: e.validTo ? fromDbDate(e.validTo) : null,
        status: e.status,
        reason: e.reason,
      })),
      homeroomHistory: c.homeroomAssignments.map((h) => ({
        id: h.id,
        employee: { id: h.employee.id, fullName: h.employee.person.fullName },
        validFrom: fromDbDate(h.validFrom),
        validTo: h.validTo ? fromDbDate(h.validTo) : null,
      })),
    };
  }

  private async validateRefs(auth: AuthContext, input: Partial<z.infer<typeof ClassGroupSchema>>) {
    const fe: Record<string, string[]> = {};
    if (input.gradeLevelId && !(await this.prisma.gradeLevel.findFirst({ where: { id: input.gradeLevelId, schoolId: auth.schoolId } }))) fe.gradeLevelId = ['Tingkat tidak ditemukan.'];
    if (input.programId && !(await this.prisma.program.findFirst({ where: { id: input.programId, schoolId: auth.schoolId } }))) fe.programId = ['Program tidak ditemukan.'];
    if (input.mainRoomId && !(await this.prisma.room.findFirst({ where: { id: input.mainRoomId, floor: { building: { schoolId: auth.schoolId } } } }))) fe.mainRoomId = ['Ruang tidak ditemukan.'];
    if (Object.keys(fe).length) throw validationFailed('Periksa kembali isian yang ditandai.', fe);
  }

  async create(auth: AuthContext, input: z.infer<typeof ClassGroupSchema>, meta: RequestMeta) {
    const year = await this.prisma.academicYear.findFirst({ where: { id: input.academicYearId, schoolId: auth.schoolId } });
    if (!year) throw validationFailed('Tahun ajaran tidak ditemukan.', { academicYearId: ['Tahun ajaran tidak ditemukan.'] });
    if (year.status === 'CLOSED') throw conflict('Tahun ajaran sudah ditutup.');
    await this.validateRefs(auth, input);
    if (await this.prisma.classGroup.findUnique({ where: { academicYearId_code: { academicYearId: year.id, code: input.code } } })) {
      throw conflict('Kode rombel sudah dipakai di tahun ajaran ini.', { code: ['Kode rombel sudah dipakai.'] });
    }
    const c = await this.prisma.classGroup.create({ data: { ...input, schoolId: auth.schoolId } });
    await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'class_group.create', entityType: 'class_group', entityId: c.id, requestId: meta.requestId, metadata: { code: c.code, academicYearId: year.id } });
    return { id: c.id };
  }

  async update(auth: AuthContext, id: string, input: z.infer<typeof UpdateClassGroupSchema>, meta: RequestMeta) {
    const c = await this.findClass(auth, id);
    await this.validateRefs(auth, input);
    if (input.code && input.code !== c.code && (await this.prisma.classGroup.findUnique({ where: { academicYearId_code: { academicYearId: c.academicYearId, code: input.code } } }))) {
      throw conflict('Kode rombel sudah dipakai di tahun ajaran ini.', { code: ['Kode rombel sudah dipakai.'] });
    }
    if (input.capacity !== undefined) {
      const count = (await this.activeCounts([id], await this.today(auth))).get(id) ?? 0;
      if (input.capacity < count) throw validationFailed(`Kapasitas tidak boleh kurang dari ${count} siswa yang sedang ditempatkan.`, { capacity: [`Minimal ${count}.`] });
    }
    await this.prisma.classGroup.update({ where: { id }, data: input });
    await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'class_group.update', entityType: 'class_group', entityId: id, requestId: meta.requestId, metadata: input });
  }

  // ───────────── Wali kelas (homeroom_assignment) ─────────────

  /** Menetapkan wali kelas mulai tanggal tertentu. Penugasan yang masih terbuka ditutup sehari sebelumnya. */
  async assignHomeroom(auth: AuthContext, classGroupId: string, input: z.infer<typeof AssignHomeroomSchema>, meta: RequestMeta) {
    const c = await this.findClass(auth, classGroupId);
    const t = await this.prisma.employee.findFirst({ where: { id: input.employeeId, schoolId: auth.schoolId } });
    if (!t || !t.isTeacher || t.status !== 'ACTIVE') throw validationFailed('Wali kelas harus guru yang aktif.', { employeeId: ['Pilih guru aktif.'] });
    const open = c.homeroomAssignments.find((h) => !h.validTo);
    if (open?.employeeId === input.employeeId) throw conflict('Guru ini sudah menjadi wali kelas rombel ini.');
    if (open && input.validFrom <= fromDbDate(open.validFrom)) {
      throw validationFailed('Tanggal mulai harus setelah tanggal mulai wali kelas sebelumnya.', { validFrom: [`Setelah ${fromDbDate(open.validFrom)}.`] });
    }
    await this.prisma.$transaction(async (tx) => {
      if (open) await tx.homeroomAssignment.update({ where: { id: open.id }, data: { validTo: toDbDate(addDays(input.validFrom, -1)) } });
      await tx.homeroomAssignment.create({ data: { classGroupId, employeeId: input.employeeId, validFrom: toDbDate(input.validFrom), createdById: auth.userId } });
      await this.audit.record(
        { schoolId: auth.schoolId, actorUserId: auth.userId, action: 'homeroom.assign', entityType: 'class_group', entityId: classGroupId, requestId: meta.requestId, metadata: { employeeId: input.employeeId, validFrom: input.validFrom, previous: open?.employeeId ?? null } },
        tx,
      );
    });
  }

  /** Rombel yang diampu pegawai sebagai wali kelas pada tanggal tertentu. */
  async homeroomClassIds(employeeId: string, date: string) {
    const rows = await this.prisma.homeroomAssignment.findMany({ where: { employeeId, ...validOn(date) }, select: { classGroupId: true } });
    return rows.map((r) => r.classGroupId);
  }

  // ───────────── Penempatan ─────────────

  /** Siswa aktif yang belum punya rombel pada tanggal tersebut di tahun ajaran yang sama. */
  async candidates(auth: AuthContext, classGroupId: string, date: string, q?: string) {
    const c = await this.findClass(auth, classGroupId);
    const placed = await this.prisma.enrollment.findMany({
      where: { classGroup: { academicYearId: c.academicYearId }, ...activeOn(date) },
      select: { studentId: true },
    });
    const students = await this.prisma.student.findMany({
      where: {
        schoolId: auth.schoolId,
        status: 'ACTIVE',
        id: { notIn: placed.map((p) => p.studentId) },
        ...(q ? { OR: [{ person: { fullName: { contains: q, mode: 'insensitive' } } }, { nis: { startsWith: q } }] } : {}),
      },
      include: { person: { select: { fullName: true } } },
      orderBy: { person: { fullName: 'asc' } },
      take: 100,
    });
    return students.map((s) => ({ id: s.id, fullName: s.person.fullName, nis: s.nis }));
  }

  /**
   * Menempatkan siswa. Ditolak per siswa bila: bukan siswa aktif, sudah punya penempatan yang beririsan,
   * atau kapasitas rombel terlampaui. Siswa lain tetap diproses.
   */
  async enroll(auth: AuthContext, classGroupId: string, studentIds: string[], validFrom: string, meta: RequestMeta): Promise<EnrollResult> {
    const c = await this.findClass(auth, classGroupId);
    if (validFrom < fromDbDate(c.academicYear.startDate) || validFrom > fromDbDate(c.academicYear.endDate)) {
      throw validationFailed('Tanggal mulai harus di dalam tahun ajaran rombel.', { validFrom: ['Di luar tahun ajaran.'] });
    }
    const unique = [...new Set(studentIds)];
    const students = await this.prisma.student.findMany({ where: { id: { in: unique }, schoolId: auth.schoolId }, include: { person: { select: { fullName: true } } } });
    const byId = new Map(students.map((s) => [s.id, s]));
    const rejected: EnrollResult['rejected'] = [];

    return this.prisma.$transaction(async (tx) => {
      let count = await tx.enrollment.count({ where: { classGroupId, ...activeOn(validFrom) } });
      let enrolled = 0;
      for (const id of unique) {
        const s = byId.get(id);
        if (!s) {
          rejected.push({ studentId: id, fullName: '?', reason: 'Siswa tidak ditemukan.' });
          continue;
        }
        if (s.status !== 'ACTIVE') {
          rejected.push({ studentId: id, fullName: s.person.fullName, reason: 'Bukan siswa aktif.' });
          continue;
        }
        const overlap = await tx.enrollment.findFirst({
          where: { studentId: id, OR: [{ validTo: null }, { validTo: { gte: toDbDate(validFrom) } }] },
          include: { classGroup: { select: { code: true } } },
        });
        if (overlap) {
          rejected.push({ studentId: id, fullName: s.person.fullName, reason: `Masih ditempatkan di ${overlap.classGroup.code}. Pindahkan atau akhiri dulu.` });
          continue;
        }
        if (count >= c.capacity) {
          rejected.push({ studentId: id, fullName: s.person.fullName, reason: `Kapasitas ${c.code} (${c.capacity}) penuh.` });
          continue;
        }
        await tx.enrollment.create({ data: { studentId: id, classGroupId, validFrom: toDbDate(validFrom), createdById: auth.userId } });
        count++;
        enrolled++;
      }
      await this.audit.record(
        { schoolId: auth.schoolId, actorUserId: auth.userId, action: 'enrollment.create', entityType: 'class_group', entityId: classGroupId, requestId: meta.requestId, metadata: { validFrom, enrolled, rejected: rejected.length } },
        tx,
      );
      return { enrolled, rejected };
    });
  }

  private async findEnrollment(auth: AuthContext, id: string) {
    const e = await this.prisma.enrollment.findFirst({ where: { id, classGroup: { schoolId: auth.schoolId } }, include: { classGroup: { include: CLASS_INCLUDE } } });
    if (!e) throw new NotFoundException('Penempatan tidak ditemukan.');
    return e;
  }

  /** Pindah kelas: penempatan lama berakhir sehari sebelum tanggal pindah (status MOVED), yang baru dimulai pada tanggal pindah. */
  async move(auth: AuthContext, enrollmentId: string, toClassGroupId: string, date: string, reason: string, meta: RequestMeta) {
    const e = await this.findEnrollment(auth, enrollmentId);
    if (e.validTo) throw conflict('Penempatan ini sudah berakhir.');
    if (date <= fromDbDate(e.validFrom)) throw validationFailed('Tanggal pindah harus setelah tanggal mulai penempatan.', { date: ['Terlalu awal.'] });
    const target = await this.findClass(auth, toClassGroupId);
    if (target.academicYearId !== e.classGroup.academicYearId) throw validationFailed('Rombel tujuan harus di tahun ajaran yang sama.', { toClassGroupId: ['Beda tahun ajaran.'] });
    if (target.id === e.classGroupId) throw validationFailed('Rombel tujuan sama dengan rombel saat ini.', { toClassGroupId: ['Pilih rombel lain.'] });
    await this.prisma.$transaction(async (tx) => {
      const count = await tx.enrollment.count({ where: { classGroupId: target.id, ...activeOn(date) } });
      if (count >= target.capacity) throw conflict(`Kapasitas ${target.code} (${target.capacity}) penuh.`);
      await tx.enrollment.update({ where: { id: e.id }, data: { validTo: toDbDate(addDays(date, -1)), status: 'MOVED', reason: `Pindah ke ${target.code}: ${reason}` } });
      await tx.enrollment.create({ data: { studentId: e.studentId, classGroupId: target.id, validFrom: toDbDate(date), createdById: auth.userId, reason: `Pindahan dari ${e.classGroup.code}` } });
      await this.audit.record(
        { schoolId: auth.schoolId, actorUserId: auth.userId, action: 'enrollment.move', entityType: 'student', entityId: e.studentId, requestId: meta.requestId, metadata: { from: e.classGroup.code, to: target.code, date, reason } },
        tx,
      );
    });
  }

  async end(auth: AuthContext, enrollmentId: string, validTo: string, reason: string, meta: RequestMeta) {
    const e = await this.findEnrollment(auth, enrollmentId);
    if (e.validTo) throw conflict('Penempatan ini sudah berakhir.');
    if (validTo < fromDbDate(e.validFrom)) throw validationFailed('Tanggal akhir sebelum tanggal mulai.', { validTo: ['Terlalu awal.'] });
    await this.prisma.$transaction(async (tx) => {
      await tx.enrollment.update({ where: { id: e.id }, data: { validTo: toDbDate(validTo), status: 'ENDED', reason } });
      await this.audit.record(
        { schoolId: auth.schoolId, actorUserId: auth.userId, action: 'enrollment.end', entityType: 'student', entityId: e.studentId, requestId: meta.requestId, metadata: { classGroup: e.classGroup.code, validTo, reason } },
        tx,
      );
    });
  }
}
