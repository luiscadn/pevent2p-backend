import { RingPath } from '../ring/ring-path.util';

export interface PeerInfo {
  peerId: string; // identificador único: "nodo-3001"
  uri: string; // dónde está: "http://localhost:3001"
  userId: number; // qué usuario lo opera
  zoneId: number; // en qué zona está
  ringPath: RingPath; // en qué anillo está: [] o [1] o [1,3]
  index: number; // su posición en el anillo (0 = padre)
  lastSeen: number; // timestamp del último contacto
}
