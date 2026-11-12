import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { configureApp } from '../src/app.setup';
import { ReadyController } from '../src/presentation/ready.controller';
import { createTestApp } from './helpers/test-app';

describe('GET /api/ready (readiness probe used by the deploy smoke test)', () => {
  describe('with the real test database', () => {
    let app: INestApplication;

    beforeAll(async () => {
      ({ app } = await createTestApp());
    });

    afterAll(async () => {
      await app.close();
    });

    it('returns 200 { status: "ready" } without a session (public endpoint)', async () => {
      const res = await request(app.getHttpServer()).get('/api/ready').expect(200);
      expect(res.body).toEqual({ status: 'ready' });
    });
  });

  describe('when the database is unreachable', () => {
    let app: INestApplication;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        controllers: [ReadyController],
        providers: [
          {
            provide: DataSource,
            useValue: { query: jest.fn().mockRejectedValue(new Error('connect ECONNREFUSED 10.0.0.1:5432')) },
          },
        ],
      }).compile();
      app = configureApp(moduleRef.createNestApplication());
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    it('returns 503 with the generic error shape and no connection details', async () => {
      const res = await request(app.getHttpServer()).get('/api/ready').expect(503);
      expect(res.body).toEqual({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
      expect(JSON.stringify(res.body)).not.toContain('10.0.0.1');
    });
  });
});
