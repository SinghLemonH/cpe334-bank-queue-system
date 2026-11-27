import { Body, Controller, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser as CurrentUserShape } from '../../application/auth.service';
import { EntryView } from '../../application/queue.service';
import { ServiceDeskService } from '../../application/service-desk.service';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Roles } from '../decorators/roles.decorator';
import { CallNextDto } from '../dto/call-next.dto';
import { RolesGuard } from '../guards/roles.guard';
import { SessionAuthGuard } from '../guards/session-auth.guard';

/** F-03 state changes (contract 4.3 to 4.5). Call-next v2 accepts optional counterId. */
@Controller()
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles('OPERATOR')
export class ServiceDeskController {
  constructor(private readonly desk: ServiceDeskService) {}

  @Post('queues/:code/call-next')
  @HttpCode(200)
  callNext(
    @CurrentUser() user: CurrentUserShape,
    @Param('code') code: string,
    @Body() dto?: CallNextDto,
  ): Promise<EntryView> {
    return this.desk.callNext(user.id, code, dto?.counterId);
  }

  @Post('entries/:id/start')
  @HttpCode(200)
  start(@CurrentUser() user: CurrentUserShape, @Param('id') id: string): Promise<EntryView> {
    return this.desk.start(user.id, id);
  }

  @Post('entries/:id/complete')
  @HttpCode(200)
  complete(@CurrentUser() user: CurrentUserShape, @Param('id') id: string): Promise<EntryView> {
    return this.desk.complete(user.id, id);
  }
}
