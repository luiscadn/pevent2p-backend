import { Module } from '@nestjs/common';
import { PeerController } from './peer.controller';
import { PeerClientService } from './peer-client.service';
import { MessageRouterService } from './message-router.service';
import { BroadcastService } from './broadcast.service';
import { HeartbeatService } from './heartbeat.service';
import { ServerSyncService } from './server-sync.service';

@Module({
  controllers: [PeerController],
  providers: [PeerClientService, MessageRouterService, BroadcastService, HeartbeatService, ServerSyncService]
})
export class NetworkModule {}
