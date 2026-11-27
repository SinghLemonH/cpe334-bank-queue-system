import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser as CurrentUserShape } from '../../application/auth.service';
import { EntryView, QueueService, QueueSummary } from '../../application/queue.service';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Roles } from '../decorators/roles.decorator';
import { JoinQueueDto } from '../dto/join-queue.dto';
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

  /**
   * Joins a queue. Intentionally omits JsonBodyGuard so empty POST requests without
   * Content-Type still succeed (AC-56 / TEST-56); any client body fields are rejected by JoinQueueDto.
   */
  @Post(':code/entries')
  @HttpCode(201)
  @Roles('CUSTOMER')
  join(
    @CurrentUser() user: CurrentUserShape,
    @Param('code') code: string,
    @Body() _body?: JoinQueueDto,
  ): Promise<EntryView> {
    void _body;
    return this.queues.join(user.id, code);
  }
}
