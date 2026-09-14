import { Injectable } from '@nestjs/common';

@Injectable()
export class ServidorService {
  getHello(): string {
    return 'Hello World!';
  }
}
