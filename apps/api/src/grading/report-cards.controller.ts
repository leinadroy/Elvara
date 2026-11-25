import { Body, Controller, Get, HttpCode, Param, Post, Put, Query, Req, Res, StreamableFile } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import {
  PortalReportCardsQuerySchema,
  ReportCardClassQuerySchema,
  ReportCardIdsSchema,
  ReportCardNoteSchema,
  ReportCardOverviewQuerySchema,
  ReportDescriptionsQuerySchema,
  ReturnReportCardSchema,
  ReviseReportCardSchema,
  SaveReportDescriptionsSchema,
  UuidParamSchema,
} from '@smart-school/contracts';
import type { z } from 'zod';
import type { AuthContext } from '../auth/auth.types.js';
import { CurrentAuth, RequirePermissions } from '../auth/decorators.js';
import { requestMeta } from '../common/request-meta.js';
import { ReportCardsService } from './report-cards.service.js';

/** Rapor (E15). Wali kelas, guru mapel, siswa dan wali diperiksa berdasarkan data di service. */
@ApiTags('Rapor')
@Controller()
export class ReportCardsController {
  constructor(private readonly cards: ReportCardsService) {}

  @Get('report-cards/overview')
  overview(@CurrentAuth() auth: AuthContext, @Query({ schema: ReportCardOverviewQuerySchema }) q: z.infer<typeof ReportCardOverviewQuerySchema>) {
    return this.cards.overview(auth, q.termId);
  }

  @Get('report-cards')
  classView(@CurrentAuth() auth: AuthContext, @Query({ schema: ReportCardClassQuerySchema }) q: z.infer<typeof ReportCardClassQuerySchema>) {
    return this.cards.classView(auth, q.classGroupId, q.termId);
  }

  @Get('report-cards/descriptions')
  descriptions(@CurrentAuth() auth: AuthContext, @Query({ schema: ReportDescriptionsQuerySchema }) q: z.infer<typeof ReportDescriptionsQuerySchema>) {
    return this.cards.descriptions(auth, q.teachingAssignmentId);
  }

  @Put('report-cards/descriptions')
  @HttpCode(204)
  saveDescriptions(@CurrentAuth() auth: AuthContext, @Body({ schema: SaveReportDescriptionsSchema }) body: z.infer<typeof SaveReportDescriptionsSchema>, @Req() req: Request) {
    return this.cards.saveDescriptions(auth, body, requestMeta(req));
  }

  @Post('report-cards/submit')
  @HttpCode(204)
  submit(@CurrentAuth() auth: AuthContext, @Body({ schema: ReportCardIdsSchema }) body: z.infer<typeof ReportCardIdsSchema>, @Req() req: Request) {
    return this.cards.submit(auth, body.ids, requestMeta(req));
  }

  @Post('report-cards/approve')
  @HttpCode(204)
  @RequirePermissions('report-cards:approve')
  approve(@CurrentAuth() auth: AuthContext, @Body({ schema: ReportCardIdsSchema }) body: z.infer<typeof ReportCardIdsSchema>, @Req() req: Request) {
    return this.cards.approve(auth, body.ids, requestMeta(req));
  }

  @Get('report-cards/versions/:id/file')
  async file(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const f = await this.cards.openFile(auth, id, requestMeta(req));
    res.set({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
    return new StreamableFile(f.stream, { type: 'application/pdf', length: f.size, disposition: `attachment; filename="${f.fileName}"` });
  }

  @Get('report-cards/:id')
  detail(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string) {
    return this.cards.detail(auth, id);
  }

  @Put('report-cards/:id/note')
  @HttpCode(204)
  note(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Body({ schema: ReportCardNoteSchema }) body: z.infer<typeof ReportCardNoteSchema>, @Req() req: Request) {
    return this.cards.setNote(auth, id, body.homeroomNote, requestMeta(req));
  }

  @Post('report-cards/:id/return')
  @HttpCode(204)
  @RequirePermissions('report-cards:approve')
  returnCard(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Body({ schema: ReturnReportCardSchema }) body: z.infer<typeof ReturnReportCardSchema>, @Req() req: Request) {
    return this.cards.returnCard(auth, id, body.note, requestMeta(req));
  }

  @Post('report-cards/:id/revise')
  @HttpCode(204)
  revise(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Body({ schema: ReviseReportCardSchema }) body: z.infer<typeof ReviseReportCardSchema>, @Req() req: Request) {
    return this.cards.revise(auth, id, body.reason, requestMeta(req));
  }

  @Get('me/report-cards')
  mine(@CurrentAuth() auth: AuthContext, @Query({ schema: PortalReportCardsQuerySchema }) q: z.infer<typeof PortalReportCardsQuerySchema>) {
    return this.cards.portalList(auth, q.studentId);
  }
}
