import { Controller, Get, Query } from '@nestjs/common';
import { AuditListQuerySchema } from '@smart-school/contracts';
import type { z } from 'zod';
import { CurrentAuth, RequirePermissions } from '../auth/decorators.js';
import type { AuthContext } from '../auth/auth.types.js';
import { AuditService } from './audit.service.js';

@Controller('audit-events')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @RequirePermissions('audit:read')
  list(@CurrentAuth() auth: AuthContext, @Query({ schema: AuditListQuerySchema }) q: z.infer<typeof AuditListQuerySchema>) {
    return this.audit.list(auth.schoolId, q);
  }
}
