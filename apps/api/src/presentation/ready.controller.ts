import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Readiness probe (public): 200 when the API can reach the database, 503 otherwise.
 * Used by the deploy smoke test; /api/health stays a pure liveness check.
 */
@Controller('ready')
export class ReadyController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  async check() {
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException('Database is not reachable');
    }
    return { status: 'ready' };
  }
}
