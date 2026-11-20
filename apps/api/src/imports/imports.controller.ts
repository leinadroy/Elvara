import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ImportStudentsSchema, UuidParamSchema } from '@smart-school/contracts';
import type { z } from 'zod';
import type { AuthContext } from '../auth/auth.types.js';
import { CurrentAuth, RequirePermissions } from '../auth/decorators.js';
import { requestMeta } from '../common/request-meta.js';
import { ImportsService } from './imports.service.js';

@Controller('imports')
@RequirePermissions('imports:manage')
export class ImportsController {
  constructor(private readonly imports: ImportsService) {}

  @Get()
  list(@CurrentAuth() auth: AuthContext) {
    return this.imports.list(auth);
  }

  @Post('students')
  importStudents(@CurrentAuth() auth: AuthContext, @Body({ schema: ImportStudentsSchema }) body: z.infer<typeof ImportStudentsSchema>, @Req() req: Request) {
    return this.imports.importStudents(auth, body, requestMeta(req));
  }

  @Get(':id')
  get(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string) {
    return this.imports.get(auth, id);
  }
}
