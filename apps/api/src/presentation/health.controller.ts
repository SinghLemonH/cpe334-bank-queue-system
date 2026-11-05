import { Controller, Get, Inject } from '@nestjs/common';
import { CLOCK_TOKEN, IClock } from '../common/clock';

@Controller('health')
export class HealthController {
  constructor(@Inject(CLOCK_TOKEN) private readonly clock: IClock) {}

  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: this.clock.now().toISOString(),
      today: this.clock.today(),
    };
  }
}
