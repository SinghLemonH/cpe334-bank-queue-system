import { Module } from '@nestjs/common';
import { CounterService } from '../application/counter.service';
import { CounterController } from '../presentation/controllers/counter.controller';
import { AuthModule } from './auth.module';

@Module({
  imports: [AuthModule],
  controllers: [CounterController],
  providers: [CounterService],
  exports: [CounterService],
})
export class CounterModule {}
