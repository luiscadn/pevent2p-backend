// src/zone/zone.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Zone } from './entities/zone.entity';
import { ZoneController } from './zone.controller';
import { ZoneService } from './zone.service';

@Module({
  imports: [TypeOrmModule.forFeature([Zone])],  // ← crea el Repository<Zone>
  controllers: [ZoneController],
  providers: [ZoneService],
  exports: [ZoneService],                        // ← lo compartirá con otros módulos
})
export class ZoneModule {}