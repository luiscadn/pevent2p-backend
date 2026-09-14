export enum ZoneType {
  CIUDAD = 'CIUDAD',
  BARRIO = 'BARRIO',
  EDIFICIO = 'EDIFICIO',
}

export interface Zone {
  id: number;
  name: string;
  type: ZoneType | string;
  parentZoneId: number | null;
}
