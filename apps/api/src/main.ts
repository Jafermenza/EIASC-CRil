import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { securityMiddleware } from './security/security.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.set('trust proxy', 1);
  app.use(securityMiddleware);
  app.enableCors({ origin: process.env.WEB_ORIGIN?.split(',').map((value) => value.trim()) ?? true });
  await app.listen(Number(process.env.API_PORT ?? 4000), '0.0.0.0');
}

void bootstrap();
