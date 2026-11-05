import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './presentation/health.controller';
import { CLOCK_TOKEN, SystemClock } from './common/clock';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: Number(process.env.DATABASE_PORT) || 5432,
      username: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'postgrespassword',
      database:
        process.env.NODE_ENV === 'test'
          ? process.env.DATABASE_NAME_TEST || 'queue_system_test'
          : process.env.DATABASE_NAME || 'queue_system',
      synchronize: false,
      autoLoadEntities: true,
      ssl: process.env.DATABASE_SSL === 'true',
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
