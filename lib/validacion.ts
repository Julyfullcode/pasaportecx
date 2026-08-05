import { z } from "zod";

export function normalizarRespuesta(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim()
    .replace(/\s+/g, " ");
}

export function validarRespuestaAbierta(
  respuesta: string,
  aceptadas: string[],
): boolean {
  const valor = normalizarRespuesta(respuesta);
  return aceptadas.some((aceptada) => normalizarRespuesta(aceptada) === valor);
}

export type Opcion = { id: string; texto: string; correcta: boolean };

export function puntuarOpcionMultiple(
  seleccionadas: string[],
  opciones: Opcion[],
  puntos: number,
  parcial: boolean,
): number {
  const correctas = opciones.filter((o) => o.correcta).map((o) => o.id);
  const seleccion = new Set(seleccionadas);
  const tieneIncorrecta = opciones.some((o) => !o.correcta && seleccion.has(o.id));
  const aciertos = correctas.filter((id) => seleccion.has(id)).length;
  if (!parcial) {
    return !tieneIncorrecta && aciertos === correctas.length ? puntos : 0;
  }
  if (tieneIncorrecta || correctas.length === 0) return 0;
  return Math.round((aciertos / correctas.length) * puntos);
}

export const registroSchema = z.object({
  nombres: z.string().trim().min(2, "Escribe tu nombre").max(60),
  apellidos: z.string().trim().min(2, "Escribe tus apellidos").max(60),
  empresaId: z.string().min(1, "Selecciona una empresa"),
  aceptaDatos: z.literal("on", {
    errorMap: () => ({ message: "Debes aceptar el tratamiento de datos" }),
  }),
});

export const desafioSchema = z
  .object({
    titulo: z.string().trim().min(3).max(100),
    descripcion: z.string().trim().min(3).max(600),
    tipo: z.enum([
      "CHECK_IN",
      "PUNTUALIDAD",
      "OPCION_MULTIPLE",
      "RESPUESTA_ABIERTA",
      "EVIDENCIA_FOTO",
      "ENCUESTA",
    ]),
    puntos: z.coerce.number().int().min(0).max(10000),
    dia: z.coerce.number().int().min(0).max(2),
    componenteId: z.string().optional(),
    ubicacion: z.string().trim().max(100),
  })
  .refine((data) => data.dia !== 2 || Boolean(data.componenteId), {
    path: ["componenteId"],
    message: "El componente es obligatorio para el día 2",
  });
