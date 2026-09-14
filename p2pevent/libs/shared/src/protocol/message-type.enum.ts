export enum MessageType {
  // ── Red ──
  PING = 'PING', // ¿sigues vivo?
  HELLO = 'HELLO', // me presento como tu nuevo vecino
  NEIGHBORS_CHANGED = 'NEIGHBORS_CHANGED', // actualiza tus vecinos

  // ── Eventos ──
  EVENT_NEW = 'EVENT_NEW', // hay un evento nuevo
  EVENT_UPDATE = 'EVENT_UPDATE', // cambió un evento
  EVENT_CANCEL = 'EVENT_CANCEL', // se canceló un evento

  // ── Reportes ──
  REPORT_NEW = 'REPORT_NEW', // suceso puntual

  // ── Búsqueda ──
  SEARCH = 'SEARCH', // ¿alguien tiene eventos que cumplan X?
  SEARCH_RESULT = 'SEARCH_RESULT', // respuesta a lo anterior

  // ── Social ──
  INVITATION = 'INVITATION', // te invito a un evento
}
