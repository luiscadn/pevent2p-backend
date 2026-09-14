// apps/nodo/src/nodo.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { NodeConfigModule } from './config/config.module';
import { TopologyModule } from './topology/topology.module';
import { NetworkModule } from './network/network.module';
import { LocalIndexModule } from './local-index/local-index.module';
import { EventsModule } from './domain/events/events.module';
import { ReportsModule } from './domain/reports/reports.module';
import { SearchModule } from './domain/search/search.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ScheduleModule.forRoot(),
    NodeConfigModule,
    TopologyModule,
    NetworkModule,
    LocalIndexModule,
    EventsModule,
    ReportsModule,
    SearchModule,

    // ── Aquí se irán agregando ──
    // TopologyModule, NetworkModule, LocalIndexModule,
    // EventsModule, ReportsModule, SearchModule,
  ],
})
export class NodoModule {}