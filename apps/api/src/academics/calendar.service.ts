import { Injectable, NotFoundException } from '@nestjs/common';
import type { CalendarEventSchema, CalendarEventView } from '@smart-school/contracts';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service.js';
import type { AuthContext } from '../auth/auth.types.js';
import { conflict, validationFailed } from '../common/api-exception.filter.js';
import { fromDbDate, toDbDate } from '../common/dates.js';
import type { RequestMeta } from '../common/request-meta.js';
import { addDays, todayIn } from '../common/school-time.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { activeOn } from './classes.service.js';
import { ScopeService } from './scope.service.js';

const INCLUDE = { gradeLevel: { select: { id: true, name: true } } } satisfies Prisma.AcademicCalendarEventInclude;
type Row = Prisma.AcademicCalendarEventGetPayload<{ include: typeof INCLUDE }>;
const STAFF_ROLES = ['ADMIN', 'MANAGEMENT', 'CURRICULUM', 'TEACHER', 'STAFF'] as const;
/** Kategori yang perlu ditinjau bila beririsan dengan agenda lain (FR-10.4). */
const CLASH_CATEGORIES = ['EXAM', 'HOLIDAY'] as const;

/** Rentang tanggal [from, to] yang beririsan dengan agenda (inklusif). */
const overlapping = (from: string, to: string): Prisma.AcademicCalendarEventWhereInput => ({ startsOn: { lte: toDbDate(to) }, endsOn: { gte: toDbDate(from) } });

/**
 * Kalender akademik (PRD R2 E10). Hanya agenda terbit tampil di portal; audiens diperiksa saat dibaca:
 * guru/staf melihat semua agenda terbit, siswa dan wali melihat agenda umum, agenda siswa & wali,
 * dan agenda tingkat yang sesuai rombel siswa/anak pada hari ini.
 */
