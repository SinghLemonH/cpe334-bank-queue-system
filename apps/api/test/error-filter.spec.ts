import { Test } from '@nestjs/testing';
import {
  Body,
  Controller,
  Get,
  INestApplication,
  InternalServerErrorException,
  Post,
  ServiceUnavailableException,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { IsString } from 'class-validator';
import * as request from 'supertest';
import { GlobalHttpExceptionFilter } from '../src/common/http-exception.filter';
import { DuplicateActiveEntryError } from '../src/common/errors';

class ProbeDto {
  @IsString()
  name!: string;
}

@Controller('probe')
class ProbeController {
  @Get('domain')
  domain() {
    throw new DuplicateActiveEntryError();
  }

  @Get('unauthenticated')
  unauthenticated() {
    throw new UnauthorizedException();
  }

  @Get('boom')
  boom() {
    throw new Error('relation "queue_entries" does not exist: SELECT * FROM users');
  }

  @Get('http-500')
  http500() {
    throw new InternalServerErrorException('pg pool exhausted on host db-internal:5432 user=queue');
  }

  @Get('http-503')
  http503() {
    throw new ServiceUnavailableException('upstream secret-service timed out');
  }

  @Post('validate')
  validate(@Body() _body: ProbeDto) {
    return { ok: true };
  }
}

describe('GlobalHttpExceptionFilter error contract', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ controllers: [ProbeController] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new GlobalHttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('domain error: 409 with exactly { error: { code, message } }', async () => {
    const res = await request(app.getHttpServer()).get('/probe/domain').expect(409);
    expect(Object.keys(res.body)).toEqual(['error']);
    expect(res.body.error.code).toBe('DUPLICATE_ACTIVE_ENTRY');
    expect(typeof res.body.error.message).toBe('string');
  });

  it('framework 401 maps to code UNAUTHENTICATED', async () => {
    const res = await request(app.getHttpServer()).get('/probe/unauthenticated').expect(401);
    expect(Object.keys(res.body)).toEqual(['error']);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('validation failure: 400 VALIDATION_FAILED with a string message', async () => {
    const res = await request(app.getHttpServer())
      .post('/probe/validate')
      .send({ unknownField: 1 })
      .expect(400);
    expect(Object.keys(res.body)).toEqual(['error']);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    expect(typeof res.body.error.message).toBe('string');
  });

  it('unknown error: 500 without leaking internal details', async () => {
    const res = await request(app.getHttpServer()).get('/probe/boom').expect(500);
    expect(Object.keys(res.body)).toEqual(['error']);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(res.body)).not.toMatch(/queue_entries|SELECT|users/);
  });

  it('custom 5xx HttpException: generic message, no internal details', async () => {
    const res = await request(app.getHttpServer()).get('/probe/http-500').expect(500);
    expect(res.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
    expect(JSON.stringify(res.body)).not.toMatch(/pool|db-internal|5432|user=/);
  });

  it('any 5xx HttpException keeps its status but hides its message', async () => {
    const res = await request(app.getHttpServer()).get('/probe/http-503').expect(503);
    expect(res.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
    expect(JSON.stringify(res.body)).not.toMatch(/secret-service/);
  });
});
