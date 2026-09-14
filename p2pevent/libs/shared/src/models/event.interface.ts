export enum EventAccessType {
  PUBLICO = 'PUBLICO',
  EXCLUSIVO = 'EXCLUSIVO',
  CON_ENTRADA = 'CON_ENTRADA',
}

export enum EventStatus {
  ACTIVO = 'ACTIVO',
  CANCELADO = 'CANCELADO',
}

export interface Event {
  id: string; // UUID
  title: string;
  description: string;
  place: string;
  startDate: Date | string;
  endDate: Date | string;
  accessType: EventAccessType;
  ticketPrice: number | null;
  capacity: number | null;
  zoneId: number;
  authorId: number;
  isVerified: boolean;
  status: EventStatus;
  version: number;
  updatedAt: Date | string;
}
