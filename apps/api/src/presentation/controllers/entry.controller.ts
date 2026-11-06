import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CurrentUser as CurrentUserShape } from '../../application/auth.service';
import { EntryView, QueueService } from '../../application/queue.service';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Roles } from '../decorators/roles.decorator';
import { RolesGuard } from '../guards/roles.guard';
import { SessionAuthGuard } from '../guards/session-auth.guard';

/** F-02 "my ticket" reads. Operators are rejected; another customer's id is 404. */
@Controller()
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles('CUSTOMER')
export class EntryController {
  constructor(private readonly queues: QueueService) {}

  @Get('me/entries')
  mine(@CurrentUser() user: CurrentUserShape): Promise<EntryView[]> {
    return this.queues.myEntriesToday(user.id);
  }

  @Get('entries/:id')
  one(@CurrentUser() user: CurrentUserShape, @Param('id') id: string): Promise<EntryView> {
    return this.queues.getOwnEntry(user.id, id);
  }
}
