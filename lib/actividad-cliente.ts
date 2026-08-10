import type { PreguntaActividad } from "@/lib/actividad";

/**
 * Utilidades de configuracion que tambien deben poder ejecutarse en el navegador.
 * Este modulo no importa la base de datos ni APIs exclusivas del servidor.
 */
export function idsRespuestasCorrectas(pregunta: PreguntaActividad) {
  if (pregunta.tipo !== "OPCION_UNICA") return [];
  const valores = Array.isArray(pregunta.respuestaCorrecta)
    ? pregunta.respuestaCorrecta
    : pregunta.respuestaCorrecta ? [pregunta.respuestaCorrecta] : [];
  const validas = new Set((pregunta.opciones ?? []).map((opcion) => opcion.id));
  return [...new Set(valores.filter((id) => validas.has(id)))];
}
