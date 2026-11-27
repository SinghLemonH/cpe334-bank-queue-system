import { Module } from '@nestjs/common';
import { ServiceDeskService } from '../application/service-desk.service';
import { PriorityOrderingPolicy } from '../domain/ordering/priority-ordering-policy';
import { QUEUE_ORDERING_POLICY } from '../domain/ordering/queue-ordering-policy';
import { OperatorController } from '../presentation/controllers/operator.controller';
import { ServiceDeskController } from '../presentation/controllers/service-desk.controller';
import { AuthModule } from './auth.module';

/** F-03 + F-09: PriorityOrderingPolicy replaces FifoOrderingPolicy (BR-14). */
@Module({
  imports: [AuthModule],
  controllers: [OperatorController, ServiceDeskController],
  providers: [
    ServiceDeskService,
    { provide: QUEUE_ORDERING_POLICY, useFactory: () => new PriorityOrderingPolicy() },
  ],
})
export class ServiceDeskModule {}
