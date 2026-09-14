import { MessageType } from './message-type.enum';
import { RingPath } from '../ring/ring-path.util';

export enum Scope {
  DIRECT = 'DIRECT', // para un nodo o anillo concreto
  BROADCAST = 'BROADCAST', // para todos los que pueda alcanzar
}

export interface PeerMessage<T = unknown> {
  // ── Identidad del mensaje ──
  messageId: string; // UUID. Para no procesar dos veces el mismo mensaje
  type: MessageType; // qué clase de mensaje es
  scope: Scope; // dirigido o difusión
  timestamp: number; // cuándo se creó

  // ── Quién lo creó ──
  fromPeerId: string; // quién lo creó originalmente
  fromUri: string; // su URL, para poder responderle

  // ── Quién me lo pasó a mí (cambia en cada salto) ──
  viaUri: string; // para NO devolvérselo a quien me lo dio (evita el eco)

  // ── A dónde va (solo si scope = DIRECT) ──
  targetPath?: RingPath; // a qué anillo va
  targetPeerId?: string; // a qué nodo exacto va (opcional)

  // ── Control ──
  ttl: number; // saltos restantes. Baja 1 en cada reenvío

  // ── El contenido ──
  payload: T; // el contenido
}
