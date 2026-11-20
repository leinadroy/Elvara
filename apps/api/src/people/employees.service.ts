import { Injectable, NotFoundException } from '@nestjs/common';
import type { EmployeeDetail, EmployeeListItem, Paginated } from '@smart-school/contracts';
import { CreateEmployeeSchema, EmployeeListQuerySchema, UpdateEmployeeSchema } from '@smart-school/contracts';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service.js';
import type { AuthContext } from '../auth/auth.types.js';
import { conflict } from '../common/api-exception.filter.js';
import { fromDbDate, toDbDate } from '../common/dates.js';
import type { RequestMeta } from '../common/request-meta.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { diff, personData, personView } from './person.mapper.js';

type ListQuery = z.infer<typeof EmployeeListQuerySchema>;
const ORDER: Record<ListQuery['sort'], Prisma.EmployeeOrderByWithRelationInput> = {
  name: { person: { fullName: 'asc' } },
  '-name': { person: { fullName: 'desc' } },
  employeeNumber: { employeeNumber: 'asc' },
  '-employeeNumber': { employeeNumber: 'desc' },
};

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(auth: AuthContext, q: ListQuery): Promise<Paginated<EmployeeListItem>> {
    const where: Prisma.EmployeeWhereInput = {
      schoolId: auth.schoolId,
      status: q.status,
      isTeacher: q.isTeacher,
      ...(q.q
        ? { OR: [{ person: { fullName: { contains: q.q, mode: 'insensitive' } } }, { employeeNumber: { startsWith: q.q } }, { nip: { startsWith: q.q } }] }
        : {}),
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.employee.count({ where }),
      this.prisma.employee.findMany({
        where,
        orderBy: [ORDER[q.sort], { id: 'asc' }],
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: { person: true },
      }),
    ]);
    return { total, page: q.page, pageSize: q.pageSize, items: rows.map((e) => this.item(e)) };
  }

  private item(e: Prisma.EmployeeGetPayload<{ include: { person: true } }>): EmployeeListItem {
    return {
      id: e.id,
      personId: e.personId,
      employeeNumber: e.employeeNumber,
      nip: e.nip,
      fullName: e.person.fullName,
      position: e.position,
      employmentType: e.employmentType,
      isTeacher: e.isTeacher,
      status: e.status,
    };
  }

  private async conflicts(schoolId: string, employeeNumber: string | undefined, nip: string | null | undefined, excludeId?: string) {
    const fieldErrors: Record<string, string[]> = {};
    if (employeeNumber) {
      const e = await this.prisma.employee.findUnique({ where: { schoolId_employeeNumber: { schoolId, employeeNumber } } });
      if (e && e.id !== excludeId) fieldErrors.employeeNumber = ['Nomor pegawai sudah dipakai.'];
    }
    if (nip) {
      const e = await this.prisma.employee.findUnique({ where: { schoolId_nip: { schoolId, nip } } });
      if (e && e.id !== excludeId) fieldErrors.nip = ['NIP sudah dipakai.'];
    }
    return fieldErrors;
  }

  async create(auth: AuthContext, input: z.infer<typeof CreateEmployeeSchema>, meta: RequestMeta): Promise<{ id: string }> {
    const fieldErrors = await this.conflicts(auth.schoolId, input.employeeNumber, input.nip);
    if (Object.keys(fieldErrors).length) throw conflict('Nomor pegawai atau NIP sudah dipakai.', fieldErrors);
    return this.prisma.$transaction(async (tx) => {
      const person = await tx.person.create({
        data: { ...personData(input), fullName: input.fullName, schoolId: auth.schoolId, createdById: auth.userId, updatedById: auth.userId },
      });
      const e = await tx.employee.create({
        data: {
          personId: person.id,
          schoolId: auth.schoolId,
          employeeNumber: input.employeeNumber,
          nip: input.nip,
          position: input.position,
          employmentType: input.employmentType,
          isTeacher: input.isTeacher,
          joinedAt: toDbDate(input.joinedAt),
        },
      });
      await this.audit.record(
        { schoolId: auth.schoolId, actorUserId: auth.userId, action: 'employee.create', entityType: 'employee', entityId: e.id, requestId: meta.requestId, metadata: { employeeNumber: e.employeeNumber, fullName: person.fullName } },
        tx,
      );
      return { id: e.id };
    });
  }

  async get(auth: AuthContext, id: string): Promise<EmployeeDetail> {
    const e = await this.prisma.employee.findFirst({
      where: { id, schoolId: auth.schoolId },
      include: { person: { include: { user: { include: { roles: { where: { schoolId: auth.schoolId } } } } } } },
    });
    if (!e) throw new NotFoundException('Pegawai tidak ditemukan.');
    const user = e.person.user;
    return {
      ...this.item(e),
      person: personView(e.person),
      joinedAt: fromDbDate(e.joinedAt),
      account: user ? { status: user.status, email: user.email, roles: user.roles.map((r) => r.role) } : null,
    };
  }

  async update(auth: AuthContext, id: string, input: z.infer<typeof UpdateEmployeeSchema>, meta: RequestMeta): Promise<void> {
    const e = await this.prisma.employee.findFirst({ where: { id, schoolId: auth.schoolId }, include: { person: true } });
    if (!e) throw new NotFoundException('Pegawai tidak ditemukan.');
    const fieldErrors = await this.conflicts(auth.schoolId, undefined, input.nip, id);
    if (Object.keys(fieldErrors).length) throw conflict('NIP sudah dipakai.', fieldErrors);
    const personChanges = personData(input);
    const employeeChanges = {
      nip: input.nip,
      position: input.position,
      employmentType: input.employmentType,
      isTeacher: input.isTeacher,
      status: input.status,
      joinedAt: toDbDate(input.joinedAt),
    };
    const changes = { ...diff(e.person, personChanges), ...diff(e, employeeChanges) };
    if (!Object.keys(changes).length) return;
    await this.prisma.$transaction(async (tx) => {
      await tx.person.update({ where: { id: e.personId }, data: { ...personChanges, updatedById: auth.userId } });
      await tx.employee.update({ where: { id }, data: employeeChanges });
      await this.audit.record(
        { schoolId: auth.schoolId, actorUserId: auth.userId, action: 'employee.update', entityType: 'employee', entityId: id, requestId: meta.requestId, metadata: { changes } },
        tx,
      );
    });
  }
}
