import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * TODO lo que identifica a un nodo, en un solo sitio.
 * Cualquier servicio que necesite saber "quién soy" o
 * "dónde está el servidor" inyecta esta clase.
 */
/**
 *Es el "carné de identidad" del nodo. No envía mensajes, no enruta, no difunde. Solo responde preguntas sobre quién soy yo y dónde está todo lo demás.

 en conclucion esta clase es como una plantilla generica que se utiliza para manipular e identificar a los nodos
 */
@Injectable()
//onModuleInit()". Nest busca ese método y lo llama cuando el módulo termina de arrancar. Es un enganche del ciclo de vida
export class NodeConfigService implements OnModuleInit {
  private readonly logger = new Logger('NodeConfig');

  //porque utilizar gets en vez de variables? no queremos guardar datos fijos, ya que es dinamico y va cambiando
  /**
   *  Se usan getters en vez de variables por dos razones:
   *   1. `peerId` y `uri` se derivan de `port`: al calcularse cada vez,
   *      nunca quedan desincronizados.
   *   2. Si mañana cambia la fórmula (ej: peerId = hash de la llave),
   *      se cambia aquí y ningún sitio que lo use se entera.
   * 
    // Si guardaras el valor en el constructor:
    private readonly port = Number(process.env.PORT);
    // → si el .env cambia en runtime, no te enteras

    //Con getter:
    get port() { return Number(this.config.get('PORT') ?? 3001); }
    // → cada acceso lee el valor fresco
   */

  constructor(private readonly config: ConfigService) {}

  /** Puerto en el que escucha este nodo */
  //¿En qué puerto escucho?
  get port(): number {
    return Number(this.config.get('PORT') ?? 3001);
  }

  /** Identificador único de este nodo en la red */
  //¿Cuál es mi nombre único en la red? ej: "nodo-3001"
  get peerId(): string {
    return this.config.get<string>('PEER_ID') ?? `nodo-${this.port}`;
  }

  /** Dónde pueden encontrarme los otros nodos */
  //¿En qué URL me encuentran los demás? 
  get uri(): string {
    return `http://localhost:${this.port}`;
  }

  /** Dónde está el servidor central */
  //¿Dónde está el servidor central?
  get serverUrl(): string {
    return this.config.get<string>('SERVER_URL') ?? 'http://localhost:3000';
  }

  /** En qué zona opera este nodo */
  //¿En qué zona opero?
  get zoneId(): number {
    return Number(this.config.get('ZONE_ID') ?? 1);
  }

  /** Qué usuario lo está operando */
  //¿Qué usuario me opera?
  get userId(): number {
    return Number(this.config.get('USER_ID') ?? 1);
  }

  /** Cada cuánto verificar que los vecinos siguen vivos (ms) */
  //¿Cada cuánto hago ping a mis vecinos?
  get heartbeatIntervalMs(): number {
    return 15_000;
  }

  /** Cada cuánto reintentar enviar lo pendiente al servidor (ms) */
  //¿Cada cuánto reintento enviar al servidor?
  get syncIntervalMs(): number {
    return 30_000;
  }

  onModuleInit() {
    this.logger.log(`peerId=${this.peerId}  uri=${this.uri}  zona=${this.zoneId}`);
  }
}