import { Controller, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser as CurrentUserShape } from '../../application/auth.service';
import { LifecycleService } from '../../application/lifecycle.service';
import { EntryView } from '../../application/queue.service';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Roles } from '../decorators/roles.decorator';
import { RolesGuard } from '../guards/roles.guard';
import { SessionAuthGuard } from '../guards/session-auth.guard';

/** Sprint 2 lifecycle endpoints (docs/sprints/sprint-2/README.md 3.4). Roles are set per route. */
@Controller()
@UseGuards(SessionAuthGuard, RolesGuard)
export class LifecycleController {
  constructor(private readonly lifecycle: LifecycleService) {}

  /** F-05: POST /api/entries/:id/no-show (calling operator, after the grace period). */
  @Post('entries/:id/no-show')
  @HttpCode(200)
  @Roles('OPERATOR')
  noShow(@CurrentUser() user: CurrentUserShape, @Param('id') id: string): Promise<EntryView> {
    return this.lifecycle.noShow(user.id, id);
  }
}
