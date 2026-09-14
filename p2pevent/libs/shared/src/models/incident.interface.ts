export enum IncidentType {
  AGLOMERACION = 'AGLOMERACION',
  CIERRE_VIA = 'CIERRE_VIA',
  INCIDENTE = 'INCIDENTE',
}

export interface Incident {
  id: string; // UUID
  type: IncidentType;
  description: string;
  zoneId: number;
  authorId: number;
  createdAt: Date | string;
  expiresAt: Date | string;
  confirmations: number;
  denials: number;
}

// Aliases por consistencia con la documentación de reportes efímeros
export type Report = Incident;
export const ReportType = IncidentType;
