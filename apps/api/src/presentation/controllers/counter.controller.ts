import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CurrentUser as CurrentUserShape } from '../../application/auth.service';
import { CounterItem, CounterService } from '../../application/counter.service';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Roles } from '../decorators/roles.decorator';
import { RolesGuard } from '../guards/roles.guard';
import { SessionAuthGuard } from '../guards/session-auth.guard';

/** F-07 counter list: GET /api/queues/:code/counters (contract 4.4). */
@Controller('queues')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles('OPERATOR')
export class CounterController {
  constructor(private readonly counters: CounterService) {}

  @Get(':code/counters')
  list(
    @CurrentUser() user: CurrentUserShape,
    @Param('code') code: string,
  ): Promise<CounterItem[]> {
    return this.counters.listForQueue(user.id, code);
  }
}
