import { Injectable, Logger } from '@nestjs/common';
import { MyNeighbors, PeerInfo } from '@app/shared';

/** Vecinos vacíos: el estado antes de entrar a la red */
const sinVecinos = (): MyNeighbors => ({ children: [], childRings: [] });

/**
 * TODO lo que este nodo sabe de la red.
 *
 * No es un grafo: son dos variables.
 *   - `me`        → quién soy y dónde estoy (me lo asigna el servidor)
 *   - `neighbors` → mis 4-6 vecinos (me los calcula el servidor)
 *
 * No habla con nadie ni decide nada: solo guarda y responde.
 * Quien la llena es JoinService; quienes la leen son RoutingService,
 * BroadcastService, HeartbeatService y PeerController.
 *
 * Regla de oro (event loop): cada escritura REEMPLAZA el objeto completo
 * en una sola línea. Nunca se lee, se hace `await` y después se escribe.
 */
@Injectable()
export class TopologyService {
  private readonly logger = new Logger('Topology');

  private me: PeerInfo | null = null;
  private neighbors: MyNeighbors = sinVecinos();

  // ═══════════════════════════════════════════════════════════════
  //  IDENTIDAD: quién soy
  // ═══════════════════════════════════════════════════════════════

  /**
   * Guarda mi posición en la red.
   * ENTRADA: el `me` que devuelve POST /ring/join
   */
  setMe(info: PeerInfo): void {
    this.me = { ...info };
    this.logger.log(
      `soy ${info.peerId} · anillo [${info.ringPath.join('.')}] · asiento ${info.index}` +
        (info.isParent ? ' · PADRE' : ''),
    );
  }

  /**
   * Mi posición en la red.
   * Lanza un error si todavía no entré: así un bug de orden se ve
   * de inmediato, en vez de propagarse como `undefined`.
   */
  getMe(): PeerInfo {
    if (!this.me) {
      throw new Error('TopologyService: el nodo todavía no entró a la red (falta setMe)');
    }
    return this.me;
  }

  /** ¿Ya entré a la red? Usarlo antes de getMe() en tareas periódicas */
  isReady(): boolean {
    return this.me !== null;
  }

  /**
   * ¿Soy el padre de mi anillo?
   * Se lee de `isParent`, NO de `index === 0`: con asientos permanentes,
   * el padre puede tener cualquier índice (corrección de la auditoría).
   */
  isParent(): boolean {
    return this.me?.isParent === true;
  }

  // ═══════════════════════════════════════════════════════════════
  //  VECINOS: a quién conozco
  // ═══════════════════════════════════════════════════════════════

  /**
   * Reemplaza TODOS mis vecinos de una vez.
   * ENTRADA: el `neighbors` de /ring/join o de GET /ring/neighbors.
   * Se normaliza por si el servidor omite las listas vacías.
   */
  setNeighbors(n: Partial<MyNeighbors> | null | undefined): void {
    this.neighbors = {
      parent: n?.parent,
      next: n?.next,
      prev: n?.prev,
      foreignParent: n?.foreignParent,
      children: n?.children ?? [],
      childRings: n?.childRings ?? [],
    };
    this.logger.log(`vecinos actualizados: ${this.describir()}`);
  }

  getNeighbors(): MyNeighbors {
    return this.neighbors;
  }

  /**
   * Todos mis vecinos en un arreglo plano, sin repetidos y sin mí mismo.
   * Es lo que usa la difusión: "envíaselo a todos los que conozco".
   *
   * En anillos pequeños el mismo nodo puede aparecer dos veces
   * (ej: con 2 miembros, `next` y `parent` son el mismo). Por eso el Map.
   */
  allNeighbors(): PeerInfo[] {
    const n = this.neighbors;
    const candidatos = [
      n.parent,
      n.next,
      n.prev,
      n.foreignParent,
      ...n.children,
      ...n.childRings,
    ];

    const unicos = new Map<string, PeerInfo>();
    for (const p of candidatos) {
      if (p && p.peerId !== this.me?.peerId) unicos.set(p.peerId, p);
    }
    return [...unicos.values()];
  }

  /** Busca un vecino por su id. Lo usa RoutingService (caso 1) */
  findNeighbor(peerId: string): PeerInfo | undefined {
    return this.allNeighbors().find((p) => p.peerId === peerId);
  }

  /**
   * Busca un miembro de MI anillo por su asiento.
   * Lo usa RoutingService para bajar: "el sub-anillo cuelga del asiento 3".
   *
   * Solo mira miembros de mi anillo (parent, next, prev, children).
   * foreignParent y childRings son de OTROS anillos y quedan fuera.
   */
  memberByIndex(index: number): PeerInfo | undefined {
    const n = this.neighbors;
    const mismoAnillo = [n.parent, n.next, n.prev, ...n.children];
    return mismoAnillo.find((p) => p?.index === index);
  }

  /**
   * Quita un vecino caído SIN esperar al servidor.
   * Lo usa HeartbeatService: si un vecino no responde, deja de
   * enviarle mensajes ya mismo; el servidor confirmará después.
   * Reemplaza el objeto completo (regla del event loop).
   */
  removeNeighbor(peerId: string): void {
    const n = this.neighbors;
    const quitar = (p?: PeerInfo) => (p?.peerId === peerId ? undefined : p);

    this.neighbors = {
      parent: quitar(n.parent),
      next: quitar(n.next),
      prev: quitar(n.prev),
      foreignParent: quitar(n.foreignParent),
      children: n.children.filter((p) => p.peerId !== peerId),
      childRings: n.childRings.filter((p) => p.peerId !== peerId),
    };
    this.logger.warn(`vecino ${peerId} retirado: ${this.describir()}`);
  }

  /** Olvida todo. Lo usa JoinService antes de volver a entrar a la red */
  reset(): void {
    this.me = null;
    this.neighbors = sinVecinos();
  }

  // ═══════════════════════════════════════════════════════════════
  //  DIAGNÓSTICO
  // ═══════════════════════════════════════════════════════════════

  /** Estado completo, para GET /peer/info */
  snapshot() {
    return {
      ready: this.isReady(),
      me: this.me,
      esPadre: this.isParent(),
      totalVecinos: this.allNeighbors().length,
      neighbors: this.neighbors,
    };
  }

  /** Resumen de una línea para los logs */
  private describir(): string {
    const n = this.neighbors;
    const id = (p?: PeerInfo) => p?.peerId ?? '—';
    return (
      `padre=${id(n.parent)} next=${id(n.next)} prev=${id(n.prev)} ` +
      `extranjero=${id(n.foreignParent)} hijos=${n.children.length} ` +
      `subanillos=${n.childRings.length} (total ${this.allNeighbors().length})`
    );
  }
}