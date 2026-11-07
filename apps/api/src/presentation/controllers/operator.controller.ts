import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser as CurrentUserShape } from '../../application/auth.service';
import { EntryView, QueueSummary } from '../../application/queue.service';
import { ServiceDeskService } from '../../application/service-desk.service';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Roles } from '../decorators/roles.decorator';
import { RolesGuard } from '../guards/roles.guard';
import { SessionAuthGuard } from '../guards/session-auth.guard';

/** F-03 reads for the /operator page (contract 4.1, 4.2). */
@Controller('operator')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles('OPERATOR')
export class OperatorController {
  constructor(private readonly desk: ServiceDeskService) {}

  @Get('queues')
  queues(@CurrentUser() user: CurrentUserShape): Promise<QueueSummary[]> {
    return this.desk.assignedQueues(user.id);
  }

  @Get('current-entry')
  currentEntry(@CurrentUser() user: CurrentUserShape): Promise<{ entry: EntryView | null }> {
    return this.desk.currentEntry(user.id);
  }
}
