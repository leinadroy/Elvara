import { Body, Controller, Get, HttpCode, Param, Post, Put, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AssessmentQuerySchema, BulkGradeSaveSchema, CreateAssessmentSchema, GradeEntrySaveSchema, PublishedGradeCorrectionSchema, UuidParamSchema } from '@smart-school/contracts';
import type { z } from 'zod';
import type { AuthContext } from '../auth/auth.types.js';
import { CurrentAuth, RequireActiveRole } from '../auth/decorators.js';
import { requestMeta } from '../common/request-meta.js';
import { AssessmentsService } from './assessments.service.js';

@ApiTags('Penilaian')
@Controller('assessments')
@RequireActiveRole('TEACHER')
export class AssessmentsController {
  constructor(private readonly assessments: AssessmentsService) {}

  @Get('options')
  options(@CurrentAuth() auth: AuthContext) {
    return this.assessments.options(auth);
  }

  @Get()
  list(@CurrentAuth() auth: AuthContext, @Query({ schema: AssessmentQuerySchema }) q: z.infer<typeof AssessmentQuerySchema>) {
    return this.assessments.list(auth, q.teachingAssignmentId);
  }

  @Post()
  create(@CurrentAuth() auth: AuthContext, @Body({ schema: CreateAssessmentSchema }) body: z.infer<typeof CreateAssessmentSchema>, @Req() req: Request) {
    return this.assessments.create(auth, body, requestMeta(req));
  }

  @Get(':id/grades')
  grades(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string) {
    return this.assessments.grades(auth, id);
  }

  @Get('aggregates')
  aggregates(@CurrentAuth() auth: AuthContext, @Query({ schema: AssessmentQuerySchema }) query: z.infer<typeof AssessmentQuerySchema>) {
    return this.assessments.aggregates(auth, query.teachingAssignmentId);
  }

  @Get('grade-book')
  gradeBook(@CurrentAuth() auth: AuthContext, @Query({ schema: AssessmentQuerySchema }) query: z.infer<typeof AssessmentQuerySchema>) {
    return this.assessments.gradeBook(auth, query.teachingAssignmentId);
  }

  @Put(':id/grades')
  saveGrades(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string,
    @Body({ schema: BulkGradeSaveSchema }) body: z.infer<typeof BulkGradeSaveSchema>, @Req() req: Request) {
    return this.assessments.saveGrades(auth, id, body.rows, requestMeta(req));
  }

  @Put(':id/grades/:studentId')
  saveGrade(
    @CurrentAuth() auth: AuthContext,
    @Param('id', { schema: UuidParamSchema }) id: string,
    @Param('studentId', { schema: UuidParamSchema }) studentId: string,
    @Body({ schema: GradeEntrySaveSchema }) body: z.infer<typeof GradeEntrySaveSchema>,
    @Req() req: Request,
  ) {
    return this.assessments.saveGrade(auth, id, studentId, body, requestMeta(req));
  }

  @Post(':id/publish')
  @HttpCode(204)
  publish(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Req() req: Request) {
    return this.assessments.publish(auth, id, requestMeta(req));
  }

  @Put(':id/grades/:studentId/correction')
  correctGrade(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Param('studentId', { schema: UuidParamSchema }) studentId: string, @Body({ schema: PublishedGradeCorrectionSchema }) body: z.infer<typeof PublishedGradeCorrectionSchema>, @Req() req: Request) {
    return this.assessments.correctGrade(auth, id, studentId, body, requestMeta(req));
  }

  @Get(':id/grades/:studentId/changes')
  changes(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Param('studentId', { schema: UuidParamSchema }) studentId: string) {
    return this.assessments.changes(auth, id, studentId);
  }
}
