import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

/**
 * Construye la configuración de la conexión a PostgreSQL
 * a partir de las variables de entorno.
 */
export const databaseConfig = (
  config: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: config.get<string>('DB_HOST'),
  port: config.get<number>('DB_PORT'),
  username: config.get<string>('DB_USERNAME'),
  password: config.get<string>('DB_PASSWORD'),
  database: config.get<string>('DB_DATABASE'),

  // Busca todas las clases en archivos *.entity.ts
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],

  // Crea y actualiza las tablas solas. SOLO en desarrollo.
  synchronize: true,

  // Imprime en consola cada consulta SQL. Muy útil para aprender.
  logging: ['error', 'warn'],
});