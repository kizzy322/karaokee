import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { readFileSync } from 'node:fs';
import { AppModule } from './app.module';
import { ApiErrorFilter } from './errors';

async function bootstrap() {
  const keyPath = process.env.TLS_KEY_PATH;
  const certPath = process.env.TLS_CERT_PATH;
  if (Boolean(keyPath) !== Boolean(certPath)) {
    throw new Error('Set both TLS_KEY_PATH and TLS_CERT_PATH to enable HTTPS');
  }

  const httpsOptions = keyPath && certPath
    ? { key: readFileSync(keyPath), cert: readFileSync(certPath) }
    : undefined;
  const app = await NestFactory.create(AppModule, { httpsOptions });
  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new ApiErrorFilter());
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
  }));
  app.enableShutdownHooks();

  const port = Number(process.env.PORT || 3000);
  await app.listen(port, '127.0.0.1');
  Logger.log(`KaraokeSing API at ${httpsOptions ? 'https' : 'http'}://127.0.0.1:${port}/api/v1`, 'Bootstrap');
}

bootstrap().catch((error: Error) => {
  Logger.error(error.message, 'Bootstrap');
  process.exitCode = 1;
});

