import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { AnnouncementView, CreateAnnouncementSchema } from '@smart-school/contracts';
import type { z } from 'zod';
import { activeOn } from '../academics/classes.service.js';
import { ScopeService } from '../academics/scope.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AuthContext } from '../auth/auth.types.js';
import { conflict, validationFailed } from '../common/api-exception.filter.js';
import type { RequestMeta } from '../common/request-meta.js';
import { todayIn } from '../common/school-time.js';
import type { Prisma, RoleKey } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from './notifications.service.js';

const STAFF_ROLES: RoleKey[] = ['ADMIN', 'MANAGEMENT', 'CURRICULUM', 'TEACHER', 'STAFF'];
const INCLUDE = { classGroup: { select: { id: true, code: true } }, building: { select: { id: true, code: true, name: true } } } satisfies Prisma.AnnouncementInclude;
type Row = Prisma.AnnouncementGetPayload<{ include: typeof INCLUDE }>;

/**
 * Pengumuman. Audiens diperiksa saat dibaca (bukan hanya saat dikirim), sehingga siswa yang pindah kelas
 * tidak lagi melihat pengumuman rombel lamanya. Notifikasi dalam aplikasi dibuat saat pengumuman terbit.
 */
@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly scope: ScopeService,
  ) {}

  private async today(schoolId: string) {
    return todayIn((await this.prisma.school.findUniqueOrThrow({ where: { id: schoolId }, select: { timezone: true } })).timezone);
  }

  private view(a: Row, authorName: string | null, recipientCount?: number): AnnouncementView {
    return {
      id: a.id,
      title: a.title,
      body: a.body,
      audienceKind: a.audienceKind,
      classGroup: a.classGroup,
      building: a.building,
      audienceRole: a.audienceRole,
      status: a.status,
      publishAt: a.publishAt.toISOString(),
      withdrawnAt: a.withdrawnAt?.toISOString() ?? null,
      author: authorName,
      recipientCount,
    };
  }

  /** Akun penerima notifikasi untuk audiens pengumuman. */
  private async recipients(schoolId: string, a: { audienceKind: Row['audienceKind']; classGroupId: string | null; buildingId: string | null; audienceRole: RoleKey | null }): Promise<string[]> {
    const byRoles = async (roles: RoleKey[]) =>
      (await this.prisma.user.findMany({ where: { status: 'ACTIVE', roles: { some: { schoolId, role: { in: roles } } } }, select: { id: true } })).map((u) => u.id);
    switch (a.audienceKind) {
      case 'ALL':
        return byRoles([...STAFF_ROLES, 'STUDENT', 'GUARDIAN']);
      case 'STAFF':
        return byRoles(STAFF_ROLES);
      case 'STUDENTS':
        return byRoles(['STUDENT']);
      case 'GUARDIANS':
        return byRoles(['GUARDIAN']);
      case 'ROLE':
        return a.audienceRole ? byRoles([a.audienceRole]) : [];
      case 'CLASS_GROUP':
        return a.classGroupId ? this.classRecipients(schoolId, [a.classGroupId]) : [];
      case 'BUILDING': {
        if (!a.buildingId) return [];
        const year = await this.prisma.academicYear.findFirst({ where: { schoolId, status: 'ACTIVE' }, select: { id: true } });
        const classes = await this.prisma.classGroup.findMany({ where: { schoolId, academicYearId: year?.id, mainRoom: { floor: { buildingId: a.buildingId } } }, select: { id: true } });
        return this.classRecipients(schoolId, classes.map((c) => c.id));
      }
    }
  }

  /** Siswa yang ditempatkan, wali terverifikasi (izin akademik), guru pengampu, dan wali kelas dari rombel-rombel ini. */
  private async classRecipients(schoolId: string, classGroupIds: string[]): Promise<string[]> {
    if (!classGroupIds.length) return [];
    const today = await this.today(schoolId);
    const enrolled = await this.prisma.enrollment.findMany({ where: { classGroupId: { in: classGroupIds }, ...activeOn(today) }, select: { studentId: true } });
    const studentIds = enrolled.map((e) => e.studentId);
    const now = new Date();
    const users = await this.prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { person: { student: { id: { in: studentIds } } } },
          {
            person: {
              guardian: { students: { some: { studentId: { in: studentIds }, status: 'VERIFIED', canViewAcademic: true, validFrom: { lte: now }, OR: [{ validUntil: null }, { validUntil: { gt: now } }] } } },
            },
          },
          { person: { employee: { teachingAssignments: { some: { classGroupId: { in: classGroupIds } } } } } },
          { person: { employee: { homeroomAssignments: { some: { classGroupId: { in: classGroupIds }, validTo: null } } } } },
        ],
      },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  private async notify(a: Row) {
    const ids = await this.recipients(a.schoolId, a);
    return this.notifications.emit(
      null,
      { schoolId: a.schoolId, sourceEventId: `announcement.published:${a.id}`, eventType: 'announcement.published', payload: { announcementId: a.id } },
      ids.map((recipientId) => ({ recipientId, title: a.title, body: a.body.length > 160 ? `${a.body.slice(0, 157)}…` : a.body, link: `/messages/announcements#${a.id}` })),
    );
  }

  /** Menerbitkan pengumuman terjadwal yang waktunya sudah lewat (dipanggil saat daftar dibuka). */
  private async publishDue(schoolId: string) {
    const due = await this.prisma.announcement.findMany({ where: { schoolId, status: 'SCHEDULED', publishAt: { lte: new Date() } }, include: INCLUDE });
    for (const a of due) {
      const r = await this.prisma.announcement.updateMany({ where: { id: a.id, status: 'SCHEDULED' }, data: { status: 'PUBLISHED', publishedAt: new Date() } });
      if (r.count) await this.notify(a);
    }
  }

  async create(auth: AuthContext, input: z.infer<typeof CreateAnnouncementSchema>, meta: RequestMeta) {
    if (input.audienceKind === 'CLASS_GROUP') {
      if (!input.classGroupId || !(await this.prisma.classGroup.findFirst({ where: { id: input.classGroupId, schoolId: auth.schoolId } }))) {
        throw validationFailed('Rombel tidak ditemukan.', { classGroupId: ['Pilih rombel.'] });
      }
    }
    if (input.audienceKind === 'BUILDING' && (!input.buildingId || !(await this.prisma.building.findFirst({ where: { id: input.buildingId, schoolId: auth.schoolId } })))) {
      throw validationFailed('Gedung tidak ditemukan.', { buildingId: ['Pilih gedung.'] });
    }
    const now = new Date();
    const publishAt = input.publishAt ? new Date(input.publishAt) : now;
    if (publishAt.getTime() < now.getTime() - 60_000) throw validationFailed('Waktu terbit tidak boleh di masa lalu.', { publishAt: ['Pilih waktu mendatang.'] });
    const immediate = publishAt.getTime() <= now.getTime();
    const a = await this.prisma.announcement.create({
      data: {
        schoolId: auth.schoolId,
        title: input.title,
        body: input.body,
        audienceKind: input.audienceKind,
        classGroupId: input.audienceKind === 'CLASS_GROUP' ? input.classGroupId : null,
        buildingId: input.audienceKind === 'BUILDING' ? input.buildingId : null,
        audienceRole: input.audienceKind === 'ROLE' ? input.audienceRole : null,
        status: immediate ? 'PUBLISHED' : 'SCHEDULED',
        publishAt,
        publishedAt: immediate ? now : null,
        createdById: auth.userId,
      },
      include: INCLUDE,
    });
    const count = immediate ? await this.notify(a) : 0;
    await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'announcement.create', entityType: 'announcement', entityId: a.id, requestId: meta.requestId, metadata: { audienceKind: a.audienceKind, classGroupId: a.classGroupId, buildingId: a.buildingId, audienceRole: a.audienceRole, status: a.status, recipients: count } });
    return { id: a.id, recipientCount: count };
  }

  async withdraw(auth: AuthContext, id: string, meta: RequestMeta) {
    const a = await this.prisma.announcement.findFirst({ where: { id, schoolId: auth.schoolId } });
    if (!a) throw new NotFoundException('Pengumuman tidak ditemukan.');
    if (a.status === 'WITHDRAWN') throw conflict('Pengumuman sudah ditarik.');
    await this.prisma.announcement.update({ where: { id }, data: { status: 'WITHDRAWN', withdrawnAt: new Date() } });
    await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'announcement.withdraw', entityType: 'announcement', entityId: id, requestId: meta.requestId });
  }

  private async authorNames(rows: Row[]) {
    const users = await this.prisma.user.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.createdById))] } }, select: { id: true, email: true, person: { select: { fullName: true } } } });
    return new Map(users.map((u) => [u.id, u.person?.fullName ?? u.email]));
  }

  /** Semua pengumuman (untuk penerbit). */
  async manageList(auth: AuthContext): Promise<AnnouncementView[]> {
    await this.publishDue(auth.schoolId);
    const rows = await this.prisma.announcement.findMany({ where: { schoolId: auth.schoolId }, include: INCLUDE, orderBy: { publishAt: 'desc' }, take: 100 });
    const names = await this.authorNames(rows);
    return rows.map((r) => this.view(r, names.get(r.createdById) ?? null));
  }

  /** Rombel yang relevan bagi pembaca: kelas siswa, kelas anak wali, kelas yang diajar/diampu guru. */
  private async readerClassIds(auth: AuthContext, today: string): Promise<string[]> {
    const ids = new Set<string>();
    const student = await this.scope.student(auth);
    if (student) {
      const c = await this.scope.classOf(student.id, today);
      if (c) ids.add(c.id);
    }
    for (const childId of await this.scope.guardianChildIds(auth, 'academic')) {
      const c = await this.scope.classOf(childId, today);
      if (c) ids.add(c.id);
    }
    const emp = await this.scope.employee(auth);
    if (emp) {
      const [ta, hr] = await Promise.all([
        this.prisma.teachingAssignment.findMany({ where: { employeeId: emp.id }, select: { classGroupId: true } }),
        this.prisma.homeroomAssignment.findMany({ where: { employeeId: emp.id, validTo: null }, select: { classGroupId: true } }),
      ]);
      [...ta, ...hr].forEach((r) => ids.add(r.classGroupId));
    }
    return [...ids];
  }

  /** Pengumuman terbit yang ditujukan kepada pembaca, diperiksa saat dibaca. */
  async feed(auth: AuthContext): Promise<AnnouncementView[]> {
    await this.publishDue(auth.schoolId);
    const today = await this.today(auth.schoolId);
    const kinds: Row['audienceKind'][] = ['ALL'];
    if (auth.roles.some((r) => STAFF_ROLES.includes(r))) kinds.push('STAFF');
    if (auth.roles.includes('STUDENT')) kinds.push('STUDENTS');
    if (auth.roles.includes('GUARDIAN')) kinds.push('GUARDIANS');
    const classIds = await this.readerClassIds(auth, today);
    const buildingIds = (
      await this.prisma.classGroup.findMany({ where: { id: { in: classIds } }, select: { mainRoom: { select: { floor: { select: { buildingId: true } } } } } })
    ).flatMap((c) => (c.mainRoom ? [c.mainRoom.floor.buildingId] : []));
    const rows = await this.prisma.announcement.findMany({
      where: {
        schoolId: auth.schoolId,
        status: 'PUBLISHED',
        OR: [
          { audienceKind: { in: kinds } },
          { audienceKind: 'ROLE', audienceRole: { in: auth.roles } },
          { audienceKind: 'CLASS_GROUP', classGroupId: { in: classIds } },
          { audienceKind: 'BUILDING', buildingId: { in: [...new Set(buildingIds)] } },
        ],
      },
      include: INCLUDE,
      orderBy: { publishAt: 'desc' },
      take: 50,
    });
    const names = await this.authorNames(rows);
    return rows.map((r) => this.view(r, names.get(r.createdById) ?? null));
  }

  /** Tanda baca per pengguna (baca ≠ persetujuan). */
  async markRead(auth: AuthContext, id: string) {
    const visible = (await this.feed(auth)).some((a) => a.id === id);
    if (!visible) throw new ForbiddenException('Pengumuman tidak tersedia untuk Anda.');
    await this.prisma.readReceipt.upsert({
      where: { userId_itemKind_itemId: { userId: auth.userId, itemKind: 'announcement', itemId: id } },
      create: { userId: auth.userId, itemKind: 'announcement', itemId: id },
      update: {},
    });
  }
}
