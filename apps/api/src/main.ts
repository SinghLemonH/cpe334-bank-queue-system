import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Cloud Run terminates TLS in front of the container: trust its one proxy hop so
  // req.secure / req.ip reflect the original request.
  app.set('trust proxy', 1);
  configureApp(app);

  // Cloud Run injects PORT (8080); local default is 3001.
  const port = Number(process.env.PORT) || 3001;
  await app.listen(port, '0.0.0.0');
}
bootstrap();
