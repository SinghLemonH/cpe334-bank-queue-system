import { Global, Module } from '@nestjs/common';
import { CLOCK_TOKEN, SystemClock } from './clock';

/** Makes the Clock injectable in every feature module (tests override CLOCK_TOKEN). */
@Global()
@Module({
  providers: [{ provide: CLOCK_TOKEN, useClass: SystemClock }],
  exports: [CLOCK_TOKEN],
})
export class ClockModule {}
