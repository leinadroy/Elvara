import { Body, Controller, Get, HttpCode, Param, Post, Put, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CalendarEventSchema, CalendarQuerySchema, CancelCalendarEventSchema, UuidParamSchema } from '@smart-school/contracts';
import type { z } from 'zod';
import type { AuthContext } from '../auth/auth.types.js';
import { CurrentAuth, RequirePermissions } from '../auth/decorators.js';
import { requestMeta } from '../common/request-meta.js';
import { CalendarService } from './calendar.service.js';

@ApiTags('Kalender akademik')
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendar: CalendarService) {}

  /** Agenda terbit untuk pembaca; audiens diperiksa saat dibaca. */
  @Get()
  feed(@CurrentAuth() auth: AuthContext, @Query({ schema: CalendarQuerySchema }) q: z.infer<typeof CalendarQuerySchema>) {
    return this.calendar.feed(auth, q.from, q.to);
  }

  @Get('manage')
  @RequirePermissions('calendar:manage')
  manage(@CurrentAuth() auth: AuthContext, @Query({ schema: CalendarQuerySchema }) q: z.infer<typeof CalendarQuerySchema>) {
    return this.calendar.manage(auth, q.from, q.to);
  }

  @Post()
  @RequirePermissions('calendar:manage')
  create(@CurrentAuth() auth: AuthContext, @Body({ schema: CalendarEventSchema }) body: z.infer<typeof CalendarEventSchema>, @Req() req: Request) {
    return this.calendar.create(auth, body, requestMeta(req));
  }

  @Put(':id')
  @RequirePermissions('calendar:manage')
  update(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Body({ schema: CalendarEventSchema }) body: z.infer<typeof CalendarEventSchema>, @Req() req: Request) {
    return this.calendar.update(auth, id, body, requestMeta(req));
  }

  @Post(':id/publish')
  @HttpCode(204)
  @RequirePermissions('calendar:manage')
  publish(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Req() req: Request) {
    return this.calendar.publish(auth, id, requestMeta(req));
  }

  @Post(':id/cancel')
  @HttpCode(204)
  @RequirePermissions('calendar:manage')
  cancel(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Body({ schema: CancelCalendarEventSchema }) body: z.infer<typeof CancelCalendarEventSchema>, @Req() req: Request) {
    return this.calendar.cancel(auth, id, body.reason, requestMeta(req));
  }
}
