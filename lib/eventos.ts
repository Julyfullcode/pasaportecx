import { EventEmitter } from "node:events";

const globalEventos = globalThis as unknown as { eventosPasaporte?: EventEmitter };
export const eventos = globalEventos.eventosPasaporte ?? new EventEmitter();
eventos.setMaxListeners(250);
if (!globalEventos.eventosPasaporte) globalEventos.eventosPasaporte = eventos;

export function anunciarCambio(tipo: string) {
  eventos.emit("cambio", { tipo, fecha: new Date().toISOString() });
}
