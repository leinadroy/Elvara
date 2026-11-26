import { Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, Post, Put, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AssessmentQuerySchema, GradeSchemeQuerySchema, GradeSchemeSchema, LearningOutcomeQuerySchema, LearningOutcomeSchema, UpdateGradeSchemeSchema, UuidParamSchema } from '@smart-school/contracts';
import type { z } from 'zod';
import type { AuthContext } from '../auth/auth.types.js';
import { CurrentAuth, RequirePermissions } from '../auth/decorators.js';
import { requestMeta } from '../common/request-meta.js';
import { SchemesService } from './schemes.service.js';
import { AssessmentsService } from './assessments.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

@ApiTags('Penilaian')
@Controller()
export class GradingController {
  constructor(private readonly schemes: SchemesService, private readonly assessments: AssessmentsService, private readonly prisma: PrismaService) {}

  @Get('grade-recap/options')
  @RequirePermissions('grading:read')
  async recapOptions(@CurrentAuth() auth: AuthContext) {
    const assignments = await this.prisma.teachingAssignment.findMany({
      where: { schoolId: auth.schoolId },
      select: {
        id: true, classGroup: { select: { code: true } }, subject: { select: { name: true } },
        term: { select: { name: true, academicYear: { select: { name: true } } } },
        employee: { select: { person: { select: { fullName: true } } } },
      },
      orderBy: [{ term: { startDate: 'desc' } }, { classGroup: { code: 'asc' } }, { subject: { name: 'asc' } }, { id: 'asc' }],
    });
    return assignments.map(({ id, classGroup, subject, term, employee }) => ({
      id, label: `${classGroup.code} · ${subject.name} · ${employee.person.fullName} · ${term.name} · ${term.academicYear.name}`,
    }));
  }

  @Get('grade-recap')
  @RequirePermissions('grading:read')
  async recap(@CurrentAuth() auth: AuthContext, @Query({ schema: AssessmentQuerySchema }) query: z.infer<typeof AssessmentQuerySchema>) {
    const assignment = await this.prisma.teachingAssignment.findFirst({
      where: { schoolId: auth.schoolId, id: query.teachingAssignmentId },
      select: { id: true },
    });
    if (!assignment) throw new NotFoundException('Penugasan mengajar tidak ditemukan.');
    return this.assessments.aggregateForAssignment(auth.schoolId, assignment.id);
  }

  @Get('grade-schemes')
  @RequirePermissions('grading:read')
  list(@CurrentAuth() auth: AuthContext, @Query({ schema: GradeSchemeQuerySchema }) q: z.infer<typeof GradeSchemeQuerySchema>) {
    return this.schemes.list(auth, q.termId);
  }

  @Post('grade-schemes')
  @RequirePermissions('grading:manage')
  create(@CurrentAuth() auth: AuthContext, @Body({ schema: GradeSchemeSchema }) body: z.infer<typeof GradeSchemeSchema>, @Req() req: Request) {
    return this.schemes.create(auth, body, requestMeta(req));
  }

  @Put('grade-schemes/:id')
  @HttpCode(204)
  @RequirePermissions('grading:manage')
  update(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Body({ schema: UpdateGradeSchemeSchema }) body: z.infer<typeof UpdateGradeSchemeSchema>, @Req() req: Request) {
    return this.schemes.update(auth, id, body, requestMeta(req));
  }

  @Post('grade-schemes/:id/revise')
  @RequirePermissions('grading:manage')
  revise(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Req() req: Request) {
    return this.schemes.revise(auth, id, requestMeta(req));
  }

  @Post('grade-schemes/:id/publish')
  @HttpCode(204)
  @RequirePermissions('grading:manage')
  publish(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Req() req: Request) {
    return this.schemes.publish(auth, id, requestMeta(req));
  }

  @Delete('grade-schemes/:id')
  @HttpCode(204)
  @RequirePermissions('grading:manage')
  discard(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Req() req: Request) {
    return this.schemes.discard(auth, id, requestMeta(req));
  }

  @Get('learning-outcomes')
  @RequirePermissions('grading:read')
  outcomes(@CurrentAuth() auth: AuthContext, @Query({ schema: LearningOutcomeQuerySchema }) q: z.infer<typeof LearningOutcomeQuerySchema>) {
    return this.schemes.outcomes(auth, q);
  }

  @Post('learning-outcomes')
  @RequirePermissions('grading:manage')
  createOutcome(@CurrentAuth() auth: AuthContext, @Body({ schema: LearningOutcomeSchema }) body: z.infer<typeof LearningOutcomeSchema>, @Req() req: Request) {
    return this.schemes.saveOutcome(auth, null, body, requestMeta(req));
  }

  @Put('learning-outcomes/:id')
  @RequirePermissions('grading:manage')
  updateOutcome(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Body({ schema: LearningOutcomeSchema }) body: z.infer<typeof LearningOutcomeSchema>, @Req() req: Request) {
    return this.schemes.saveOutcome(auth, id, body, requestMeta(req));
  }
}
