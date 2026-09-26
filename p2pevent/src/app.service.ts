import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  health() {
    return {
      status: 'ok',
      service: 'citypulse-backend',
      timestamp: new Date().toISOString(),
    };
  }
}