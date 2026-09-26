import {
  Controller, Get, Post, Patch, Delete,
  Param, Query, Body, ParseIntPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ZoneService } from './zone.service';
import { Zone } from './entities/zone.entity';
import { CreateZoneDto } from './dtos/create-zone.dto';
import { UpdateZoneDto } from './dtos/update-zone.dto';

@Controller('zone')
export class ZoneController {
  constructor(private readonly zoneService: ZoneService) {}

    @Get()
    getAllZone(): Promise<Zone[]> {
    
      return this.zoneService.findAll();
    }

    @Get(':id')
    getZoneById(@Param('id', ParseIntPipe) id: number): Promise<Zone> {
      return this.zoneService.findOne(id);
    }

    @Post()
    createZone(@Body() createZoneDto: CreateZoneDto): Promise<Zone> {
      return this.zoneService.create(createZoneDto);
    }

    @Patch(':id')
    updateZone(
      @Param('id', ParseIntPipe) id: number,
      @Body() updateZoneDto: UpdateZoneDto,
    ): Promise<Zone> {
      return this.zoneService.update(id, updateZoneDto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    deleteZone(@Param('id', ParseIntPipe) id: number) {
      return this.zoneService.remove(id);
    }


}


