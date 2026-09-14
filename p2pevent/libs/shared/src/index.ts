// Exportaciones existentes
export * from './shared.module';
export * from './shared.service';
export const SHARED_OK = true;

// Modelos del Dominio y Topología
export * from './models/user.interface';
export * from './models/zone.interface';
export * from './models/event.interface';
export * from './models/incident.interface';
export * from './models/peer-info.interface';
export * from './models/ring.interface';

// Protocolo P2P
export * from './protocol/message-type.enum';
export * from './protocol/peer-message.interface';
export * from './protocol/payloads/event-payload.interface';
export * from './protocol/payloads/search-payload.interface';
export * from './protocol/payloads/search-result-payload.interface';

// Utilidades matemáticas de RingPath
export * from './ring/ring-path.util';