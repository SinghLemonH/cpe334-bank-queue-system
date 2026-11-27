import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { APP_VERSION } from '../src/presentation/version.controller';
import { createTestApp } from './helpers/test-app';

/** Lab 5 R-08: the running release can be identified from the live URL. */
describe('GET /api/version', () => {
  let app: INestApplication;
  const savedSha = process.env.GIT_SHA;

  beforeAll(async () => {
    ({ app } = await createTestApp());
  });

  afterEach(() => {
    if (savedSha === undefined) delete process.env.GIT_SHA;
    else process.env.GIT_SHA = savedSha;
  });

  afterAll(async () => {
    await app.close();
  });

  it('is public and returns the release name and the full commit SHA from GIT_SHA', async () => {
    const sha = '3c6d368a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e';
    process.env.GIT_SHA = sha;

    const res = await request(app.getHttpServer()).get('/api/version').expect(200);

    expect(res.body).toEqual({ version: APP_VERSION, commit: sha });
    expect(APP_VERSION).toBe('0.4.0-sprint2');
  });

  it('reports commit "local" when GIT_SHA is not set (local runs)', async () => {
    delete process.env.GIT_SHA;

    const res = await request(app.getHttpServer()).get('/api/version').expect(200);

    expect(res.body.commit).toBe('local');
  });
});
