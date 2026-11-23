import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  ClassTimetable,
  ScheduleExceptionSchema,
  ScheduleExceptionView,
  PublishedTimetable,
  TimetableConflict,
  TimetableSlotSchema,
  TimetableSlotView,
  TimetableVersionView,
} from '@smart-school/contracts';
import { WEEKDAY_LABELS } from '@smart-school/contracts';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service.js';
import type { AuthContext } from '../auth/auth.types.js';
import { conflict, validationFailed } from '../common/api-exception.filter.js';
import { fromDbDate, toDbDate } from '../common/dates.js';
import type { RequestMeta } from '../common/request-meta.js';
import { isoDayOfWeek } from '../common/school-time.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export const SLOT_INCLUDE = {
  room: { select: { id: true, code: true } },
  teachingAssignment: {
    select: {
      id: true,
      employeeId: true,
      subject: { select: { code: true, name: true } },
      classGroup: { select: { id: true, code: true } },
      employee: { select: { id: true, person: { select: { fullName: true } } } },
    },
  },
} satisfies Prisma.TimetableSlotInclude;
export type SlotRow = Prisma.TimetableSlotGetPayload<{ include: typeof SLOT_INCLUDE }>;

export function slotView(s: SlotRow): TimetableSlotView {
  const ta = s.teachingAssignment;
  return {
    id: s.id,
    weekday: s.weekday,
    startTime: s.startTime,
    endTime: s.endTime,
    teachingAssignmentId: ta.id,
    subject: ta.subject,
    classGroup: ta.classGroup,
    employee: { id: ta.employee.id, fullName: ta.employee.person.fullName },
    room: s.room,
  };
}

const sortSlots = (a: { weekday: number; startTime: string }, b: { weekday: number; startTime: string }) =>
  a.weekday - b.weekday || a.startTime.localeCompare(b.startTime);
const overlaps = (a: { weekday: number; startTime: string; endTime: string }, b: { weekday: number; startTime: string; endTime: string }) =>
  a.weekday === b.weekday && a.startTime < b.endTime && b.startTime < a.endTime;

