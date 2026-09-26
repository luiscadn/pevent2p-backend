import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Validación global de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,              // elimina campos no declarados en el DTO (descarta campos del body que no estén en el DTO)
      forbidNonWhitelisted: true,   // error si llega un campo extra (responde 400 si llegan campos extra)
      transform: true,              // convierte tipos (ej: "3" → 3)
    }),
  );

  const config = app.get(ConfigService);
  const port = Number(config.get<string>('PORT') ?? 3000);

  await app.listen(port);
  console.log(`🚀 CityPulse backend en http://localhost:${port}`);
}

bootstrap();