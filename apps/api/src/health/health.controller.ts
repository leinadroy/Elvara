import { ApiTags } from '@nestjs/swagger';
import { Controller, Get } from '@nestjs/common';
import type { HealthResponse } from '@smart-school/contracts';
import { PrismaService } from '../prisma/prisma.service.js';
import { Public } from '../auth/decorators.js';
import { JobStatusService } from '../common/job-status.service.js';

@Public()
@ApiTags('Sistem')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobStatusService,
  ) {}

  @Get()
  async check(): Promise<HealthResponse> {
    const database = await this.prisma.$queryRaw`SELECT 1`.then(
      () => 'up' as const,
      () => 'down' as const,
    );
    const jobs = this.jobs.snapshot();
    const jobsHealthy = Object.values(jobs).every((j) => j.state === 'ok' || j.state === 'pending');
    return {
      status: database === 'up' && jobsHealthy ? 'ok' : 'degraded',
      service: 'api',
      version: process.env.npm_package_version ?? '0.0.0',
      time: new Date().toISOString(),
      checks: { database },
      jobs,
    };
  }
}
