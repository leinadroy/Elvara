import { Injectable } from '@nestjs/common';
import type { RoleKey } from '@smart-school/contracts';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthContext } from './auth.types.js';
import { hashToken, newToken } from './crypto.js';
import { permissionsFor, ROLE_PRIORITY } from './permissions.js';

/** Sesi berlaku 12 jam sejak login, lalu pengguna perlu masuk lagi. */
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  pickDefaultRole(roles: RoleKey[]): RoleKey | undefined {
    return ROLE_PRIORITY.find((r) => roles.includes(r));
  }

  async create(userId: string, activeRole: RoleKey, meta: { ip: string | null; userAgent: string | null }) {
    const { token, hash } = newToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    const session = await this.prisma.session.create({
      data: { tokenHash: hash, userId, activeRole, expiresAt, ip: meta.ip, userAgent: meta.userAgent },
    });
    return { token, expiresAt, sessionId: session.id };
  }

  /** Mengembalikan konteks bila token valid, sesi belum kedaluwarsa, akun aktif, dan peran aktif masih dimiliki. */
  async resolve(token: string): Promise<AuthContext | null> {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: { include: { roles: true } } },
    });
    if (!session) return null;
    const now = Date.now();
    if (session.expiresAt.getTime() <= now || session.user.status !== 'ACTIVE') {
      await this.prisma.session.deleteMany({ where: { id: session.id } });
      return null;
    }
    const roles = [...new Set(session.user.roles.map((r) => r.role))];
    const activeRole = roles.includes(session.activeRole) ? session.activeRole : this.pickDefaultRole(roles);
    if (!activeRole) return null;
    const roleRow = session.user.roles.find((r) => r.role === activeRole)!;

    if (activeRole !== session.activeRole || now - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
      await this.prisma.session.update({ where: { id: session.id }, data: { activeRole, lastSeenAt: new Date(now) } });
    }

    return {
      sessionId: session.id,
      userId: session.userId,
      email: session.user.email,
      personId: session.user.personId,
      schoolId: roleRow.schoolId,
      roles,
      activeRole,
      permissions: new Set(permissionsFor(activeRole)),
    };
  }

  async revoke(sessionId: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { id: sessionId } });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { userId } });
  }
}
