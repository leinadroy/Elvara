import { ApiTags } from '@nestjs/swagger';
import { Body, Controller, Get, HttpCode, Param, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CreateAnnouncementSchema, NotificationQuerySchema, UuidParamSchema } from '@smart-school/contracts';
import type { z } from 'zod';
import type { AuthContext } from '../auth/auth.types.js';
import { CurrentAuth, RequirePermissions } from '../auth/decorators.js';
import { requestMeta } from '../common/request-meta.js';
import { AnnouncementsService } from './announcements.service.js';
import { NotificationsService } from './notifications.service.js';

@ApiTags('Komunikasi')
@Controller()
export class CommunicationsController {
  constructor(
    private readonly announcements: AnnouncementsService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Pengumuman untuk pembaca; audiens diperiksa saat dibaca. */
  @Get('announcements')
  feed(@CurrentAuth() auth: AuthContext) {
    return this.announcements.feed(auth);
  }

  @Get('announcements/manage')
  @RequirePermissions('announcements:publish')
  manage(@CurrentAuth() auth: AuthContext) {
    return this.announcements.manageList(auth);
  }

  @Post('announcements')
  @RequirePermissions('announcements:publish')
  create(@CurrentAuth() auth: AuthContext, @Body({ schema: CreateAnnouncementSchema }) body: z.infer<typeof CreateAnnouncementSchema>, @Req() req: Request) {
    return this.announcements.create(auth, body, requestMeta(req));
  }

  @Post('announcements/:id/withdraw')
  @HttpCode(204)
  @RequirePermissions('announcements:publish')
  withdraw(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Req() req: Request) {
    return this.announcements.withdraw(auth, id, requestMeta(req));
  }

  @Post('announcements/:id/read')
  @HttpCode(204)
  read(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string) {
    return this.announcements.markRead(auth, id);
  }

  @Get('notifications')
  list(@CurrentAuth() auth: AuthContext, @Query({ schema: NotificationQuerySchema }) q: z.infer<typeof NotificationQuerySchema>) {
    return this.notifications.list(auth, q.unread);
  }

  @Post('notifications/read-all')
  @HttpCode(204)
  readAll(@CurrentAuth() auth: AuthContext) {
    return this.notifications.markAllRead(auth);
  }

  @Post('notifications/:id/read')
  @HttpCode(204)
  readOne(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string) {
    return this.notifications.markRead(auth, id);
  }
}
