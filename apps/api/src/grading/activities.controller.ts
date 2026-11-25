import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Put, Query, Req, Res, StreamableFile, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ActivityListQuerySchema, ActivitySchema, PortalActivityQuerySchema, SubmitSchema, UpdateActivitySchema, UuidParamSchema } from '@smart-school/contracts';
import type { z } from 'zod';
import type { AuthContext } from '../auth/auth.types.js';
import { CurrentAuth } from '../auth/decorators.js';
import { requestMeta } from '../common/request-meta.js';
import { UPLOAD_HARD_LIMIT, type UploadedFile as Upload } from '../documents/files.js';
import { ActivitiesService } from './activities.service.js';

/** Tugas dan pengumpulan (E12). Hak akses rinci (guru penugasan, siswa rombel, wali) diperiksa di service. */
@ApiTags('Tugas')
@Controller()
export class ActivitiesController {
  constructor(private readonly activities: ActivitiesService) {}

  @Get('activities')
  list(@CurrentAuth() auth: AuthContext, @Query({ schema: ActivityListQuerySchema }) q: z.infer<typeof ActivityListQuerySchema>) {
    return this.activities.list(auth, q.teachingAssignmentId);
  }

  @Post('activities')
  create(@CurrentAuth() auth: AuthContext, @Body({ schema: ActivitySchema }) body: z.infer<typeof ActivitySchema>, @Req() req: Request) {
    return this.activities.create(auth, body, requestMeta(req));
  }

  @Get('activities/:id')
  detail(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string) {
    return this.activities.detail(auth, id);
  }

  @Put('activities/:id')
  @HttpCode(204)
  update(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Body({ schema: UpdateActivitySchema }) body: z.infer<typeof UpdateActivitySchema>, @Req() req: Request) {
    return this.activities.update(auth, id, body, requestMeta(req));
  }

  @Post('activities/:id/publish')
  @HttpCode(204)
  publish(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Req() req: Request) {
    return this.activities.setStatus(auth, id, 'PUBLISHED', requestMeta(req));
  }

  @Post('activities/:id/close')
  @HttpCode(204)
  close(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Req() req: Request) {
    return this.activities.setStatus(auth, id, 'CLOSED', requestMeta(req));
  }

  @Post('activities/:id/cancel')
  @HttpCode(204)
  cancel(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Req() req: Request) {
    return this.activities.setStatus(auth, id, 'CANCELLED', requestMeta(req));
  }

  @Get('me/activities')
  mine(@CurrentAuth() auth: AuthContext, @Query({ schema: PortalActivityQuerySchema }) q: z.infer<typeof PortalActivityQuerySchema>) {
    return this.activities.portalList(auth, q.studentId);
  }

  @Get('me/activities/:id')
  mineOne(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Query({ schema: PortalActivityQuerySchema }) q: z.infer<typeof PortalActivityQuerySchema>) {
    return this.activities.portalDetail(auth, id, q.studentId);
  }

  @Post('activities/:id/submissions')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: UPLOAD_HARD_LIMIT, files: 1 } }))
  submit(
    @CurrentAuth() auth: AuthContext,
    @Param('id', { schema: UuidParamSchema }) id: string,
    @Body({ schema: SubmitSchema }) body: z.infer<typeof SubmitSchema>,
    @UploadedFile() file: Upload | undefined,
    @Req() req: Request,
  ) {
    return this.activities.submit(auth, id, body, file, requestMeta(req));
  }

  @Get('submissions/:id/versions/:versionNo/file')
  async file(
    @CurrentAuth() auth: AuthContext,
    @Param('id', { schema: UuidParamSchema }) id: string,
    @Param('versionNo', ParseIntPipe) versionNo: number,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const f = await this.activities.openFile(auth, id, versionNo, requestMeta(req));
    res.set({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox" });
    return new StreamableFile(f.stream, { type: f.mimeType, length: f.size, disposition: `attachment; filename*=UTF-8''${encodeURIComponent(f.fileName)}` });
  }
}
