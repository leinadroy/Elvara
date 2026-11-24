import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { validateEnv } from './config/env.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { HealthController } from './health/health.controller.js';
import { RequestIdMiddleware } from './common/request-id.middleware.js';
import { RequestLogMiddleware } from './common/request-log.middleware.js';
import { JobStatusModule } from './common/job-status.service.js';
import { ApiExceptionFilter } from './common/api-exception.filter.js';
import { createValidationPipe } from './common/validation.js';
import { AuditModule } from './audit/audit.module.js';
import { AuthModule } from './auth/auth.module.js';
import { AccountsModule } from './accounts/accounts.module.js';
import { SchoolModule } from './school/school.module.js';
import { PeopleModule } from './people/people.module.js';
import { ImportsModule } from './imports/imports.module.js';
import { DocumentsModule } from './documents/documents.module.js';
import { CorrectionsModule } from './corrections/corrections.module.js';
import { AcademicsModule } from './academics/academics.module.js';
import { CommunicationsModule } from './communications/communications.module.js';
import { AttendanceModule } from './attendance/attendance.module.js';
import { StaffModule } from './staff/staff.module.js';
import { GradingModule } from './grading/grading.module.js';

/**
 * Modular monolith: setiap domain menjadi module sendiri dan hanya berbagi data lewat service.
 * R0 Fondasi: auth, audit, accounts (akun & undangan), school (gedung, ruang, tahun ajaran),
 * people (siswa, pegawai, wali, hubungan wali), imports.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    ScheduleModule.forRoot(),
    JobStatusModule,
    PrismaModule,
    AuditModule,
    AuthModule,
    AccountsModule,
    SchoolModule,
    PeopleModule,
    ImportsModule,
    DocumentsModule,
    CorrectionsModule,
    AcademicsModule,
    CommunicationsModule,
    AttendanceModule,
    StaffModule,
    GradingModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_PIPE, useFactory: createValidationPipe },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware, RequestLogMiddleware).forRoutes('*path');
  }
}
