import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ServidorModule } from './servidor.module';

async function bootstrap() {
  //ServidorModule es la clase (factory) que al crearse dentro ya tiene todos los controllers,services,modules
  const app = await NestFactory.create(ServidorModule);

  // Valida TODOS los DTOs de entrada automáticamente
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,            // descarta campos que no estén en el DTO
      forbidNonWhitelisted: true, // y responde 400 si llegan
      transform: true,            // convierte tipos: "5" -> 5
    }),
  );

  // Permite que los nodos llamen al servidor desde otros puertos
  app.enableCors();

  const port = Number(process.env.SERVER_PORT ?? 3000);
  await app.listen(port);

  Logger.log(` Servidor central en http://localhost:${port}`, 'Bootstrap');
}
bootstrap();