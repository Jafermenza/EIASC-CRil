import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { securityMiddleware } from './security/security.middleware';
import { requestLoggingMiddleware } from './security/request-logging.middleware';
import { HttpExceptionFilter } from './common/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.use(securityMiddleware);
  app.use(requestLoggingMiddleware);
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors({ origin: process.env.WEB_ORIGIN?.split(',').map((value) => value.trim()) ?? true });
  await app.listen(Number(process.env.API_PORT ?? 4000), '0.0.0.0');
}

void bootstrap();
