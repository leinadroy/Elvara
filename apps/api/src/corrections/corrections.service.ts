import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CORRECTABLE_FIELDS,
  type CorrectableField,
  type CorrectionStatus,
  type CorrectionView,
  type CreateCorrectionSchema,
} from '@smart-school/contracts';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service.js';
import type { AuthContext } from '../auth/auth.types.js';
import { conflict, validationFailed } from '../common/api-exception.filter.js';
import { fromDbDate, toDbDate } from '../common/dates.js';
import type { RequestMeta } from '../common/request-meta.js';
import { Prisma, type Person } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

type Changes = Partial<Record<CorrectableField, { from: unknown; to: unknown }>>;

/** Nilai field dalam bentuk yang bisa dibandingkan dan disimpan di JSON (tanggal → YYYY-MM-DD). */
function currentValue(p: Person, field: CorrectableField): unknown {
  return field === 'birthDate' ? fromDbDate(p.birthDate) : (p[field] ?? null);
}

const INCLUDE = { person: { include: { student: true, employee: true, guardian: true } } } satisfies Prisma.ProfileCorrectionRequestInclude;
type Row = Prisma.ProfileCorrectionRequestGetPayload<{ include: typeof INCLUDE }>;

@Injectable()
export class CorrectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async view(rows: Row[]): Promise<CorrectionView[]> {
    const ids = [...new Set(rows.flatMap((r) => [r.requestedById, r.reviewedById]).filter((v): v is string => !!v))];
    const users = await this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, email: true } });
    const email = new Map(users.map((u) => [u.id, u.email]));
    return rows.map((r) => {
      const p = r.person;
      const kind = p.student ? 'student' : p.employee ? 'employee' : p.guardian ? 'guardian' : 'other';
      const detailPath = p.student ? `/admin/students/${p.student.id}` : p.employee ? `/admin/employees/${p.employee.id}` : null;
      return {
        id: r.id,
        person: { id: p.id, fullName: p.fullName, kind, detailPath },
        changes: r.changes as Changes,
        reason: r.reason,
        status: r.status,
        requestedBy: email.get(r.requestedById) ?? null,
        reviewedBy: r.reviewedById ? (email.get(r.reviewedById) ?? null) : null,
        reviewedAt: r.reviewedAt?.toISOString() ?? null,
        reviewNote: r.reviewNote,
        createdAt: r.createdAt.toISOString(),
      };
    });
  }

  // ───────────── Pemilik data ─────────────

  async create(auth: AuthContext, input: z.infer<typeof CreateCorrectionSchema>, meta: RequestMeta): Promise<CorrectionView> {
    if (!auth.personId) throw new BadRequestException('Akun ini belum terhubung ke data diri.');
    const person = await this.prisma.person.findUniqueOrThrow({ where: { id: auth.personId } });
    const changes: Changes = {};
    for (const field of CORRECTABLE_FIELDS) {
      const to = input.changes[field];
      if (to === undefined) continue;
      const from = currentValue(person, field);
      if ((to ?? null) !== from) changes[field] = { from, to: to ?? null };
    }
    if (!Object.keys(changes).length) throw validationFailed('Tidak ada data yang berbeda dari data saat ini.', { changes: ['Ubah minimal satu data.'] });

    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const created = await tx.profileCorrectionRequest.create({
          data: { schoolId: auth.schoolId, personId: person.id, requestedById: auth.userId, changes: changes as Prisma.InputJsonValue, reason: input.reason },
          include: INCLUDE,
        });
        await this.audit.record(
          { schoolId: auth.schoolId, actorUserId: auth.userId, action: 'correction.request', entityType: 'person', entityId: person.id, requestId: meta.requestId, metadata: { correctionId: created.id, fields: Object.keys(changes) } },
          tx,
        );
        return created;
      });
      return (await this.view([row]))[0]!;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw conflict('Masih ada pengajuan koreksi yang menunggu tinjauan. Batalkan dulu atau tunggu hasilnya.');
      }
      throw err;
    }
  }

  async mine(auth: AuthContext): Promise<CorrectionView[]> {
    if (!auth.personId) return [];
    const rows = await this.prisma.profileCorrectionRequest.findMany({ where: { personId: auth.personId }, include: INCLUDE, orderBy: { createdAt: 'desc' }, take: 20 });
    return this.view(rows);
  }

  async cancel(auth: AuthContext, id: string, meta: RequestMeta): Promise<void> {
    const res = await this.prisma.profileCorrectionRequest.updateMany({
      where: { id, personId: auth.personId ?? '__none__', status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });
    if (res.count !== 1) throw new NotFoundException('Pengajuan tidak ditemukan atau sudah ditinjau.');
    await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'correction.cancel', entityType: 'person', entityId: auth.personId!, requestId: meta.requestId, metadata: { correctionId: id } });
  }

  // ───────────── Peninjau ─────────────

  async list(auth: AuthContext, status?: CorrectionStatus): Promise<CorrectionView[]> {
    const rows = await this.prisma.profileCorrectionRequest.findMany({
      where: { schoolId: auth.schoolId, status },
      include: INCLUDE,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 100,
    });
    return this.view(rows);
  }

  /**
   * Menyetujui dan menerapkan perubahan. Ditolak bila data resmi sudah berubah sejak pengajuan
   * (nilai `from` tidak sama lagi), agar perubahan petugas lain tidak tertimpa diam-diam.
   */
  async approve(auth: AuthContext, id: string, note: string | null, meta: RequestMeta): Promise<void> {
    const req = await this.findPending(auth, id);
    const changes = req.changes as Changes;
    const stale = (Object.keys(changes) as CorrectableField[]).filter((f) => currentValue(req.person, f) !== changes[f]!.from);
    if (stale.length) {
      throw conflict('Data resmi sudah berubah sejak pengajuan dibuat. Tolak pengajuan ini dan minta pemilik data mengajukan ulang.', { _: stale.map((f) => `${f} sudah berubah`) });
    }
    const data: Prisma.PersonUpdateInput = { updatedById: auth.userId };
    for (const [field, change] of Object.entries(changes) as [CorrectableField, { to: unknown }][]) {
      (data as Record<string, unknown>)[field] = field === 'birthDate' ? toDbDate(change.to as string | null) : change.to;
    }
    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.profileCorrectionRequest.updateMany({
        where: { id, status: 'PENDING' },
        data: { status: 'APPROVED', reviewedById: auth.userId, reviewedAt: new Date(), reviewNote: note },
      });
      if (claimed.count !== 1) throw conflict('Pengajuan ini sudah ditinjau petugas lain.');
      await tx.person.update({ where: { id: req.personId }, data });
      await this.audit.record(
        { schoolId: auth.schoolId, actorUserId: auth.userId, action: 'correction.approve', entityType: 'person', entityId: req.personId, requestId: meta.requestId, metadata: { correctionId: id, changes } },
        tx,
      );
    });
  }

  async reject(auth: AuthContext, id: string, note: string | null, meta: RequestMeta): Promise<void> {
    const req = await this.findPending(auth, id);
    if (!note) throw validationFailed('Tuliskan alasan penolakan agar pemilik data tahu apa yang perlu diperbaiki.', { note: ['Alasan wajib diisi.'] });
    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.profileCorrectionRequest.updateMany({
        where: { id, status: 'PENDING' },
        data: { status: 'REJECTED', reviewedById: auth.userId, reviewedAt: new Date(), reviewNote: note },
      });
      if (claimed.count !== 1) throw conflict('Pengajuan ini sudah ditinjau petugas lain.');
      await this.audit.record(
        { schoolId: auth.schoolId, actorUserId: auth.userId, action: 'correction.reject', entityType: 'person', entityId: req.personId, requestId: meta.requestId, metadata: { correctionId: id } },
        tx,
      );
    });
  }

  private async findPending(auth: AuthContext, id: string) {
    const req = await this.prisma.profileCorrectionRequest.findFirst({ where: { id, schoolId: auth.schoolId }, include: { person: true } });
    if (!req) throw new NotFoundException('Pengajuan tidak ditemukan.');
    if (req.status !== 'PENDING') throw conflict('Pengajuan ini sudah ditinjau atau dibatalkan.');
    return req;
  }
}
