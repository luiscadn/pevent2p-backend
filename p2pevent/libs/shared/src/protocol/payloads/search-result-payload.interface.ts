import { Event } from '../../models/event.interface';

export interface SearchResultPayload {
  requestId: string; // el messageId de la búsqueda original
  events: Event[];
}
