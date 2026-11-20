import { Injectable, NotFoundException } from '@nestjs/common';
import type { AcademicYearView } from '@smart-school/contracts';
import { CreateAcademicYearSchema } from '@smart-school/contracts';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service.js';
import type { AuthContext } from '../auth/auth.types.js';
import { conflict } from '../common/api-exception.filter.js';
import { fromDbDate, todayIso, toDbDate } from '../common/dates.js';
import type { RequestMeta } from '../common/request-meta.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

type YearWithTerms = Prisma.AcademicYearGetPayload<{ include: { terms: true } }>;

function view(y: YearWithTerms): AcademicYearView {
  return {
    id: y.id,
    name: y.name,
    startDate: fromDbDate(y.startDate),
    endDate: fromDbDate(y.endDate),
    status: y.status,
    terms: [...y.terms]
      .sort((a, b) => a.sequence - b.sequence)
      .map((t) => ({ id: t.id, name: t.name, sequence: t.sequence, startDate: fromDbDate(t.startDate), endDate: fromDbDate(t.endDate) })),
  };
}

@Injectable()
export class AcademicYearsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(auth: AuthContext): Promise<AcademicYearView[]> {
    const rows = await this.prisma.academicYear.findMany({
      where: { schoolId: auth.schoolId },
      include: { terms: true },
      orderBy: { startDate: 'desc' },
    });
    return rows.map(view);
  }

  async current(auth: AuthContext): Promise<AcademicYearView | null> {
    const y = await this.prisma.academicYear.findFirst({ where: { schoolId: auth.schoolId, status: 'ACTIVE' }, include: { terms: true } });
    return y ? view(y) : null;
  }

  async create(auth: AuthContext, input: z.infer<typeof CreateAcademicYearSchema>, meta: RequestMeta): Promise<AcademicYearView> {
    const exists = await this.prisma.academicYear.findUnique({ where: { schoolId_name: { schoolId: auth.schoolId, name: input.name } } });
    if (exists) throw conflict('Tahun ajaran dengan nama ini sudah ada.', { name: ['Nama tahun ajaran sudah dipakai.'] });
    const overlap = await this.prisma.academicYear.findFirst({
      where: { schoolId: auth.schoolId, startDate: { lte: toDbDate(input.endDate) }, endDate: { gte: toDbDate(input.startDate) } },
    });
    if (overlap) {
      throw conflict(`Rentang tanggal bertumpang tindih dengan tahun ajaran ${overlap.name}.`, {
        startDate: ['Rentang tanggal bertumpang tindih dengan tahun ajaran lain.'],
      });
    }
    return this.prisma.$transaction(async (tx) => {
      const y = await tx.academicYear.create({
        data: {
          schoolId: auth.schoolId,
          name: input.name,
          startDate: toDbDate(input.startDate),
          endDate: toDbDate(input.endDate),
          terms: {
            create: input.terms.map((t) => ({ name: t.name, sequence: t.sequence, startDate: toDbDate(t.startDate), endDate: toDbDate(t.endDate) })),
          },
        },
        include: { terms: true },
      });
      await this.audit.record(
        { schoolId: auth.schoolId, actorUserId: auth.userId, action: 'academic_year.create', entityType: 'academic_year', entityId: y.id, requestId: meta.requestId, metadata: { name: y.name } },
        tx,
      );
      return view(y);
    });
  }

  /**
   * Mengaktifkan tahun ajaran DRAF. Ditolak bila prasyarat belum lengkap:
   * tidak ada semester, tahun ajaran sudah berakhir, atau masih ada tahun ajaran lain yang aktif.
   */
  async activate(auth: AuthContext, id: string, meta: RequestMeta): Promise<AcademicYearView> {
    const y = await this.find(auth, id);
    const problems: string[] = [];
    if (y.status !== 'DRAFT') problems.push(y.status === 'ACTIVE' ? 'Tahun ajaran ini sudah aktif.' : 'Tahun ajaran yang sudah ditutup tidak dapat diaktifkan lagi.');
    if (y.terms.length === 0) problems.push('Tambahkan minimal satu semester.');
    if (fromDbDate(y.endDate) < todayIso()) problems.push('Tanggal selesai tahun ajaran sudah lewat.');
    const active = await this.prisma.academicYear.findFirst({ where: { schoolId: auth.schoolId, status: 'ACTIVE', id: { not: id } } });
    if (active) problems.push(`Tutup tahun ajaran aktif (${active.name}) terlebih dahulu.`);
    if (problems.length) throw conflict(problems.join(' '), { _: problems });

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.academicYear.update({ where: { id }, data: { status: 'ACTIVE' }, include: { terms: true } });
      await this.audit.record(
        { schoolId: auth.schoolId, actorUserId: auth.userId, action: 'academic_year.activate', entityType: 'academic_year', entityId: id, requestId: meta.requestId, metadata: { name: y.name } },
        tx,
      );
      return view(updated);
    });
  }

  async close(auth: AuthContext, id: string, meta: RequestMeta): Promise<AcademicYearView> {
    const y = await this.find(auth, id);
    if (y.status !== 'ACTIVE') throw conflict('Hanya tahun ajaran aktif yang dapat ditutup.');
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.academicYear.update({ where: { id }, data: { status: 'CLOSED' }, include: { terms: true } });
      await this.audit.record(
        { schoolId: auth.schoolId, actorUserId: auth.userId, action: 'academic_year.close', entityType: 'academic_year', entityId: id, requestId: meta.requestId, metadata: { name: y.name } },
        tx,
      );
      return view(updated);
    });
  }

  private async find(auth: AuthContext, id: string) {
    const y = await this.prisma.academicYear.findFirst({ where: { id, schoolId: auth.schoolId }, include: { terms: true } });
    if (!y) throw new NotFoundException('Tahun ajaran tidak ditemukan.');
    return y;
  }
}
