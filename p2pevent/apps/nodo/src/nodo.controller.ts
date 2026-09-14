import { Controller, Get } from '@nestjs/common';
import { NodoService } from './nodo.service';

@Controller()
export class NodoController {
  constructor(private readonly nodoService: NodoService) {}

  @Get()
  getHello(): string {
    return this.nodoService.getHello();
  }
}
