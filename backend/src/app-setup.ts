import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SafeExceptionFilter } from './security/safe-exception.filter.js';

export function configureApplication(
  app: INestApplication,
  configService: ConfigService,
): void {
  app.useSecurityHeaders();
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: configService.getOrThrow<string[]>('CORS_ALLOWED_ORIGINS'),
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      disableErrorMessages: configService.get<string>('NODE_ENV') === 'production',
    }),
  );
  app.useGlobalFilters(new SafeExceptionFilter());
}
