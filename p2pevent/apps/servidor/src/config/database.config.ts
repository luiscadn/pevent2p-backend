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
  host: config.get<string>('DB_HOST') ?? 'localhost',
  port: Number(config.get<number>('DB_PORT') ?? 5432),
  username:
    config.get<string>('DB_USER') ??
    config.get<string>('DB_USERNAME') ??
    'postgres',
  password: config.get<string>('DB_PASSWORD') ?? 'postgres',
  database:
    config.get<string>('DB_NAME') ??
    config.get<string>('DB_DATABASE') ??
    'pevent2p_db',

  // Busca todas las clases en archivos *.entity.ts
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],

  // Crea y actualiza las tablas solas. SOLO en desarrollo.
  synchronize: true,

  // Imprime en consola cada consulta SQL. Muy útil para aprender.
  logging: ['error', 'warn'],
});