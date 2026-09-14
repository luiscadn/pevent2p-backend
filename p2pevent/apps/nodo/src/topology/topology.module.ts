import { Module } from '@nestjs/common';
import { TopologyService } from './topology/topology.service';
import { RoutingService } from './routing/routing.service';
import { JoinService } from './join/join.service';

@Module({
  providers: [TopologyService, RoutingService, JoinService]
})
export class TopologyModule {}
