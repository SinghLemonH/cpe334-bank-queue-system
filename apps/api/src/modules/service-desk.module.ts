import { Module } from '@nestjs/common';
import { ServiceDeskService } from '../application/service-desk.service';
import { FifoOrderingPolicy } from '../domain/ordering/fifo-ordering-policy';
import { QUEUE_ORDERING_POLICY } from '../domain/ordering/queue-ordering-policy';
import { OperatorController } from '../presentation/controllers/operator.controller';
import { ServiceDeskController } from '../presentation/controllers/service-desk.controller';
import { AuthModule } from './auth.module';

/** F-03. Sprint 3 swaps the ordering policy here (PriorityOrderingPolicy, F-09). */
@Module({
  imports: [AuthModule],
  controllers: [OperatorController, ServiceDeskController],
  providers: [ServiceDeskService, { provide: QUEUE_ORDERING_POLICY, useClass: FifoOrderingPolicy }],
})
export class ServiceDeskModule {}
