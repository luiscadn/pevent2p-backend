import { Controller, Get } from '@nestjs/common';
import { ServidorService } from './servidor.service';

@Controller()
export class ServidorController {
  constructor(private readonly servidorService: ServidorService) {}

  @Get()
  getHello(): string {
    return this.servidorService.getHello();
  }
}
