import { Body, Controller, Delete, Get, HttpCode, Param, Post, Req, Res, StreamableFile, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { UploadDocumentSchema, UuidParamSchema } from '@smart-school/contracts';
import type { z } from 'zod';
import type { AuthContext } from '../auth/auth.types.js';
import { CurrentAuth, RequirePermissions } from '../auth/decorators.js';
import { requestMeta } from '../common/request-meta.js';
import { DocumentsService, type UploadedFile as Upload } from './documents.service.js';

const Id = { schema: UuidParamSchema };
/** Batas keras di level parser; batas sebenarnya (MAX_UPLOAD_MB) diperiksa di service. */
const HARD_LIMIT = 50 * 1024 * 1024;

@Controller()
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get('people/:personId/documents')
  list(@CurrentAuth() auth: AuthContext, @Param('personId', Id) personId: string) {
    return this.documents.list(auth, personId);
  }

  @Get('me/documents')
  mine(@CurrentAuth() auth: AuthContext) {
    return auth.personId ? this.documents.list(auth, auth.personId) : [];
  }

  @Post('people/:personId/documents')
  @RequirePermissions('documents:manage')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: HARD_LIMIT, files: 1 } }))
  upload(
    @CurrentAuth() auth: AuthContext,
    @Param('personId', Id) personId: string,
    @Body({ schema: UploadDocumentSchema }) body: z.infer<typeof UploadDocumentSchema>,
    @UploadedFile() file: Upload | undefined,
    @Req() req: Request,
  ) {
    return this.documents.upload(auth, personId, body, file, requestMeta(req));
  }

  /** Isi dokumen: tidak pernah di-cache, diunduh sebagai lampiran, dan browser dilarang menebak tipenya. */
  @Get('documents/:id/content')
  async content(@CurrentAuth() auth: AuthContext, @Param('id', Id) id: string, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const file = await this.documents.open(auth, id, requestMeta(req));
    res.set({
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    });
    return new StreamableFile(file.stream, {
      type: file.mimeType,
      length: file.size,
      disposition: `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
    });
  }

  @Delete('documents/:id')
  @HttpCode(204)
  @RequirePermissions('documents:manage')
  remove(@CurrentAuth() auth: AuthContext, @Param('id', Id) id: string, @Req() req: Request) {
    return this.documents.remove(auth, id, requestMeta(req));
  }
}
