import { Body, Controller, Get, HttpCode, Param, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import {
  AttendanceCorrectionQuerySchema,
  CancelSessionSchema,
  OpenSessionSchema,
  PersonalAttendanceQuerySchema,
  RecapQuerySchema,
  RequestAttendanceCorrectionSchema,
  ReviewAttendanceCorrectionSchema,
  SaveRecordsSchema,
  UuidParamSchema,
} from '@smart-school/contracts';
import { z } from 'zod';
import type { AuthContext } from '../auth/auth.types.js';
import { CurrentAuth, RequirePermissions } from '../auth/decorators.js';
import { requestMeta } from '../common/request-meta.js';
import { AttendanceService } from './attendance.service.js';

const PersonalQuery = PersonalAttendanceQuerySchema.extend({ studentId: z.uuid().optional() });

/** Hak akses rinci (guru penugasan, wali kelas, admin) diperiksa di service berdasarkan data. */
@Controller()
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Get('teacher/today')
  @RequirePermissions('attendance:take')
  today(@CurrentAuth() auth: AuthContext) {
    return this.attendance.teacherToday(auth);
  }

  @Post('attendance/sessions')
  @HttpCode(200)
  @RequirePermissions('attendance:take')
  open(@CurrentAuth() auth: AuthContext, @Body({ schema: OpenSessionSchema }) body: z.infer<typeof OpenSessionSchema>, @Req() req: Request) {
    return this.attendance.open(auth, body, requestMeta(req));
  }

  @Get('attendance/sessions/:id')
  get(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string) {
    return this.attendance.get(auth, id);
  }

  @Post('attendance/sessions/:id/records')
  @HttpCode(200)
  @RequirePermissions('attendance:take')
  save(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Body({ schema: SaveRecordsSchema }) body: z.infer<typeof SaveRecordsSchema>, @Req() req: Request) {
    return this.attendance.save(auth, id, body, requestMeta(req));
  }

  @Post('attendance/sessions/:id/close')
  @HttpCode(204)
  @RequirePermissions('attendance:take')
  close(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Req() req: Request) {
    return this.attendance.close(auth, id, requestMeta(req));
  }

  @Post('attendance/sessions/:id/cancel')
  @HttpCode(204)
  @RequirePermissions('attendance:take')
  cancel(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Body({ schema: CancelSessionSchema }) body: z.infer<typeof CancelSessionSchema>, @Req() req: Request) {
    return this.attendance.cancel(auth, id, body.reason, requestMeta(req));
  }

  @Post('attendance/records/:id/corrections')
  requestCorrection(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Body({ schema: RequestAttendanceCorrectionSchema }) body: z.infer<typeof RequestAttendanceCorrectionSchema>, @Req() req: Request) {
    return this.attendance.requestCorrection(auth, id, body, requestMeta(req));
  }

  @Get('attendance/corrections')
  corrections(@CurrentAuth() auth: AuthContext, @Query({ schema: AttendanceCorrectionQuerySchema }) q: z.infer<typeof AttendanceCorrectionQuerySchema>) {
    return this.attendance.corrections(auth, q.decision);
  }

  @Post('attendance/corrections/:id/approve')
  @HttpCode(204)
  approve(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Body({ schema: ReviewAttendanceCorrectionSchema }) body: z.infer<typeof ReviewAttendanceCorrectionSchema>, @Req() req: Request) {
    return this.attendance.decide(auth, id, true, body.note, requestMeta(req));
  }

  @Post('attendance/corrections/:id/reject')
  @HttpCode(204)
  reject(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Body({ schema: ReviewAttendanceCorrectionSchema }) body: z.infer<typeof ReviewAttendanceCorrectionSchema>, @Req() req: Request) {
    return this.attendance.decide(auth, id, false, body.note, requestMeta(req));
  }

  @Get('attendance/recap')
  recap(@CurrentAuth() auth: AuthContext, @Query({ schema: RecapQuerySchema }) q: z.infer<typeof RecapQuerySchema>) {
    return this.attendance.recap(auth, q.classGroupId, q.from, q.to);
  }

  @Get('me/attendance')
  personal(@CurrentAuth() auth: AuthContext, @Query({ schema: PersonalQuery }) q: z.infer<typeof PersonalQuery>) {
    return this.attendance.personal(auth, q);
  }
}
