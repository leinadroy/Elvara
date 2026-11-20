import { Controller, Get } from '@nestjs/common';
import { MFA_RECOMMENDED_ROLES, type DashboardSummary } from '@smart-school/contracts';
import type { AuthContext } from '../auth/auth.types.js';
import { CurrentAuth } from '../auth/decorators.js';
import { fromDbDate, todayIso } from '../common/dates.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { GuardiansService } from './guardians.service.js';

/** Ringkasan beranda per peran. Angka dihitung langsung dari data (tanpa cache) dan disaring sesuai izin. */
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly guardians: GuardiansService,
  ) {}

  @Get('summary')
  async summary(@CurrentAuth() auth: AuthContext): Promise<DashboardSummary> {
    const s = auth.schoolId;
    const year = await this.prisma.academicYear.findFirst({ where: { schoolId: s, status: 'ACTIVE' }, include: { terms: { orderBy: { sequence: 'asc' } } } });
    const today = todayIso();
    const term = year?.terms.find((t) => fromDbDate(t.startDate) <= today && today <= fromDbDate(t.endDate));
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: auth.userId }, select: { mfaSecret: true } });

    const out: DashboardSummary = {
      academicYear: year
        ? {
            id: year.id,
            name: year.name,
            startDate: fromDbDate(year.startDate),
            endDate: fromDbDate(year.endDate),
            status: year.status,
            terms: year.terms.map((t) => ({ id: t.id, name: t.name, sequence: t.sequence, startDate: fromDbDate(t.startDate), endDate: fromDbDate(t.endDate) })),
          }
        : null,
      currentTermName: term?.name ?? null,
      mfa: { enabled: !!user.mfaSecret, recommended: auth.roles.some((r) => MFA_RECOMMENDED_ROLES.includes(r)) },
    };

    if (auth.permissions.has('people:read')) {
      const [studentsActive, employeesActive, teachersActive, guardians, withoutGuardian, pendingLinks] = await Promise.all([
        this.prisma.student.count({ where: { schoolId: s, status: 'ACTIVE' } }),
        this.prisma.employee.count({ where: { schoolId: s, status: 'ACTIVE' } }),
        this.prisma.employee.count({ where: { schoolId: s, status: 'ACTIVE', isTeacher: true } }),
        this.prisma.guardian.count({ where: { schoolId: s } }),
        this.prisma.student.count({ where: { schoolId: s, status: 'ACTIVE', guardians: { none: { status: 'VERIFIED' } } } }),
        this.prisma.studentGuardian.count({ where: { status: 'PENDING', student: { schoolId: s } } }),
      ]);
      out.people = { studentsActive, employeesActive, teachersActive, guardians, studentsWithoutVerifiedGuardian: withoutGuardian, pendingGuardianLinks: pendingLinks };
    }
    if (auth.permissions.has('corrections:review')) {
      out.pendingCorrections = await this.prisma.profileCorrectionRequest.count({ where: { schoolId: s, status: 'PENDING' } });
    }
    if (auth.permissions.has('imports:manage')) {
      const last = await this.prisma.importBatch.findFirst({ where: { schoolId: s }, orderBy: { createdAt: 'desc' } });
      out.lastImport = last ? { id: last.id, fileName: last.fileName, createdAt: last.createdAt.toISOString(), errorCount: last.errorCount } : null;
    }
    if (auth.permissions.has('audit:read')) {
      const events = await this.prisma.auditEvent.findMany({ where: { schoolId: s }, orderBy: { createdAt: 'desc' }, take: 6 });
      const users = await this.prisma.user.findMany({ where: { id: { in: events.map((e) => e.actorUserId).filter((v): v is string => !!v) } }, select: { id: true, email: true } });
      const byId = new Map(users.map((u) => [u.id, u.email]));
      out.recentAudit = events.map((e) => ({ id: e.id, action: e.action, actorEmail: e.actorUserId ? (byId.get(e.actorUserId) ?? null) : null, createdAt: e.createdAt.toISOString() }));
    }
    if (auth.activeRole === 'GUARDIAN') out.children = await this.guardians.children(auth);
    if (auth.personId) {
      const [pending, docs] = await Promise.all([
        this.prisma.profileCorrectionRequest.count({ where: { personId: auth.personId, status: 'PENDING' } }),
        this.prisma.personDocument.count({ where: { personId: auth.personId, deletedAt: null } }),
      ]);
      out.pendingMyCorrection = pending > 0;
      out.myDocumentCount = docs;
    }
    return out;
  }
}
