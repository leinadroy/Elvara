import { Body, Controller, Get, HttpCode, NotFoundException, Param, Patch, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import {
  CreateEmployeeSchema,
  CreateGuardianSchema,
  CreateStudentSchema,
  EmployeeListQuerySchema,
  GuardianListQuerySchema,
  LinkGuardianSchema,
  StudentListQuerySchema,
  UpdateEmployeeSchema,
  UpdateStudentSchema,
  UuidParamSchema,
} from '@smart-school/contracts';
import type { z } from 'zod';
import type { AuthContext } from '../auth/auth.types.js';
import { CurrentAuth, RequireActiveRole, RequirePermissions } from '../auth/decorators.js';
import { fromDbDate } from '../common/dates.js';
import { requestMeta } from '../common/request-meta.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmployeesService } from './employees.service.js';
import { GuardiansService } from './guardians.service.js';
import { personView } from './person.mapper.js';
import { StudentsService } from './students.service.js';

const Id = { schema: UuidParamSchema };

@Controller('students')
export class StudentsController {
  constructor(
    private readonly students: StudentsService,
    private readonly guardians: GuardiansService,
  ) {}

  @Get()
  @RequirePermissions('people:read')
  list(@CurrentAuth() auth: AuthContext, @Query({ schema: StudentListQuerySchema }) q: z.infer<typeof StudentListQuerySchema>) {
    return this.students.list(auth, q);
  }

  @Post()
  @RequirePermissions('people:manage')
  create(@CurrentAuth() auth: AuthContext, @Body({ schema: CreateStudentSchema }) body: z.infer<typeof CreateStudentSchema>, @Req() req: Request) {
    return this.students.create(auth, body, requestMeta(req));
  }

  @Get(':id')
  @RequirePermissions('people:read')
  get(@CurrentAuth() auth: AuthContext, @Param('id', Id) id: string) {
    return this.students.get(auth, id);
  }

  @Patch(':id')
  @HttpCode(204)
  @RequirePermissions('people:manage')
  update(
    @CurrentAuth() auth: AuthContext,
    @Param('id', Id) id: string,
    @Body({ schema: UpdateStudentSchema }) body: z.infer<typeof UpdateStudentSchema>,
    @Req() req: Request,
  ) {
    return this.students.update(auth, id, body, requestMeta(req));
  }

  @Post(':id/guardians')
  @RequirePermissions('guardian-links:manage')
  link(
    @CurrentAuth() auth: AuthContext,
    @Param('id', Id) id: string,
    @Body({ schema: LinkGuardianSchema }) body: z.infer<typeof LinkGuardianSchema>,
    @Req() req: Request,
  ) {
    return this.guardians.link(auth, id, body, requestMeta(req));
  }
}

@Controller('student-guardians')
export class StudentGuardiansController {
  constructor(private readonly guardians: GuardiansService) {}

  @Post(':id/invitations')
  @RequirePermissions('guardian-links:manage')
  reissue(@CurrentAuth() auth: AuthContext, @Param('id', Id) id: string, @Req() req: Request) {
    return this.guardians.reissueInvitation(auth, id, requestMeta(req));
  }

  @Post(':id/revoke')
  @HttpCode(204)
  @RequirePermissions('guardian-links:manage')
  revoke(@CurrentAuth() auth: AuthContext, @Param('id', Id) id: string, @Req() req: Request) {
    return this.guardians.revoke(auth, id, requestMeta(req));
  }
}

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  @Get()
  @RequirePermissions('people:read')
  list(@CurrentAuth() auth: AuthContext, @Query({ schema: EmployeeListQuerySchema }) q: z.infer<typeof EmployeeListQuerySchema>) {
    return this.employees.list(auth, q);
  }

  @Post()
  @RequirePermissions('people:manage')
  create(@CurrentAuth() auth: AuthContext, @Body({ schema: CreateEmployeeSchema }) body: z.infer<typeof CreateEmployeeSchema>, @Req() req: Request) {
    return this.employees.create(auth, body, requestMeta(req));
  }

  @Get(':id')
  @RequirePermissions('people:read')
  get(@CurrentAuth() auth: AuthContext, @Param('id', Id) id: string) {
    return this.employees.get(auth, id);
  }

  @Patch(':id')
  @HttpCode(204)
  @RequirePermissions('people:manage')
  update(
    @CurrentAuth() auth: AuthContext,
    @Param('id', Id) id: string,
    @Body({ schema: UpdateEmployeeSchema }) body: z.infer<typeof UpdateEmployeeSchema>,
    @Req() req: Request,
  ) {
    return this.employees.update(auth, id, body, requestMeta(req));
  }
}

@Controller('guardians')
export class GuardiansController {
  constructor(private readonly guardians: GuardiansService) {}

  @Get()
  @RequirePermissions('people:read')
  list(@CurrentAuth() auth: AuthContext, @Query({ schema: GuardianListQuerySchema }) q: z.infer<typeof GuardianListQuerySchema>) {
    return this.guardians.list(auth, q);
  }

  @Post()
  @RequirePermissions('people:manage')
  create(@CurrentAuth() auth: AuthContext, @Body({ schema: CreateGuardianSchema }) body: z.infer<typeof CreateGuardianSchema>, @Req() req: Request) {
    return this.guardians.create(auth, body, requestMeta(req));
  }
}

/** Portal wali: data dibatasi ke anak dengan hubungan terverifikasi. */
@Controller('guardian')
@RequireActiveRole('GUARDIAN')
export class GuardianPortalController {
  constructor(private readonly guardians: GuardiansService) {}

  @Get('children')
  children(@CurrentAuth() auth: AuthContext) {
    return this.guardians.children(auth);
  }

  @Get('children/:studentId')
  child(@CurrentAuth() auth: AuthContext, @Param('studentId', Id) studentId: string) {
    return this.guardians.child(auth, studentId);
  }
}

/** Data diri pengguna yang sedang masuk (semua peran). */
@Controller('me')
export class MeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('profile')
  async profile(@CurrentAuth() auth: AuthContext) {
    if (!auth.personId) throw new NotFoundException('Akun ini belum terhubung ke data orang.');
    const p = await this.prisma.person.findUniqueOrThrow({ where: { id: auth.personId }, include: { student: true, employee: true } });
    return {
      person: personView(p),
      student: p.student ? { nis: p.student.nis, nisn: p.student.nisn, status: p.student.status, enrolledAt: fromDbDate(p.student.enrolledAt) } : null,
      employee: p.employee
        ? { employeeNumber: p.employee.employeeNumber, position: p.employee.position, isTeacher: p.employee.isTeacher, status: p.employee.status }
        : null,
    };
  }
}
