import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { CLOCK_TOKEN, ManualClock } from '../../src/common/clock';

/** Default fixed time for tests: 2026-11-06 10:00 Asia/Bangkok. */
export const DEFAULT_TEST_TIME = new Date('2026-11-06T03:00:00.000Z');

export interface TestApp {
  app: INestApplication;
  clock: ManualClock;
}

/** Builds the real AppModule against the test database with a ManualClock. */
export async function createTestApp(clock = new ManualClock(DEFAULT_TEST_TIME)): Promise<TestApp> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(CLOCK_TOKEN)
    .useValue(clock)
    .compile();
  const app = configureApp(moduleRef.createNestApplication());
  await app.init();
  return { app, clock };
}

/** Returns the value of the `sid` cookie from a Set-Cookie header list, or undefined. */
export function sidFrom(setCookie: string[] | string | undefined): string | undefined {
  const list = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  const line = list.find((c) => c.startsWith('sid='));
  return line ? decodeURIComponent(line.split(';')[0].slice('sid='.length)) : undefined;
}
