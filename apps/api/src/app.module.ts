import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './presentation/health.controller';
import { CLOCK_TOKEN, SystemClock } from './common/clock';
import { getDataSourceOptions } from './infrastructure/data-source';

@Module({
  imports: [
    // Same settings as the migration CLI and tests (test DB when NODE_ENV=test).
    TypeOrmModule.forRoot({
      ...getDataSourceOptions(),
      autoLoadEntities: true,
    }),
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: CLOCK_TOKEN,
      useClass: SystemClock,
    },
  ],
  exports: [CLOCK_TOKEN],
})
export class AppModule {}
