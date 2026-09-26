import { Controller } from '@nestjs/common';
import { ZoneService } from './zone.service';

@Controller('zone')
export class ZoneController {
  constructor(private readonly zoneService: ZoneService) {}
}
