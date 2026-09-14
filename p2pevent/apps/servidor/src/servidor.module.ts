// apps/servidor/src/servidor.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './config/database.config';
import { DirectoryModule } from './directory/directory.module';
import { RingModule } from './ring/ring.module';
import { UsersModule } from './users/users.module';
import { ZonesModule } from './zones/zones.module';
import { EventsModule } from './events/events.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: databaseConfig,
    }),

    DirectoryModule,

    RingModule,

    UsersModule,

    ZonesModule,

    EventsModule,

    AuthModule,

    // ── Aquí se irán agregando ──
    // UsersModule, ZonesModule, EventsModule, AuthModule,
    // DirectoryModule, RingModule,
  ],
})
export class ServidorModule {}