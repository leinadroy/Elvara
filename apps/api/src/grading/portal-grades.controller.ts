import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PortalGradesQuerySchema } from '@smart-school/contracts';
import type { z } from 'zod';
import type { AuthContext } from '../auth/auth.types.js';
import { CurrentAuth, RequireActiveRole } from '../auth/decorators.js';
import { PortalGradesService } from './portal-grades.service.js';

@ApiTags('Nilai portal')
@Controller('me/grades')
@RequireActiveRole('STUDENT', 'GUARDIAN')
export class PortalGradesController {
  constructor(private readonly grades: PortalGradesService) {}

  @Get()
  list(@CurrentAuth() auth: AuthContext, @Query({ schema: PortalGradesQuerySchema }) query: z.infer<typeof PortalGradesQuerySchema>) {
    return this.grades.list(auth, query.studentId);
  }
}
