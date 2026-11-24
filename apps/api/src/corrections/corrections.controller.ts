import { ApiTags } from '@nestjs/swagger';
import { Body, Controller, Get, HttpCode, Param, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CorrectionListQuerySchema, CreateCorrectionSchema, ReviewCorrectionSchema, UuidParamSchema } from '@smart-school/contracts';
import type { z } from 'zod';
import type { AuthContext } from '../auth/auth.types.js';
import { CurrentAuth, RequirePermissions } from '../auth/decorators.js';
import { requestMeta } from '../common/request-meta.js';
import { CorrectionsService } from './corrections.service.js';

const Id = { schema: UuidParamSchema };

@ApiTags('Koreksi data')
@Controller()
export class CorrectionsController {
  constructor(private readonly corrections: CorrectionsService) {}

  @Post('me/corrections')
  create(@CurrentAuth() auth: AuthContext, @Body({ schema: CreateCorrectionSchema }) body: z.infer<typeof CreateCorrectionSchema>, @Req() req: Request) {
    return this.corrections.create(auth, body, requestMeta(req));
  }

  @Get('me/corrections')
  mine(@CurrentAuth() auth: AuthContext) {
    return this.corrections.mine(auth);
  }

  @Post('me/corrections/:id/cancel')
  @HttpCode(204)
  cancel(@CurrentAuth() auth: AuthContext, @Param('id', Id) id: string, @Req() req: Request) {
    return this.corrections.cancel(auth, id, requestMeta(req));
  }

  @Get('corrections')
  @RequirePermissions('corrections:review')
  list(@CurrentAuth() auth: AuthContext, @Query({ schema: CorrectionListQuerySchema }) q: z.infer<typeof CorrectionListQuerySchema>) {
    return this.corrections.list(auth, q.status);
  }

  @Post('corrections/:id/approve')
  @HttpCode(204)
  @RequirePermissions('corrections:review')
  approve(
    @CurrentAuth() auth: AuthContext,
    @Param('id', Id) id: string,
    @Body({ schema: ReviewCorrectionSchema }) body: z.infer<typeof ReviewCorrectionSchema>,
    @Req() req: Request,
  ) {
    return this.corrections.approve(auth, id, body.note, requestMeta(req));
  }

  @Post('corrections/:id/reject')
  @HttpCode(204)
  @RequirePermissions('corrections:review')
  reject(
    @CurrentAuth() auth: AuthContext,
    @Param('id', Id) id: string,
    @Body({ schema: ReviewCorrectionSchema }) body: z.infer<typeof ReviewCorrectionSchema>,
    @Req() req: Request,
  ) {
    return this.corrections.reject(auth, id, body.note, requestMeta(req));
  }
}
