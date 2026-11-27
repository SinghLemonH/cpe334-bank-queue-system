import { Module } from '@nestjs/common';
import { LifecycleService } from '../application/lifecycle.service';
import { LifecycleController } from '../presentation/controllers/lifecycle.controller';
import { AuthModule } from './auth.module';

/** Sprint 2: F-04 cancel, F-05 no-show, F-08 open/close and end-of-day. */
@Module({
  imports: [AuthModule],
  controllers: [LifecycleController],
  providers: [LifecycleService],
})
export class LifecycleModule {}
