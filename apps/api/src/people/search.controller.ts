import { ApiTags } from '@nestjs/swagger';
import { Controller, Get, Query } from '@nestjs/common';
import { SearchQuerySchema, type SearchHit, type SearchResult } from '@smart-school/contracts';
import type { z } from 'zod';
import type { AuthContext } from '../auth/auth.types.js';
import { CurrentAuth } from '../auth/decorators.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { GuardiansService } from './guardians.service.js';

const LIMIT = 6;

/**
 * Pencarian global untuk kotak cari di header. Setiap jenis data hanya dicari bila peran aktif berhak;
 * wali hanya menemukan anaknya sendiri. Mata pelajaran ditambahkan saat modul akademik (R1) tersedia.
 */
@ApiTags('Pencarian')
@Controller('search')
export class SearchController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly guardians: GuardiansService,
  ) {}

  @Get()
  async search(@CurrentAuth() auth: AuthContext, @Query({ schema: SearchQuerySchema }) { q }: z.infer<typeof SearchQuerySchema>): Promise<SearchResult> {
    const hits: SearchHit[] = [];
    const name = { contains: q, mode: 'insensitive' as const };

    if (auth.permissions.has('people:read')) {
      const [students, employees, guardians] = await Promise.all([
        this.prisma.student.findMany({
          where: { schoolId: auth.schoolId, OR: [{ person: { fullName: name } }, { nis: { startsWith: q } }] },
          include: { person: true },
          orderBy: { person: { fullName: 'asc' } },
          take: LIMIT,
        }),
        this.prisma.employee.findMany({
          where: { schoolId: auth.schoolId, OR: [{ person: { fullName: name } }, { employeeNumber: { startsWith: q } }] },
          include: { person: true },
          orderBy: { person: { fullName: 'asc' } },
          take: LIMIT,
        }),
        this.prisma.guardian.findMany({
          where: { schoolId: auth.schoolId, person: { fullName: name } },
          include: { person: true },
          orderBy: { person: { fullName: 'asc' } },
          take: LIMIT,
        }),
      ]);
      hits.push(
        ...students.map((s) => ({ id: s.id, kind: 'student' as const, title: s.person.fullName, subtitle: `Siswa · NIS ${s.nis}`, href: `/admin/students/${s.id}` })),
        ...employees.map((e) => ({ id: e.id, kind: 'employee' as const, title: e.person.fullName, subtitle: `Pegawai · ${e.position}`, href: `/admin/employees/${e.id}` })),
        ...guardians.map((g) => ({ id: g.id, kind: 'guardian' as const, title: g.person.fullName, subtitle: 'Orang tua / wali', href: `/admin/guardians?q=${encodeURIComponent(g.person.fullName)}` })),
      );
    } else if (auth.activeRole === 'GUARDIAN') {
      const needle = q.toLowerCase();
      const children = await this.guardians.children(auth);
      hits.push(
        ...children
          .filter((c) => c.fullName.toLowerCase().includes(needle) || c.nis.startsWith(q))
          .map((c) => ({ id: c.studentId, kind: 'student' as const, title: c.fullName, subtitle: `Anak · NIS ${c.nis}`, href: `/guardian/children/${c.studentId}` })),
      );
    }
    return { hits };
  }
}
