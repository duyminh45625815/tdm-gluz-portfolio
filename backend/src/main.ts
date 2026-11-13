import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import { configureApplication } from './app-setup.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  configureApplication(app, configService);
  await app.listen(configService.getOrThrow<number>('PORT'));
}
await bootstrap();
