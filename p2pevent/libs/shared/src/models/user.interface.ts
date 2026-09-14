export interface User {
  id: number;
  userName: string;
  email: string;
  password?: string;
  zoneId: number;
  isZoneAdmin: boolean;
}
