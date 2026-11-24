import { ConsoleLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { SESSION_COOKIE } from '@smart-school/contracts';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import type { Env } from './config/env.js';

async function bootstrap() {
  // Log terstruktur (JSON per baris) di produksi atau bila LOG_JSON=true; format mudah dibaca saat development.
  const json = process.env.NODE_ENV === 'production' || process.env.LOG_JSON === 'true';
  const app = await NestFactory.create(AppModule, { logger: new ConsoleLogger({ json, colors: !json }) });
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: config.get('WEB_ORIGIN', { infer: true }).split(',').map((o) => o.trim()),
    credentials: true,
  });
  app.enableShutdownHooks();

  // Dokumentasi OpenAPI (PRD bagian 8). Skema request diambil otomatis dari skema Zod (Standard Schema, Zod ≥ 4.2).
  // Rute dokumentasi tidak dilindungi guard, jadi hanya disajikan di luar produksi.
  if (config.get('NODE_ENV', { infer: true }) !== 'production') {
    const doc = new DocumentBuilder()
      .setTitle('Elvara School Ecosystem API')
      .setDescription('API v1. Autentikasi memakai cookie sesi; mutasi dari browser wajib dari origin web yang diizinkan.')
      .setVersion(process.env.npm_package_version ?? '0.0.0')
      .addCookieAuth(SESSION_COOKIE)
      .build();
    SwaggerModule.setup('api/v1/docs', app, () => SwaggerModule.createDocument(app, doc), { jsonDocumentUrl: 'api/v1/docs-json' });
  }

  await app.listen(config.get('PORT', { infer: true }));
}
await bootstrap();
