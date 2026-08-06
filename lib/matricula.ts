export const FORMATO_MATRICULA = "matricula" as const;

export type OpcionMatricula = {
  id: "a" | "b";
  texto: string;
  urlImagen: string;
};

export type ConfiguracionMatricula = {
  formato: typeof FORMATO_MATRICULA;
  opciones: [OpcionMatricula, OpcionMatricula];
};

export function esConfiguracionMatricula(valor: unknown): valor is ConfiguracionMatricula {
  if (!valor || typeof valor !== "object") return false;
  const config = valor as Partial<ConfiguracionMatricula>;
  return config.formato === FORMATO_MATRICULA
    && Array.isArray(config.opciones)
    && config.opciones.length === 2
    && config.opciones.every((opcion) => Boolean(opcion?.id && opcion.texto && opcion.urlImagen));
}

export function respuestaMatricula(valor: unknown) {
  if (!valor || typeof valor !== "object") return null;
  const opcionId = (valor as { opcionId?: unknown }).opcionId;
  return opcionId === "a" || opcionId === "b" ? opcionId : null;
}