@Injectable()
export class CalendarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly scope: ScopeService,
  ) {}

  private view(r: Row, clashes?: CalendarEventView['clashes']): CalendarEventView {
    return {
      id: r.id,
      title: r.title,
      category: r.category,
      startsOn: fromDbDate(r.startsOn),
      endsOn: fromDbDate(r.endsOn),
      audience: r.audience,
      gradeLevel: r.gradeLevel,
      location: r.location,
      description: r.description,
      status: r.status,
      ...(clashes ? { clashes } : {}),
    };
  }

  private async clashesFor(schoolId: string, e: { id?: string; startsOn: string; endsOn: string }) {
    const rows = await this.prisma.academicCalendarEvent.findMany({
      where: { schoolId, id: e.id ? { not: e.id } : undefined, status: { not: 'CANCELLED' }, category: { in: [...CLASH_CATEGORIES] }, ...overlapping(e.startsOn, e.endsOn) },
      select: { id: true, title: true, category: true },
      take: 10,
    });
    return rows;
  }

  private checkRange(from: string, to: string) {
    if (addDays(from, 400) < to) throw validationFailed('Rentang maksimal satu tahun.', { to: ['Terlalu panjang.'] });
  }

  /** Tingkat yang relevan bagi siswa/wali yang sedang masuk (rombel yang berlaku hari ini). */
  private async readerGradeLevelIds(auth: AuthContext, today: string): Promise<string[]> {
    const studentIds = [...(await this.scope.guardianChildIds(auth, 'academic'))];
    const me = await this.scope.student(auth);
    if (me) studentIds.push(me.id);
    if (!studentIds.length) return [];
    const rows = await this.prisma.enrollment.findMany({ where: { studentId: { in: studentIds }, ...activeOn(today) }, select: { classGroup: { select: { gradeLevelId: true } } } });
    return [...new Set(rows.map((r) => r.classGroup.gradeLevelId))];
  }

  async feed(auth: AuthContext, from: string, to: string): Promise<CalendarEventView[]> {
    this.checkRange(from, to);
    const tz = (await this.prisma.school.findUniqueOrThrow({ where: { id: auth.schoolId }, select: { timezone: true } })).timezone;
    const isStaff = auth.roles.some((r) => (STAFF_ROLES as readonly string[]).includes(r));
    const audience: Prisma.AcademicCalendarEventWhereInput = isStaff
      ? {}
      : { OR: [{ audience: { in: ['ALL', 'STUDENTS_GUARDIANS'] } }, { audience: 'GRADE_LEVEL', gradeLevelId: { in: await this.readerGradeLevelIds(auth, todayIn(tz)) } }] };
    const rows = await this.prisma.academicCalendarEvent.findMany({
      where: { schoolId: auth.schoolId, status: 'PUBLISHED', ...overlapping(from, to), ...audience },
      include: INCLUDE,
      orderBy: [{ startsOn: 'asc' }, { title: 'asc' }],
    });
    return rows.map((r) => this.view(r));
  }

  /** Semua agenda termasuk draf, dengan penanda irisan ujian/libur, untuk pengelola. */
  async manage(auth: AuthContext, from: string, to: string): Promise<CalendarEventView[]> {
    this.checkRange(from, to);
    const rows = await this.prisma.academicCalendarEvent.findMany({ where: { schoolId: auth.schoolId, ...overlapping(from, to) }, include: INCLUDE, orderBy: [{ startsOn: 'asc' }, { title: 'asc' }] });
    const out: CalendarEventView[] = [];
    for (const r of rows) {
      const clashes = r.status === 'CANCELLED' ? [] : await this.clashesFor(auth.schoolId, { id: r.id, startsOn: fromDbDate(r.startsOn), endsOn: fromDbDate(r.endsOn) });
      out.push(this.view(r, clashes));
    }
    return out;
  }

  private async validate(auth: AuthContext, input: z.infer<typeof CalendarEventSchema>) {
    if (input.audience === 'GRADE_LEVEL' && !(await this.prisma.gradeLevel.findFirst({ where: { id: input.gradeLevelId ?? undefined, schoolId: auth.schoolId } }))) {
      throw validationFailed('Tingkat tidak ditemukan.', { gradeLevelId: ['Pilih tingkat.'] });
    }
  }

  private data(input: z.infer<typeof CalendarEventSchema>) {
    return {
      title: input.title,
      category: input.category,
      startsOn: toDbDate(input.startsOn),
      endsOn: toDbDate(input.endsOn),
      audience: input.audience,
      gradeLevelId: input.audience === 'GRADE_LEVEL' ? (input.gradeLevelId ?? null) : null,
      location: input.location ?? null,
      description: input.description ?? null,
    };
  }

  /** Menyimpan agenda sebagai draf; mengembalikan irisan ujian/libur untuk ditinjau (bukan penolakan). */
  async create(auth: AuthContext, input: z.infer<typeof CalendarEventSchema>, meta: RequestMeta) {
    await this.validate(auth, input);
    const row = await this.prisma.academicCalendarEvent.create({ data: { ...this.data(input), schoolId: auth.schoolId, createdById: auth.userId } });
    await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'calendar.create', entityType: 'academic_calendar_event', entityId: row.id, requestId: meta.requestId, metadata: input });
    return { id: row.id, clashes: await this.clashesFor(auth.schoolId, { id: row.id, startsOn: input.startsOn, endsOn: input.endsOn }) };
  }

  private async find(auth: AuthContext, id: string) {
    const row = await this.prisma.academicCalendarEvent.findFirst({ where: { id, schoolId: auth.schoolId } });
    if (!row) throw new NotFoundException('Agenda tidak ditemukan.');
    return row;
  }

  async update(auth: AuthContext, id: string, input: z.infer<typeof CalendarEventSchema>, meta: RequestMeta) {
    const row = await this.find(auth, id);
    if (row.status === 'CANCELLED') throw conflict('Agenda sudah dibatalkan.');
    await this.validate(auth, input);
    await this.prisma.academicCalendarEvent.update({ where: { id }, data: this.data(input) });
    // Agenda terbit yang diubah tetap tercatat (FR-10.2): metadata berisi nilai lama dan baru.
    await this.audit.record({
      schoolId: auth.schoolId,
      actorUserId: auth.userId,
      action: 'calendar.update',
      entityType: 'academic_calendar_event',
      entityId: id,
      requestId: meta.requestId,
      metadata: { status: row.status, before: { title: row.title, startsOn: fromDbDate(row.startsOn), endsOn: fromDbDate(row.endsOn), audience: row.audience }, after: input },
    });
    return { id, clashes: await this.clashesFor(auth.schoolId, { id, startsOn: input.startsOn, endsOn: input.endsOn }) };
  }

  async publish(auth: AuthContext, id: string, meta: RequestMeta) {
    const row = await this.find(auth, id);
    if (row.status !== 'DRAFT') throw conflict(row.status === 'PUBLISHED' ? 'Agenda sudah terbit.' : 'Agenda sudah dibatalkan.');
    await this.prisma.academicCalendarEvent.update({ where: { id }, data: { status: 'PUBLISHED', publishedAt: new Date() } });
    await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'calendar.publish', entityType: 'academic_calendar_event', entityId: id, requestId: meta.requestId });
  }

  async cancel(auth: AuthContext, id: string, reason: string, meta: RequestMeta) {
    const row = await this.find(auth, id);
    if (row.status === 'CANCELLED') throw conflict('Agenda sudah dibatalkan.');
    await this.prisma.academicCalendarEvent.update({ where: { id }, data: { status: 'CANCELLED' } });
    await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'calendar.cancel', entityType: 'academic_calendar_event', entityId: id, requestId: meta.requestId, metadata: { reason } });
  }
}
