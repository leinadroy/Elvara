import { Body, Controller, Get, HttpCode, Param, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CancelWorkShiftSchema, MyWorkShiftQuerySchema, UuidParamSchema, WorkShiftQuerySchema, WorkShiftSchema } from '@smart-school/contracts';
import type { z } from 'zod';
import type { AuthContext } from '../auth/auth.types.js';
import { CurrentAuth, RequirePermissions } from '../auth/decorators.js';
import { requestMeta } from '../common/request-meta.js';
import { WorkShiftsService } from './work-shifts.service.js';

@Controller()
export class StaffController {
  constructor(private readonly shifts: WorkShiftsService) {}

  @Get('work-shifts/options')
  @RequirePermissions('work-shifts:manage')
  options(@CurrentAuth() auth: AuthContext) {
    return this.shifts.options(auth);
  }

  @Get('work-shifts')
  @RequirePermissions('work-shifts:read')
  list(@CurrentAuth() auth: AuthContext, @Query({ schema: WorkShiftQuerySchema }) q: z.infer<typeof WorkShiftQuerySchema>) {
    return this.shifts.list(auth, q);
  }

  @Post('work-shifts')
  @RequirePermissions('work-shifts:manage')
  create(@CurrentAuth() auth: AuthContext, @Body({ schema: WorkShiftSchema }) body: z.infer<typeof WorkShiftSchema>, @Req() req: Request) {
    return this.shifts.create(auth, body, requestMeta(req));
  }

  @Post('work-shifts/:id/cancel')
  @HttpCode(204)
  @RequirePermissions('work-shifts:manage')
  cancel(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Body({ schema: CancelWorkShiftSchema }) body: z.infer<typeof CancelWorkShiftSchema>, @Req() req: Request) {
    return this.shifts.cancel(auth, id, body.reason, requestMeta(req));
  }

  /** Tugas milik pegawai yang sedang masuk (staf maupun guru piket). */
  @Get('me/work-shifts')
  mine(@CurrentAuth() auth: AuthContext, @Query({ schema: MyWorkShiftQuerySchema }) q: z.infer<typeof MyWorkShiftQuerySchema>) {
    return this.shifts.mine(auth, q);
  }
}
