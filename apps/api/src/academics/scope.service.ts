import { ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthContext } from '../auth/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { activeOn } from './classes.service.js';

/**
 * Cakupan data portal: siapa "saya" (pegawai/siswa) dan anak mana yang boleh dilihat wali.
 * Wali hanya melihat anak dengan hubungan VERIFIED yang masih berlaku dan izin yang sesuai.
 */
@Injectable()
export class ScopeService {
  constructor(private readonly prisma: PrismaService) {}

  async employee(auth: AuthContext) {
    if (!auth.personId) return null;
    return this.prisma.employee.findFirst({ where: { personId: auth.personId, schoolId: auth.schoolId }, select: { id: true, isTeacher: true } });
  }

  async student(auth: AuthContext) {
    if (!auth.personId) return null;
    return this.prisma.student.findFirst({ where: { personId: auth.personId, schoolId: auth.schoolId }, select: { id: true } });
  }

  /** Anak yang boleh dilihat wali untuk keperluan tertentu. */
  async guardianChildIds(auth: AuthContext, need: 'attendance' | 'academic') {
    if (!auth.personId) return [];
    const now = new Date();
    const links = await this.prisma.studentGuardian.findMany({
      where: {
        guardian: { personId: auth.personId },
        status: 'VERIFIED',
        validFrom: { lte: now },
        OR: [{ validUntil: null }, { validUntil: { gt: now } }],
        ...(need === 'attendance' ? { canViewAttendance: true } : { canViewAcademic: true }),
      },
      select: { studentId: true },
    });
    return links.map((l) => l.studentId);
  }

  /**
   * Menentukan siswa yang datanya diminta pada portal: siswa sendiri, atau anak wali (studentId wajib
   * bila wali punya lebih dari satu anak). Menolak bila tidak berhak.
   */
  async portalStudentId(auth: AuthContext, need: 'attendance' | 'academic', studentId?: string): Promise<string> {
    if (auth.activeRole === 'STUDENT') {
      const s = await this.student(auth);
      if (!s || (studentId && studentId !== s.id)) throw new ForbiddenException('Data siswa ini tidak tersedia untuk Anda.');
      return s.id;
    }
    if (auth.activeRole === 'GUARDIAN') {
      const ids = await this.guardianChildIds(auth, need);
      const chosen = studentId ?? (ids.length === 1 ? ids[0] : undefined);
      if (!chosen || !ids.includes(chosen)) throw new ForbiddenException('Data siswa ini tidak tersedia untuk Anda.');
      return chosen;
    }
    throw new ForbiddenException('Halaman ini untuk siswa dan orang tua/wali.');
  }

  /** Rombel tempat siswa ditempatkan pada tanggal tertentu. */
  async classOf(studentId: string, date: string) {
    const e = await this.prisma.enrollment.findFirst({ where: { studentId, ...activeOn(date) }, select: { classGroupId: true, classGroup: { select: { code: true } } } });
    return e ? { id: e.classGroupId, code: e.classGroup.code } : null;
  }
}
