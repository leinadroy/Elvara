import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { GradeSchemeQuerySchema, GradeSchemeSchema, LearningOutcomeQuerySchema, LearningOutcomeSchema, UpdateGradeSchemeSchema, UuidParamSchema } from '@smart-school/contracts';
import type { z } from 'zod';
import type { AuthContext } from '../auth/auth.types.js';
import { CurrentAuth, RequirePermissions } from '../auth/decorators.js';
import { requestMeta } from '../common/request-meta.js';
import { SchemesService } from './schemes.service.js';

@ApiTags('Penilaian')
@Controller()
export class GradingController {
  constructor(private readonly schemes: SchemesService) {}

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
