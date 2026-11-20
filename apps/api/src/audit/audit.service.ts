import { Injectable } from '@nestjs/common';
import type { AuditEventView, Paginated } from '@smart-school/contracts';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

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
    q: { page: number; pageSize: number; entityType?: string; entityId?: string; actorUserId?: string; action?: string },
  ): Promise<Paginated<AuditEventView>> {
    const where: Prisma.AuditEventWhereInput = {
      schoolId,
      entityType: q.entityType,
      entityId: q.entityId,
      actorUserId: q.actorUserId,
      action: q.action ? { startsWith: q.action } : undefined,
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
