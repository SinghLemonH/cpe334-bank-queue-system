import { Body, Controller, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser as CurrentUserShape } from '../../application/auth.service';
import { EndDayResult, LifecycleService } from '../../application/lifecycle.service';
import { EntryView, QueueSummary } from '../../application/queue.service';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Roles } from '../decorators/roles.decorator';
import { SetQueueOpenDto } from '../dto/set-queue-open.dto';
import { JsonBodyGuard } from '../guards/json-body.guard';
import { RolesGuard } from '../guards/roles.guard';
import { SessionAuthGuard } from '../guards/session-auth.guard';

/**
 * Sprint 2 lifecycle endpoints (docs/sprints/sprint-2/README.md 3.4). Roles are set per route.
 * Order of rejections: 401 (session) -> 403 (role) -> 415/400 (body) -> 404 / 403 / 409 (service).
 */
@Controller()
@UseGuards(SessionAuthGuard, RolesGuard)
export class LifecycleController {
  constructor(private readonly lifecycle: LifecycleService) {}

  /** F-04: POST /api/entries/:id/cancel (owner customer; another customer's entry is 404). */
  @Post('entries/:id/cancel')
  @HttpCode(200)
  @Roles('CUSTOMER')
  cancel(@CurrentUser() user: CurrentUserShape, @Param('id') id: string): Promise<EntryView> {
    return this.lifecycle.cancel(user.id, id);
  }

  /** F-05: POST /api/entries/:id/no-show (calling operator, after the grace period). */
  @Post('entries/:id/no-show')
  @HttpCode(200)
  @Roles('OPERATOR')
  noShow(@CurrentUser() user: CurrentUserShape, @Param('id') id: string): Promise<EntryView> {
    return this.lifecycle.noShow(user.id, id);
  }

  /** F-08: PATCH /api/queues/:code with { isOpen } (assigned operator, JSON only). */
  @Patch('queues/:code')
  @Roles('OPERATOR')
  @UseGuards(JsonBodyGuard)
  setOpen(
    @CurrentUser() user: CurrentUserShape,
    @Param('code') code: string,
    @Body() body: SetQueueOpenDto,
  ): Promise<QueueSummary> {
    return this.lifecycle.setOpen(user.id, code, body.isOpen);
  }

  /** F-08: POST /api/queues/:code/end-day (assigned operator). */
  @Post('queues/:code/end-day')
  @HttpCode(200)
  @Roles('OPERATOR')
  endDay(@CurrentUser() user: CurrentUserShape, @Param('code') code: string): Promise<EndDayResult> {
    return this.lifecycle.endDay(user.id, code);
  }
}
