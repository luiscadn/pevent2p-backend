import { PeerInfo } from './peer-info.interface';
import { RingPath } from '../ring/ring-path.util';

// Mi posición: dónde estoy yo
export interface RingPosition {
  ringPath: RingPath;
  index: number;
  isParent: boolean; // index === 0
}

// Quiénes son mis vecinos (esto es TODO lo que un nodo guarda de la red)
export interface MyNeighbors {
  parent?: PeerInfo; // el padre de mi anillo
  next?: PeerInfo; // el siguiente del anillo
  prev?: PeerInfo; // el anterior del anillo
  foreignParent?: PeerInfo; // el nodo del anillo de arriba (si estoy en sub-anillo)
  children: PeerInfo[]; // si soy padre: todos los miembros
  childRings: PeerInfo[]; // padres de los sub-anillos que cuelgan de mí
}

// La info completa de un anillo (esto SOLO lo tiene el servidor)
export interface RingInfo {
  ringPath: RingPath;
  zoneId: number;
  members: PeerInfo[]; // en orden circular
  foreignParentId?: string;
}
