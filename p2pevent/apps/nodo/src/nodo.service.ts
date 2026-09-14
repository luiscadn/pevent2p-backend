import { Injectable } from '@nestjs/common';

@Injectable()
export class NodoService {
  getHello(): string {
    return 'Hello World!';
  }
}
