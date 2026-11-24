import { Injectable } from '@nestjs/common';
import type { AuditEventView, Paginated } from '@smart-school/contracts';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { addDays, atTimeIn } from '../common/school-time.js';

type Tx = Prisma.TransactionClient | PrismaService;

export interface AuditInput {
  schoolId?: string | null;
  actorUserId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  requestId?: string | null;
  ip?: string | null;
  /** Ringkasan perubahan. Jangan isi kata sandi, token, atau data sensitif yang tidak diperlukan. */
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /** Catat dalam transaksi pemanggil bila ada, agar audit dan perubahan data selalu konsisten. */
  async record(input: AuditInput, tx: Tx = this.prisma): Promise<void> {
    await tx.auditEvent.create({
      data: {
        schoolId: input.schoolId ?? null,
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        requestId: input.requestId ?? null,
        ip: input.ip ?? null,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  async list(
    schoolId: string,
    q: { page: number; pageSize: number; entityType?: string; entityId?: string; actorUserId?: string; actor?: string; action?: string; from?: string; to?: string },
  ): Promise<Paginated<AuditEventView>> {
    // Periode dihitung pada zona waktu sekolah agar "tanggal 23" berarti 00.00–24.00 waktu sekolah.
    const tz = q.from || q.to ? (await this.prisma.school.findUniqueOrThrow({ where: { id: schoolId }, select: { timezone: true } })).timezone : 'UTC';
    let actorFilter: string[] | undefined;
    if (q.actor) {
      const users = await this.prisma.user.findMany({ where: { email: { contains: q.actor } }, select: { id: true }, take: 50 });
      actorFilter = users.map((u) => u.id);
    }
    const where: Prisma.AuditEventWhereInput = {
      schoolId,
      entityType: q.entityType,
      entityId: q.entityId,
      action: q.action ? { startsWith: q.action } : undefined,
      AND: [
        ...(q.actorUserId ? [{ actorUserId: q.actorUserId }] : []),
        ...(actorFilter ? [{ actorUserId: { in: actorFilter } }] : []),
        ...(q.from ? [{ createdAt: { gte: atTimeIn(q.from, '00:00', tz) } }] : []),
        ...(q.to ? [{ createdAt: { lt: atTimeIn(addDays(q.to, 1), '00:00', tz) } }] : []),
      ],
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.auditEvent.count({ where }),
      this.prisma.auditEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
    ]);
    const actorIds = [...new Set(rows.map((r) => r.actorUserId).filter((v): v is string => !!v))];
    const actors = await this.prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, email: true } });
    const byId = new Map(actors.map((a) => [a.id, a]));
    return {
      total,
      page: q.page,
      pageSize: q.pageSize,
      items: rows.map((r) => ({
        id: r.id,
        action: r.action,
        entityType: r.entityType,
        entityId: r.entityId,
        actor: r.actorUserId ? (byId.get(r.actorUserId) ?? { id: r.actorUserId, email: '(akun dihapus)' }) : null,
        requestId: r.requestId,
        metadata: r.metadata as Record<string, unknown>,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }
}
