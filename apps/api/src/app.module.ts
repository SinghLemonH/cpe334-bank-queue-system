import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './presentation/health.controller';
import { ClockModule } from './common/clock.module';
import { getDataSourceOptions } from './infrastructure/data-source';

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
  ],
  controllers: [HealthController],
})
export class AppModule {}
