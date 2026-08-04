export const CODIGO_DESAFIO_CIERRE = "cierre-cosecha-gratitud-celebracion";
export const TITULO_DESAFIO_CIERRE = "Cierre: Cosecha, gratitud y celebración";
export const FORMATO_COSECHA = "cosecha";

export const PREGUNTAS_COSECHA = [
  {
    id: "meLlevo",
    titulo: "Me llevo",
    ayuda: "Una idea o aprendizaje.",
  },
  {
    id: "agradezco",
    titulo: "Agradezco",
    ayuda: "Una persona, equipo, conversación o práctica.",
  },
  {
    id: "activo",
    titulo: "Activo",
    ayuda: "Una acción que quisiera impulsar al regresar.",
  },
] as const;

export type RespuestasCosecha = {
  meLlevo: string;
  agradezco: string;
  activo: string;
};

// Una completitud heredada no habilita la tarjeta hasta tener las tres reflexiones.
export function esRespuestasCosecha(valor: unknown): valor is RespuestasCosecha {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return false;
  const respuesta = valor as Record<string, unknown>;
  return PREGUNTAS_COSECHA.every(({ id }) => typeof respuesta[id] === "string" && respuesta[id].trim().length > 0);
}
