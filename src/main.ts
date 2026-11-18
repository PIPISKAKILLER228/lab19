import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.enableCors();

  const configService = app.get(ConfigService);
  // ЛР №19: облачная платформа сама назначает порт и передаёт его в PORT.
  // 3000 — только локальное значение по умолчанию.
  const port = Number(configService.get<string>('PORT') ?? process.env.PORT) || 3000;

  // 0.0.0.0 обязателен: иначе сервис слушает только localhost внутри контейнера
  // и облачный балансировщик не сможет до него достучаться.
  await app.listen(port, '0.0.0.0');

  console.log(`Lab 19 API:   http://localhost:${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
}

void bootstrap();
