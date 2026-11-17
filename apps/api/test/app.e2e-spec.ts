import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { HealthResponseSchema } from '@smart-school/contracts';
import { AppModule } from './../src/app.module.js';

describe('API (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    process.env.DATABASE_URL ??= 'postgresql://smartschool:smartschool@localhost:5432/smart_school?schema=public';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  it('GET /api/v1/health returns a valid health payload with a request id', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    expect(HealthResponseSchema.safeParse(res.body).success).toBe(true);
    expect(res.headers['x-request-id']).toBeTruthy();
  });

  it('unknown routes return the ApiError format', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/does-not-exist').expect(404);
    expect(res.body).toMatchObject({ code: 'NOT_FOUND', requestId: res.headers['x-request-id'] });
  });

  afterEach(async () => {
    await app.close();
  });
});
