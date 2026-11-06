import { Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser as CurrentUserShape } from '../../application/auth.service';
import { EntryView, QueueService, QueueSummary } from '../../application/queue.service';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Roles } from '../decorators/roles.decorator';
import { RolesGuard } from '../guards/roles.guard';
import { SessionAuthGuard } from '../guards/session-auth.guard';

/** F-02 queue list and join. Identity comes only from the session cookie. */
@Controller('queues')
@UseGuards(SessionAuthGuard, RolesGuard)
export class QueueController {
  constructor(private readonly queues: QueueService) {}

  @Get()
  list(): Promise<QueueSummary[]> {
    return this.queues.listQueues();
  }

  @Post(':code/entries')
  @HttpCode(201)
  @Roles('CUSTOMER')
  join(@CurrentUser() user: CurrentUserShape, @Param('code') code: string): Promise<EntryView> {
    return this.queues.join(user.id, code);
  }
}
