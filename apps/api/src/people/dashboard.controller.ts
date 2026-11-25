import { ApiTags } from '@nestjs/swagger';
import { Controller, Get, Logger } from '@nestjs/common';
import { MFA_RECOMMENDED_ROLES, type DashboardMetric, type DashboardSummary } from '@smart-school/contracts';
import type { AuthContext } from '../auth/auth.types.js';
import { CurrentAuth } from '../auth/decorators.js';
import { fromDbDate, todayIso } from '../common/dates.js';
import { MetricsService } from '../academics/metrics.service.js';
import { GradingMetricsService } from '../grading/grading-metrics.service.js';
import { WorkShiftsService } from '../staff/work-shifts.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { GuardiansService } from './guardians.service.js';

/** Ringkasan beranda per peran. Angka dihitung langsung dari data (tanpa cache) dan disaring sesuai izin. */
@ApiTags('Beranda')
@Controller('dashboard')
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly guardians: GuardiansService,
    private readonly metrics: MetricsService,
    private readonly shifts: WorkShiftsService,
    private readonly gradingMetrics: GradingMetricsService,
  ) {}

  @Get('summary')
  async summary(@CurrentAuth() auth: AuthContext): Promise<DashboardSummary> {
    const s = auth.schoolId;
    const year = await this.prisma.academicYear.findFirst({ where: { schoolId: s, status: 'ACTIVE' }, include: { terms: { orderBy: { sequence: 'asc' } } } });
    const today = todayIso();
    const term = year?.terms.find((t) => fromDbDate(t.startDate) <= today && today <= fromDbDate(t.endDate));
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: auth.userId }, select: { mfaSecret: true } });

    const metrics: DashboardMetric[] = [];
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
      generatedAt: new Date().toISOString(),
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
      metrics.push(
        { key: 'students_active', label: 'Siswa aktif', value: studentsActive, href: '/admin/students?status=ACTIVE', definition: 'Siswa berstatus aktif (belum lulus, pindah, atau keluar).', source: 'student' },
        { key: 'employees_active', label: 'Pegawai aktif', value: employeesActive, note: `${teachersActive} guru`, href: '/admin/employees?status=ACTIVE', definition: 'Pegawai berstatus aktif; catatan menunjukkan yang ditandai sebagai guru.', source: 'employee' },
        { key: 'guardian_links_pending', label: 'Tautan wali menunggu verifikasi', value: pendingLinks, warn: true, href: '/admin/guardians', definition: 'Hubungan wali–siswa berstatus menunggu. Wali belum bisa melihat data anak sampai terverifikasi.', source: 'student_guardian' },
        { key: 'students_without_guardian', label: 'Siswa tanpa wali terverifikasi', value: withoutGuardian, warn: true, href: '/admin/students?status=ACTIVE', definition: 'Siswa aktif yang belum punya satu pun hubungan wali berstatus terverifikasi.', source: 'student, student_guardian' },
      );
    }
    if (auth.permissions.has('corrections:review')) {
      out.pendingCorrections = await this.prisma.profileCorrectionRequest.count({ where: { schoolId: s, status: 'PENDING' } });
      metrics.push({ key: 'profile_corrections_pending', label: 'Koreksi data menunggu', value: out.pendingCorrections, warn: true, href: '/admin/corrections?status=PENDING', definition: 'Pengajuan koreksi data diri yang belum disetujui atau ditolak.', source: 'profile_correction_request' });
    }
    if (auth.permissions.has('accounts:manage')) {
      const now = new Date();
      const [open, expired, disabled] = await Promise.all([
        this.prisma.invitation.count({ where: { schoolId: s, acceptedAt: null, revokedAt: null, expiresAt: { gt: now } } }),
        this.prisma.invitation.count({ where: { schoolId: s, acceptedAt: null, revokedAt: null, expiresAt: { lte: now } } }),
        this.prisma.user.count({ where: { status: 'DISABLED', roles: { some: { schoolId: s } } } }),
      ]);
      metrics.push(
        { key: 'invitations_open', label: 'Undangan akun belum diterima', value: open, note: `${disabled} akun nonaktif`, href: '/admin/accounts', definition: 'Undangan akun yang masih berlaku tetapi belum diterima. Catatan menunjukkan akun yang dinonaktifkan.', source: 'account_invitation, user_account' },
        { key: 'invitations_expired', label: 'Undangan kedaluwarsa', value: expired, warn: true, href: '/admin/accounts', definition: 'Undangan yang habis masa berlakunya sebelum diterima dan belum dicabut. Kirim ulang undangan bila orangnya masih perlu akses.', source: 'account_invitation' },
      );
    }
    if (auth.permissions.has('imports:manage')) {
      const last = await this.prisma.importBatch.findFirst({ where: { schoolId: s }, orderBy: { createdAt: 'desc' } });
      out.lastImport = last ? { id: last.id, fileName: last.fileName, createdAt: last.createdAt.toISOString(), errorCount: last.errorCount } : null;
      if (last) {
        metrics.push({ key: 'import_errors_last', label: 'Baris bermasalah impor terakhir', value: last.errorCount, warn: true, href: `/admin/imports/${last.id}`, note: last.fileName ?? undefined, definition: 'Jumlah baris berstatus galat pada batch impor terbaru; baris lain tetap diproses.', source: 'import_batch, import_row_result' });
      }
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
    if (auth.activeRole === 'STAFF') {
      const t = await this.shifts.todayCount(auth);
      if (t.employee) {
        metrics.push({ key: 'work_shifts_today', label: 'Tugas saya hari ini', value: t.count, href: '/staff/schedule', definition: 'Tugas terjadwal (belum dibatalkan) atas nama Anda yang dimulai hari ini, zona waktu sekolah.', source: 'work_shift' });
      }
    }
    // Angka R1 dihitung terpisah: bila gagal, ringkasan lain tetap tampil dengan penanda (E8).
    try {
      metrics.push(...(await this.metrics.forRole(auth)));
    } catch (err) {
      this.logger.error('Angka beranda R1 gagal dihitung', err as Error);
      out.metricsUnavailable = true;
    }
    // Angka R2 (penilaian dan rapor, E16), juga terpisah agar kegagalannya tidak menghapus angka lain.
    try {
      metrics.push(...(await this.gradingMetrics.forRole(auth)));
    } catch (err) {
      this.logger.error('Angka beranda R2 gagal dihitung', err as Error);
      out.metricsUnavailable = true;
    }
    out.metrics = metrics;
    return out;
  }
}
