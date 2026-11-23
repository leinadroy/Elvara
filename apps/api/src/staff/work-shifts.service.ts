import { Injectable, NotFoundException } from '@nestjs/common';
import type { WorkShiftOptions, WorkShiftSchema, WorkShiftView } from '@smart-school/contracts';
import type { z } from 'zod';
import { ScopeService } from '../academics/scope.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AuthContext } from '../auth/auth.types.js';
import { conflict, validationFailed } from '../common/api-exception.filter.js';
import type { RequestMeta } from '../common/request-meta.js';
import { addDays, atTimeIn, localParts, todayIn } from '../common/school-time.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

const INCLUDE = {
  employee: { select: { id: true, position: true, person: { select: { fullName: true } } } },
  room: { select: { id: true, code: true, name: true } },
} satisfies Prisma.WorkShiftInclude;
type Row = Prisma.WorkShiftGetPayload<{ include: typeof INCLUDE }>;

/**
 * Jadwal tugas staf (ADR 0004, FR-8.5): admin mengisi tugas per tanggal; staf melihat tugasnya sendiri.
 * Tugas terjadwal yang bentrok untuk pegawai yang sama ditolak. Tugas dibatalkan dengan alasan, tidak dihapus.
 */
@Injectable()
export class WorkShiftsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly scope: ScopeService,
  ) {}

  private async tz(schoolId: string) {
    return (await this.prisma.school.findUniqueOrThrow({ where: { id: schoolId }, select: { timezone: true } })).timezone;
  }

  private view(r: Row, tz: string): WorkShiftView {
    const start = localParts(r.startsAt, tz);
    const end = localParts(r.endsAt, tz);
    return {
      id: r.id,
      employee: { id: r.employee.id, fullName: r.employee.person.fullName, position: r.employee.position },
      title: r.title,
      date: start.date,
      startTime: start.time,
      endTime: end.time,
      room: r.room,
      status: r.status,
      note: r.note,
      cancelReason: r.cancelReason,
    };
  }

  /** Rentang tanggal lokal [from, to] → batas UTC. */
  private range(from: string, to: string, tz: string) {
    return { gte: atTimeIn(from, '00:00', tz), lt: atTimeIn(addDays(to, 1), '00:00', tz) };
  }

  async options(auth: AuthContext): Promise<WorkShiftOptions> {
    const [employees, rooms] = await Promise.all([
      this.prisma.employee.findMany({
        where: { schoolId: auth.schoolId, status: 'ACTIVE' },
        select: { id: true, position: true, isTeacher: true, person: { select: { fullName: true } } },
        orderBy: { person: { fullName: 'asc' } },
      }),
      this.prisma.room.findMany({ where: { isActive: true, floor: { building: { schoolId: auth.schoolId } } }, select: { id: true, code: true, name: true }, orderBy: { code: 'asc' } }),
    ]);
    return { employees: employees.map((e) => ({ id: e.id, fullName: e.person.fullName, position: e.position, isTeacher: e.isTeacher })), rooms };
  }

  async list(auth: AuthContext, q: { from: string; to: string; employeeId?: string }): Promise<WorkShiftView[]> {
    if (addDays(q.from, 62) < q.to) throw validationFailed('Rentang maksimal dua bulan.', { to: ['Terlalu panjang.'] });
    const tz = await this.tz(auth.schoolId);
    const rows = await this.prisma.workShift.findMany({
      where: { schoolId: auth.schoolId, employeeId: q.employeeId, startsAt: this.range(q.from, q.to, tz) },
      include: INCLUDE,
      orderBy: [{ startsAt: 'asc' }, { employee: { person: { fullName: 'asc' } } }],
    });
    return rows.map((r) => this.view(r, tz));
  }

  /** Tugas milik pegawai yang sedang masuk. Default hari ini sampai 14 hari ke depan. */
  async mine(auth: AuthContext, q: { from?: string; to?: string }) {
    const emp = await this.scope.employee(auth);
    const tz = await this.tz(auth.schoolId);
    const from = q.from ?? todayIn(tz);
    const to = q.to ?? addDays(from, 14);
    if (!emp) return { from, to, items: [] as WorkShiftView[] };
    if (addDays(from, 62) < to) throw validationFailed('Rentang maksimal dua bulan.', { to: ['Terlalu panjang.'] });
    const rows = await this.prisma.workShift.findMany({ where: { employeeId: emp.id, startsAt: this.range(from, to, tz) }, include: INCLUDE, orderBy: { startsAt: 'asc' } });
    return { from, to, items: rows.map((r) => this.view(r, tz)) };
  }

  async create(auth: AuthContext, input: z.infer<typeof WorkShiftSchema>, meta: RequestMeta) {
    const tz = await this.tz(auth.schoolId);
    const fe: Record<string, string[]> = {};
    const emp = await this.prisma.employee.findFirst({ where: { id: input.employeeId, schoolId: auth.schoolId }, select: { id: true, status: true } });
    if (!emp || emp.status !== 'ACTIVE') fe.employeeId = ['Pegawai tidak ditemukan atau tidak aktif.'];
    if (input.roomId && !(await this.prisma.room.findFirst({ where: { id: input.roomId, floor: { building: { schoolId: auth.schoolId } } } }))) fe.roomId = ['Lokasi tidak ditemukan.'];
    if (Object.keys(fe).length) throw validationFailed('Periksa kembali isian yang ditandai.', fe);
    const startsAt = atTimeIn(input.date, input.startTime, tz);
    const endsAt = atTimeIn(input.date, input.endTime, tz);
    const clash = await this.prisma.workShift.findFirst({
      where: { employeeId: input.employeeId, status: 'SCHEDULED', startsAt: { lt: endsAt }, endsAt: { gt: startsAt } },
      include: INCLUDE,
    });
    if (clash) {
      const c = this.view(clash, tz);
      throw conflict(`Bentrok dengan tugas "${c.title}" ${c.startTime}–${c.endTime} pada tanggal yang sama.`, { startTime: ['Bentrok dengan tugas lain.'] });
    }
    const row = await this.prisma.workShift.create({
      data: { schoolId: auth.schoolId, employeeId: input.employeeId, title: input.title, startsAt, endsAt, roomId: input.roomId ?? null, note: input.note ?? null, createdById: auth.userId },
    });
    await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'work_shift.create', entityType: 'work_shift', entityId: row.id, requestId: meta.requestId, metadata: input });
    return { id: row.id };
  }

  async cancel(auth: AuthContext, id: string, reason: string, meta: RequestMeta) {
    const row = await this.prisma.workShift.findFirst({ where: { id, schoolId: auth.schoolId } });
    if (!row) throw new NotFoundException('Tugas tidak ditemukan.');
    if (row.status === 'CANCELLED') throw conflict('Tugas sudah dibatalkan.');
    await this.prisma.workShift.update({ where: { id }, data: { status: 'CANCELLED', cancelReason: reason } });
    await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'work_shift.cancel', entityType: 'work_shift', entityId: id, requestId: meta.requestId, metadata: { reason } });
  }

  /** Jumlah tugas terjadwal pegawai pada hari ini (untuk angka beranda). */
  async todayCount(auth: AuthContext): Promise<{ count: number; employee: boolean }> {
    const emp = await this.scope.employee(auth);
    if (!emp) return { count: 0, employee: false };
    const tz = await this.tz(auth.schoolId);
    const today = todayIn(tz);
    const count = await this.prisma.workShift.count({ where: { employeeId: emp.id, status: 'SCHEDULED', startsAt: this.range(today, today, tz) } });
    return { count, employee: true };
  }
}
