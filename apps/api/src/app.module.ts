import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { validateEnv } from './config/env.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { HealthController } from './health/health.controller.js';
import { RequestIdMiddleware } from './common/request-id.middleware.js';
import { ApiExceptionFilter } from './common/api-exception.filter.js';

/**
 * Modular monolith: setiap domain (identity, school, people, academics, attendance,
 * communications, finance, facilities, safeguarding, reporting) menjadi module sendiri di src/modules/.
 */
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv }), PrismaModule],
  controllers: [HealthController],
  providers: [{ provide: APP_FILTER, useClass: ApiExceptionFilter }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*path');
  }
}
