import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './presentation/health.controller';
import { ReadyController } from './presentation/ready.controller';
import { VersionController } from './presentation/version.controller';
import { ClockModule } from './common/clock.module';
import { getDataSourceOptions } from './infrastructure/data-source';
import { AuthModule } from './modules/auth.module';
import { CounterModule } from './modules/counter.module';
import { QueueModule } from './modules/queue.module';
import { ServiceDeskModule } from './modules/service-desk.module';

@Module({
  imports: [
    // Same settings as the migration CLI and tests (test DB when NODE_ENV=test).
    TypeOrmModule.forRoot({
      ...getDataSourceOptions(),
      // Entities come from TypeOrmModule.forFeature (autoLoad); no file globs at runtime,
      // so each entity class is loaded exactly once. Migrations run via the CLI only.
      entities: [],
      migrations: [],
      autoLoadEntities: true,
    }),
    ClockModule,
    AuthModule,
    CounterModule,
    QueueModule,
    ServiceDeskModule,
  ],
  controllers: [HealthController, ReadyController, VersionController],
})
export class AppModule {}
