import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { HealthController } from '../src/presentation/health.controller';
import { CLOCK_TOKEN, ManualClock } from '../src/common/clock';

describe('HealthController (Unit/Integration)', () => {
  let app: INestApplication;
  const mockClock = new ManualClock(new Date('2026-11-05T08:00:00.000Z'));

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: CLOCK_TOKEN,
          useValue: mockClock,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns status ok with clock timestamp and date', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);

    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBe('2026-11-05T08:00:00.000Z');
    expect(res.body.today).toBe('2026-11-05');
  });
});
