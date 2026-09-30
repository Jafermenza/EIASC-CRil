import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { securityMiddleware } from './security/security.middleware';
import { requestLoggingMiddleware } from './security/request-logging.middleware';
import { HttpExceptionFilter } from './common/http-exception.filter';

function getAllowedOrigins(): string[] {
  const configured = process.env.WEB_ORIGIN?.split(',').map((value) => value.trim()).filter(Boolean) ?? [];
  if (process.env.NODE_ENV === 'production' && configured.length === 0) {
    throw new Error('WEB_ORIGIN must be configured in production. Refusing to start with permissive CORS.');
  }
  return configured;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: true });
  app.setGlobalPrefix('api/v1');
  const proxyHops = Number(process.env.TRUST_PROXY_HOPS ?? 1);
  app.getHttpAdapter().getInstance().set('trust proxy', Number.isInteger(proxyHops) && proxyHops >= 0 ? proxyHops : 1);
  app.use(securityMiddleware);
  app.use(requestLoggingMiddleware);
  app.useGlobalFilters(new HttpExceptionFilter());
  const origins = getAllowedOrigins();
  app.enableCors({ origin: origins.length > 0 ? origins : true, methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] });
  await app.listen(Number(process.env.API_PORT ?? 4000), '0.0.0.0');
}

void bootstrap();
