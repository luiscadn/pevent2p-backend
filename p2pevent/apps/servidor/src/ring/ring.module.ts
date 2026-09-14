import { Module } from '@nestjs/common';
import { RingRegistryService } from './ring-registry/ring-registry.service';
import { RingAllocatorService } from './ring-allocator/ring-allocator.service';
import { RingController } from './ring/ring.controller';

@Module({
  providers: [RingRegistryService, RingAllocatorService],
  controllers: [RingController]
})
export class RingModule {}
