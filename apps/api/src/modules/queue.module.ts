import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueueService } from '../application/queue.service';
import { QueueDailyCounterEntity } from '../infrastructure/entities/queue-daily-counter.entity';
import { QueueEntryEntity } from '../infrastructure/entities/queue-entry.entity';
import { QueueEntity } from '../infrastructure/entities/queue.entity';
import { EntryController } from '../presentation/controllers/entry.controller';
import { QueueController } from '../presentation/controllers/queue.controller';
import { AuthModule } from './auth.module';

/** F-02. Uses AuthModule guards; persistence goes through QueueService's QueryRunner. */
@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([QueueEntity, QueueEntryEntity, QueueDailyCounterEntity]),
  ],
  controllers: [QueueController, EntryController],
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}
