import { Module } from '@nestjs/common';
import { TopologyService } from './topology.service';
import { RoutingService } from './routing.service';
import { JoinService } from './join.service';

/**
 * Módulo de topología: dónde estoy en la red y hacia dónde envío.
 *
 * No importa nada: NodeConfigModule es global.
 * Lo importan NetworkModule y los módulos de dominio.
 *
 * ⚠️ NO importar NetworkModule aquí: NetworkModule ya importa este
 *    módulo, y hacerlo al revés crea una dependencia circular.
 */
@Module({
  providers: [TopologyService, RoutingService, JoinService],
  exports: [TopologyService, RoutingService, JoinService],
})
export class TopologyModule {}