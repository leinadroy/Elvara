import { Controller, Get } from '@nestjs/common';
import type { HealthResponse } from '@smart-school/contracts';
import { PrismaService } from '../prisma/prisma.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(): Promise<HealthResponse> {
    const database = await this.prisma.$queryRaw`SELECT 1`.then(
      () => 'up' as const,
      () => 'down' as const,
    );
    return {
      status: database === 'up' ? 'ok' : 'degraded',
      service: 'api',
      version: process.env.npm_package_version ?? '0.0.0',
      time: new Date().toISOString(),
      checks: { database },
    };
  }
}
