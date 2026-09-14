import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NodoModule } from './nodo.module';

async function bootstrap() {
  const app = await NestFactory.create(NodoModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors();

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);

  Logger.log(`  Nodo escuchando en http://localhost:${port}`, 'Bootstrap');
}
bootstrap();