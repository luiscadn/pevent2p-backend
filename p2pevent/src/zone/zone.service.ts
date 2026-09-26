// src/zone/zone.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Zone } from './entities/zone.entity';
import { CreateZoneDto } from './dtos/create-zone.dto';
import { UpdateZoneDto } from './dtos/update-zone.dto';

@Injectable()
export class ZoneService {
//llamado de repositorio
  constructor(
    @InjectRepository(Zone)
    private readonly zoneRepo: Repository<Zone>,
  ) {}

  create(dto: CreateZoneDto) {
    const zone = this.zoneRepo.create(dto);  //solo crea la instancia
    return this.zoneRepo.save(zone);         //esto hace el INSERT
  }

  findAll() {
    return this.zoneRepo.find({ order: { id: 'ASC' } });//trae todas las zonas pero en orden ascendente
  }

  async findOne(id: number) {

    const zone = await this.zoneRepo.findOne({ where: { id } });

    if (!zone){

        throw new NotFoundException(`Zone ${id} no existe`);

    } 
    return zone;
  }

  async update(id: number, dto: UpdateZoneDto) {

    await this.findOne(id);

    await this.zoneRepo.update(id, dto);//es una actualizacion completa atravez del update 

    return this.findOne(id);
  }

  async remove(id: number) {

    await this.findOne(id);

    await this.zoneRepo.delete(id);

    return { deleted: true };
  }
}