@Injectable()
export class TimetableService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async findTermAndClass(auth: AuthContext, termId: string, classGroupId: string) {
    const [term, cls] = await Promise.all([
      this.prisma.term.findFirst({ where: { id: termId, academicYear: { schoolId: auth.schoolId } }, include: { academicYear: { select: { name: true } } } }),
      this.prisma.classGroup.findFirst({ where: { id: classGroupId, schoolId: auth.schoolId }, select: { id: true, code: true, academicYearId: true } }),
    ]);
    if (!term) throw new NotFoundException('Semester tidak ditemukan.');
    if (!cls) throw new NotFoundException('Rombel tidak ditemukan.');
    if (cls.academicYearId !== term.academicYearId) throw validationFailed('Rombel dan semester harus di tahun ajaran yang sama.', { classGroupId: ['Beda tahun ajaran.'] });
    return { term, cls };
  }

  private async findVersion(auth: AuthContext, id: string) {
    const v = await this.prisma.timetableVersion.findFirst({ where: { id, schoolId: auth.schoolId } });
    if (!v) throw new NotFoundException('Versi jadwal tidak ditemukan.');
    return v;
  }

  /**
   * Benturan sebuah versi: antar slot di versi itu sendiri (rombel), dan terhadap jadwal terbit rombel lain
   * di semester yang sama (guru dan ruang). Satu benturan dilaporkan sekali per slot.
   */
  async conflicts(versionId: string): Promise<TimetableConflict[]> {
    const v = await this.prisma.timetableVersion.findUniqueOrThrow({ where: { id: versionId }, include: { slots: { include: SLOT_INCLUDE } } });
    const others = await this.prisma.timetableSlot.findMany({
      where: { version: { termId: v.termId, status: 'PUBLISHED', classGroupId: { not: v.classGroupId } } },
      include: SLOT_INCLUDE,
    });
    const out: TimetableConflict[] = [];
    const push = (s: SlotRow, kind: TimetableConflict['kind'], message: string) =>
      out.push({ kind, weekday: s.weekday, startTime: s.startTime, endTime: s.endTime, slotId: s.id, message });
    const label = (s: { weekday: number; startTime: string; endTime: string }) => `${WEEKDAY_LABELS[s.weekday]} ${s.startTime}–${s.endTime}`;

    v.slots.forEach((s, i) => {
      for (const t of v.slots.slice(i + 1)) {
        if (!overlaps(s, t)) continue;
        push(t, 'class', `${s.teachingAssignment.classGroup.code} sudah ada ${s.teachingAssignment.subject.name} pada ${label(t)}.`);
      }
      for (const t of others) {
        if (!overlaps(s, t)) continue;
        if (t.teachingAssignment.employeeId === s.teachingAssignment.employeeId) {
          push(s, 'teacher', `${s.teachingAssignment.employee.person.fullName} sudah mengajar ${t.teachingAssignment.classGroup.code} pada ${label(t)}.`);
        }
        if (s.roomId && t.roomId === s.roomId) {
          push(s, 'room', `Ruang ${s.room?.code} dipakai ${t.teachingAssignment.classGroup.code} pada ${label(t)}.`);
        }
      }
    });
    return out;
  }

  private async versionView(id: string, withConflicts: boolean): Promise<TimetableVersionView> {
    const v = await this.prisma.timetableVersion.findUniqueOrThrow({ where: { id }, include: { slots: { include: SLOT_INCLUDE } } });
    return {
      id: v.id,
      versionNo: v.versionNo,
      status: v.status,
      effectiveFrom: v.effectiveFrom ? fromDbDate(v.effectiveFrom) : null,
      publishedAt: v.publishedAt?.toISOString() ?? null,
      slots: v.slots.map(slotView).sort(sortSlots),
      conflicts: withConflicts ? await this.conflicts(v.id) : [],
    };
  }

  async get(auth: AuthContext, termId: string, classGroupId: string): Promise<ClassTimetable> {
    const { term, cls } = await this.findTermAndClass(auth, termId, classGroupId);
    const [draft, published, periods] = await Promise.all([
      this.prisma.timetableVersion.findFirst({ where: { termId, classGroupId, status: 'DRAFT' }, select: { id: true } }),
      this.prisma.timetableVersion.findFirst({ where: { termId, classGroupId, status: 'PUBLISHED' }, select: { id: true } }),
      this.prisma.lessonPeriod.findMany({ where: { schoolId: auth.schoolId }, orderBy: { sequence: 'asc' }, select: { sequence: true, startTime: true, endTime: true } }),
    ]);
    return {
      term: { id: term.id, name: term.name, academicYearName: term.academicYear.name },
      classGroup: { id: cls.id, code: cls.code },
      periods,
      draft: draft ? await this.versionView(draft.id, true) : null,
      published: published ? await this.versionView(published.id, false) : null,
    };
  }

  /** Membuat draf baru. Bila sudah ada versi terbit, slotnya disalin agar perubahan dimulai dari jadwal yang berlaku. */
  async createDraft(auth: AuthContext, termId: string, classGroupId: string, meta: RequestMeta) {
    await this.findTermAndClass(auth, termId, classGroupId);
    if (await this.prisma.timetableVersion.findFirst({ where: { termId, classGroupId, status: 'DRAFT' } })) throw conflict('Rombel ini sudah punya draf jadwal.');
    const last = await this.prisma.timetableVersion.findFirst({ where: { termId, classGroupId }, orderBy: { versionNo: 'desc' } });
    const published = await this.prisma.timetableVersion.findFirst({ where: { termId, classGroupId, status: 'PUBLISHED' }, include: { slots: true } });
    const v = await this.prisma.$transaction(async (tx) => {
      const created = await tx.timetableVersion.create({
        data: {
          schoolId: auth.schoolId,
          termId,
          classGroupId,
          versionNo: (last?.versionNo ?? 0) + 1,
          createdById: auth.userId,
          slots: published
            ? { create: published.slots.map((s) => ({ teachingAssignmentId: s.teachingAssignmentId, roomId: s.roomId, weekday: s.weekday, startTime: s.startTime, endTime: s.endTime })) }
            : undefined,
        },
      });
      await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'timetable.draft_create', entityType: 'timetable_version', entityId: created.id, requestId: meta.requestId, metadata: { termId, classGroupId, versionNo: created.versionNo } }, tx);
      return created;
    });
    return { id: v.id };
  }

  private async draftOrThrow(auth: AuthContext, versionId: string) {
    const v = await this.findVersion(auth, versionId);
    if (v.status !== 'DRAFT') throw conflict('Hanya draf yang bisa diubah. Buat draf baru untuk mengubah jadwal terbit.');
    return v;
  }

  async addSlot(auth: AuthContext, versionId: string, input: z.infer<typeof TimetableSlotSchema>, meta: RequestMeta) {
    const v = await this.draftOrThrow(auth, versionId);
    const ta = await this.prisma.teachingAssignment.findFirst({ where: { id: input.teachingAssignmentId, schoolId: auth.schoolId } });
    if (!ta || ta.termId !== v.termId || ta.classGroupId !== v.classGroupId) {
      throw validationFailed('Penugasan harus untuk rombel dan semester jadwal ini.', { teachingAssignmentId: ['Penugasan tidak cocok.'] });
    }
    if (input.roomId && !(await this.prisma.room.findFirst({ where: { id: input.roomId, floor: { building: { schoolId: auth.schoolId } } } }))) {
      throw validationFailed('Ruang tidak ditemukan.', { roomId: ['Ruang tidak ditemukan.'] });
    }
    const s = await this.prisma.timetableSlot.create({ data: { versionId, ...input } });
    await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'timetable.slot_add', entityType: 'timetable_version', entityId: versionId, requestId: meta.requestId, metadata: input });
    return { id: s.id };
  }

  async removeSlot(auth: AuthContext, slotId: string, meta: RequestMeta) {
    const s = await this.prisma.timetableSlot.findFirst({ where: { id: slotId, version: { schoolId: auth.schoolId } } });
    if (!s) throw new NotFoundException('Slot tidak ditemukan.');
    await this.draftOrThrow(auth, s.versionId);
    await this.prisma.timetableSlot.delete({ where: { id: slotId } });
    await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'timetable.slot_remove', entityType: 'timetable_version', entityId: s.versionId, requestId: meta.requestId, metadata: { weekday: s.weekday, startTime: s.startTime } });
  }

  async discardDraft(auth: AuthContext, versionId: string, meta: RequestMeta) {
    const v = await this.draftOrThrow(auth, versionId);
    await this.prisma.timetableVersion.delete({ where: { id: v.id } });
    await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'timetable.draft_discard', entityType: 'timetable_version', entityId: v.id, requestId: meta.requestId });
  }

  /** Terbitkan draf: ditolak bila masih ada benturan. Versi terbit lama menjadi SUPERSEDED (tidak dihapus). */
  async publish(auth: AuthContext, versionId: string, effectiveFrom: string, meta: RequestMeta) {
    const v = await this.draftOrThrow(auth, versionId);
    const term = await this.prisma.term.findUniqueOrThrow({ where: { id: v.termId } });
    if (effectiveFrom < fromDbDate(term.startDate) || effectiveFrom > fromDbDate(term.endDate)) {
      throw validationFailed('Tanggal berlaku harus di dalam semester.', { effectiveFrom: ['Di luar semester.'] });
    }
    const found = await this.conflicts(v.id);
    if (found.length) throw conflict(`Masih ada ${found.length} benturan jadwal. Selesaikan dulu sebelum menerbitkan.`, { conflicts: found.map((c) => c.message) });
    await this.prisma.$transaction(async (tx) => {
      await tx.timetableVersion.updateMany({ where: { termId: v.termId, classGroupId: v.classGroupId, status: 'PUBLISHED' }, data: { status: 'SUPERSEDED' } });
      await tx.timetableVersion.update({ where: { id: v.id }, data: { status: 'PUBLISHED', publishedAt: new Date(), publishedById: auth.userId, effectiveFrom: toDbDate(effectiveFrom) } });
      await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'timetable.publish', entityType: 'timetable_version', entityId: v.id, requestId: meta.requestId, metadata: { versionNo: v.versionNo, effectiveFrom } }, tx);
    });
  }

  // ───────────── Jadwal terbit untuk portal ─────────────

  /** Semester yang memuat tanggal tertentu (tahun ajaran aktif). */
  async termOn(schoolId: string, date: string) {
    const d = toDbDate(date);
    return this.prisma.term.findFirst({ where: { academicYear: { schoolId }, startDate: { lte: d }, endDate: { gte: d } }, select: { id: true, name: true } });
  }

  private async published(schoolId: string, date: string, where: Prisma.TimetableSlotWhereInput): Promise<PublishedTimetable> {
    const term = await this.termOn(schoolId, date);
    const periods = await this.prisma.lessonPeriod.findMany({ where: { schoolId }, orderBy: { sequence: 'asc' }, select: { sequence: true, startTime: true, endTime: true } });
    if (!term) return { term: null, periods, slots: [] };
    const slots = await this.prisma.timetableSlot.findMany({ where: { AND: [where, { version: { termId: term.id, status: 'PUBLISHED' } }] }, include: SLOT_INCLUDE });
    return { term, periods, slots: slots.map(slotView).sort(sortSlots) };
  }

  forClass(schoolId: string, classGroupId: string, date: string) {
    return this.published(schoolId, date, { version: { classGroupId } });
  }

  forEmployee(schoolId: string, employeeId: string, date: string) {
    return this.published(schoolId, date, { teachingAssignment: { employeeId } });
  }

  /** Jadwal terbit dilihat dari sisi guru atau ruang (FR-5.6). Default semester yang memuat hari ini. */
  async lens(auth: AuthContext, q: { termId?: string; employeeId?: string; roomId?: string }, today: string): Promise<PublishedTimetable> {
    const term = q.termId
      ? await this.prisma.term.findFirst({ where: { id: q.termId, academicYear: { schoolId: auth.schoolId } }, select: { id: true, name: true } })
      : await this.termOn(auth.schoolId, today);
    const periods = await this.prisma.lessonPeriod.findMany({ where: { schoolId: auth.schoolId }, orderBy: { sequence: 'asc' }, select: { sequence: true, startTime: true, endTime: true } });
    if (!term) return { term: null, periods, slots: [] };
    const slots = await this.prisma.timetableSlot.findMany({
      where: { version: { termId: term.id, status: 'PUBLISHED', schoolId: auth.schoolId }, ...(q.employeeId ? { teachingAssignment: { employeeId: q.employeeId } } : { roomId: q.roomId }) },
      include: SLOT_INCLUDE,
    });
    return { term, periods, slots: slots.map(slotView).sort(sortSlots) };
  }

  // ───────────── Pengecualian jadwal (FR-5.5) ─────────────

  async exceptions(auth: AuthContext, q: { from: string; to: string; classGroupId?: string }): Promise<ScheduleExceptionView[]> {
    const rows = await this.prisma.scheduleException.findMany({
      where: { schoolId: auth.schoolId, exceptionDate: { gte: toDbDate(q.from), lte: toDbDate(q.to) }, ...(q.classGroupId ? { timetableSlot: { version: { classGroupId: q.classGroupId } } } : {}) },
      include: {
        room: { select: { id: true, code: true } },
        substituteEmployee: { select: { id: true, person: { select: { fullName: true } } } },
        timetableSlot: { include: SLOT_INCLUDE },
      },
      orderBy: [{ exceptionDate: 'asc' }, { timetableSlot: { startTime: 'asc' } }],
    });
    return rows.map((e) => {
      const v = slotView(e.timetableSlot);
      return {
        id: e.id,
        date: fromDbDate(e.exceptionDate),
        kind: e.kind,
        timetableSlotId: v.id,
        weekday: v.weekday,
        startTime: v.startTime,
        endTime: v.endTime,
        classGroup: v.classGroup,
        subject: v.subject,
        employee: v.employee,
        substitute: e.substituteEmployee ? { id: e.substituteEmployee.id, fullName: e.substituteEmployee.person.fullName } : null,
        room: e.room,
        reason: e.reason,
      };
    });
  }

  /**
   * Membatalkan atau mengganti guru/ruang satu pertemuan pada satu tanggal. Jadwal mingguan tidak berubah.
   * Ditolak bila sesi absensi pertemuan itu sudah dibuka, atau guru/ruang pengganti bentrok pada jam itu.
   */
  async createException(auth: AuthContext, slotId: string, input: z.infer<typeof ScheduleExceptionSchema>, meta: RequestMeta) {
    const slot = await this.prisma.timetableSlot.findFirst({ where: { id: slotId, version: { schoolId: auth.schoolId } }, include: { version: { include: { term: true } } } });
    if (!slot || slot.version.status !== 'PUBLISHED') throw new NotFoundException('Pertemuan tidak ditemukan pada jadwal terbit.');
    if (isoDayOfWeek(input.date) !== slot.weekday) throw validationFailed('Tanggal tidak sesuai dengan hari pertemuan.', { date: [`Harus hari ${WEEKDAY_LABELS[slot.weekday]}.`] });
    if (input.date < fromDbDate(slot.version.term.startDate) || input.date > fromDbDate(slot.version.term.endDate)) throw validationFailed('Tanggal di luar semester.', { date: ['Di luar semester.'] });
    if (await this.prisma.studentAttendanceSession.findFirst({ where: { timetableSlotId: slotId, sessionDate: toDbDate(input.date), status: { not: 'CANCELLED' } } })) {
      throw conflict('Sesi absensi pertemuan ini sudah dibuka. Batalkan sesinya dulu bila pertemuan tidak berlangsung.');
    }
    if (await this.prisma.scheduleException.findUnique({ where: { timetableSlotId_exceptionDate: { timetableSlotId: slotId, exceptionDate: toDbDate(input.date) } } })) {
      throw conflict('Pertemuan ini sudah punya perubahan pada tanggal tersebut. Hapus dulu bila ingin mengganti.');
    }
    const fe: Record<string, string[]> = {};
    const busy = { weekday: slot.weekday, startTime: { lt: slot.endTime }, endTime: { gt: slot.startTime }, version: { termId: slot.version.termId, status: 'PUBLISHED' as const } };
    if (input.kind === 'SUBSTITUTED') {
      if (input.substituteEmployeeId) {
        const t = await this.prisma.employee.findFirst({ where: { id: input.substituteEmployeeId, schoolId: auth.schoolId, isTeacher: true, status: 'ACTIVE' } });
        if (!t) fe.substituteEmployeeId = ['Guru pengganti harus guru aktif.'];
        else if (await this.prisma.timetableSlot.findFirst({ where: { ...busy, teachingAssignment: { employeeId: t.id } } })) fe.substituteEmployeeId = ['Guru pengganti sedang mengajar pada jam ini.'];
      }
      if (input.roomId) {
        if (!(await this.prisma.room.findFirst({ where: { id: input.roomId, floor: { building: { schoolId: auth.schoolId } } } }))) fe.roomId = ['Ruang tidak ditemukan.'];
        else if (await this.prisma.timetableSlot.findFirst({ where: { ...busy, roomId: input.roomId, id: { not: slotId } } })) fe.roomId = ['Ruang dipakai rombel lain pada jam ini.'];
      }
    }
    if (Object.keys(fe).length) throw validationFailed('Periksa kembali isian yang ditandai.', fe);
    const e = await this.prisma.scheduleException.create({
      data: {
        schoolId: auth.schoolId,
        timetableSlotId: slotId,
        exceptionDate: toDbDate(input.date),
        kind: input.kind,
        substituteEmployeeId: input.kind === 'SUBSTITUTED' ? (input.substituteEmployeeId ?? null) : null,
        roomId: input.kind === 'SUBSTITUTED' ? (input.roomId ?? null) : null,
        reason: input.reason,
        createdById: auth.userId,
      },
    });
    await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'timetable.exception_create', entityType: 'schedule_exception', entityId: e.id, requestId: meta.requestId, metadata: { slotId, ...input } });
    return { id: e.id };
  }

  async deleteException(auth: AuthContext, id: string, meta: RequestMeta) {
    const e = await this.prisma.scheduleException.findFirst({ where: { id, schoolId: auth.schoolId } });
    if (!e) throw new NotFoundException('Perubahan jadwal tidak ditemukan.');
    if (await this.prisma.studentAttendanceSession.findFirst({ where: { timetableSlotId: e.timetableSlotId, sessionDate: e.exceptionDate, status: { not: 'CANCELLED' } } })) {
      throw conflict('Sesi absensi pertemuan ini sudah dibuka oleh guru pengganti.');
    }
    await this.prisma.scheduleException.delete({ where: { id } });
    await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'timetable.exception_delete', entityType: 'schedule_exception', entityId: id, requestId: meta.requestId, metadata: { kind: e.kind, date: fromDbDate(e.exceptionDate) } });
  }
}
