import { Injectable, NotFoundException } from '@nestjs/common';
import type { NotificationView } from '@smart-school/contracts';
import type { AuthContext } from '../auth/auth.types.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export interface NotificationDraft {
  recipientId: string;
  title: string;
  body: string;
  link?: string | null;
}

type Tx = Prisma.TransactionClient;

/**
 * Notifikasi dalam aplikasi (D8). Setiap kejadian punya sourceEventId unik: bila proses diulang,
 * notifikasi tidak dikirim dua kali. Adapter email/push nanti cukup menambah DeliveryAttempt per kanal.
 */
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Mengembalikan jumlah notifikasi yang dibuat (0 bila kejadian sudah pernah diproses). */
  async emit(
    tx: Tx | null,
    event: { schoolId: string; sourceEventId: string; eventType: string; payload?: Prisma.InputJsonValue },
    drafts: NotificationDraft[],
  ): Promise<number> {
    const db = tx ?? this.prisma;
    const recipients = new Map(drafts.map((d) => [d.recipientId, d]));
    if (!recipients.size) return 0;
    const existing = await db.notificationEvent.findUnique({ where: { sourceEventId: event.sourceEventId }, select: { id: true } });
    if (existing) return 0;
    const created = await db.notificationEvent.create({
      data: { schoolId: event.schoolId, sourceEventId: event.sourceEventId, eventType: event.eventType, payload: event.payload ?? {} },
    });
    for (const d of recipients.values()) {
      const n = await db.notification.create({
        data: { eventId: created.id, recipientId: d.recipientId, channel: 'IN_APP', status: 'DELIVERED', title: d.title, body: d.body, link: d.link ?? null },
      });
      await db.deliveryAttempt.create({ data: { notificationId: n.id, result: 'SENT', detail: 'in-app' } });
    }
    return recipients.size;
  }

  /** Akun wali aktif yang boleh menerima informasi absensi siswa (hubungan VERIFIED, berlaku, izin absensi). */
  async attendanceGuardianUserIds(db: Tx | PrismaService, studentId: string): Promise<string[]> {
    const now = new Date();
    const users = await db.user.findMany({
      where: {
        status: 'ACTIVE',
        person: {
          guardian: {
            students: {
              some: { studentId, status: 'VERIFIED', canViewAttendance: true, validFrom: { lte: now }, OR: [{ validUntil: null }, { validUntil: { gt: now } }] },
            },
          },
        },
      },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  async list(auth: AuthContext, unreadOnly: boolean): Promise<{ items: NotificationView[]; unread: number }> {
    const [rows, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where: { recipientId: auth.userId, ...(unreadOnly ? { readAt: null } : {}) },
        include: { event: { select: { eventType: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.notification.count({ where: { recipientId: auth.userId, readAt: null } }),
    ]);
    return {
      unread,
      items: rows.map((n) => ({
        id: n.id,
        eventType: n.event.eventType,
        title: n.title,
        body: n.body,
        link: n.link,
        readAt: n.readAt?.toISOString() ?? null,
        createdAt: n.createdAt.toISOString(),
      })),
    };
  }

  async markRead(auth: AuthContext, id: string) {
    const r = await this.prisma.notification.updateMany({ where: { id, recipientId: auth.userId, readAt: null }, data: { readAt: new Date() } });
    if (!r.count && !(await this.prisma.notification.findFirst({ where: { id, recipientId: auth.userId } }))) throw new NotFoundException('Notifikasi tidak ditemukan.');
  }

  async markAllRead(auth: AuthContext) {
    await this.prisma.notification.updateMany({ where: { recipientId: auth.userId, readAt: null }, data: { readAt: new Date() } });
  }
}

export const isUniqueViolation = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
