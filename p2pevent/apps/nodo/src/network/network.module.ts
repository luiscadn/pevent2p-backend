import { Module } from '@nestjs/common';
import { PeerController } from './peer/peer.controller';
import { PeerClientService } from './peer-client/peer-client.service';
import { MessageRouterService } from './message-router/message-router.service';
import { BroadcastService } from './broadcast/broadcast.service';
import { HeartbeatService } from './heartbeat/heartbeat.service';
import { ServerSyncService } from './server-sync/server-sync.service';

@Module({
  controllers: [PeerController],
  providers: [PeerClientService, MessageRouterService, BroadcastService, HeartbeatService, ServerSyncService]
})
export class NetworkModule {}
