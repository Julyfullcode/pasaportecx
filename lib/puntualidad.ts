export const TIPO_ESPECIAL_PUNTUALIDAD = "PUNTUALIDAD" as const;
export const ZONA_HORARIA_EVENTO = "America/Bogota";

export type ConfiguracionPuntualidad = {
  tipoEspecial: typeof TIPO_ESPECIAL_PUNTUALIDAD;
  fechaHoraObjetivo: string;
  toleranciaMinutos: number;
};

export type ResultadoPuntualidad = ConfiguracionPuntualidad & {
  obtuvoPuntos: boolean;
  minutosTarde: number;
};

const FORMATO_FECHA_HORA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

function esFechaHoraReal(valor: string) {
  if (!FORMATO_FECHA_HORA.test(valor)) return false;
  const [fecha, hora] = valor.split("T");
  const [ano, mes, dia] = fecha.split("-").map(Number);
  const [horas, minutos] = hora.split(":").map(Number);
  const comprobacion = new Date(Date.UTC(ano, mes - 1, dia, horas, minutos));
  return comprobacion.getUTCFullYear() === ano
    && comprobacion.getUTCMonth() === mes - 1
    && comprobacion.getUTCDate() === dia
    && comprobacion.getUTCHours() === horas
    && comprobacion.getUTCMinutes() === minutos;
}

export function esConfiguracionPuntualidad(valor: unknown): valor is ConfiguracionPuntualidad {
  if (!valor || typeof valor !== "object") return false;
  const config = valor as Record<string, unknown>;
  return config.tipoEspecial === TIPO_ESPECIAL_PUNTUALIDAD
    && typeof config.fechaHoraObjetivo === "string"
    && esFechaHoraReal(config.fechaHoraObjetivo)
    && Number.isInteger(config.toleranciaMinutos)
    && Number(config.toleranciaMinutos) >= 0
    && Number(config.toleranciaMinutos) <= 1440;
}

export function crearConfiguracionPuntualidad(fechaHoraObjetivo: string, toleranciaMinutos: number): ConfiguracionPuntualidad {
  const configuracion = {
    tipoEspecial: TIPO_ESPECIAL_PUNTUALIDAD,
    fechaHoraObjetivo,
    toleranciaMinutos,
  };
  if (!esConfiguracionPuntualidad(configuracion)) {
    throw new Error("Configura una fecha, hora y tolerancia válidas para el desafío de puntualidad.");
  }
  return configuracion;
}

export function fechaHoraObjetivoComoFecha(configuracion: ConfiguracionPuntualidad) {
  // Colombia no aplica horario de verano. Guardar la hora administrativa sin
  // zona y convertirla explícitamente evita depender de la zona horaria de Vercel.
  const fecha = new Date(`${configuracion.fechaHoraObjetivo}:00-05:00`);
  if (Number.isNaN(fecha.getTime())) throw new Error("La fecha objetivo de puntualidad no es válida.");
  return fecha;
}

export function evaluarPuntualidad(configuracion: ConfiguracionPuntualidad, ahora = new Date()): ResultadoPuntualidad {
  const objetivo = fechaHoraObjetivoComoFecha(configuracion);
  const diferenciaMs = ahora.getTime() - objetivo.getTime();
  const minutosTarde = diferenciaMs <= 0 ? 0 : Math.floor(diferenciaMs / 60_000);
  return {
    ...configuracion,
    obtuvoPuntos: minutosTarde <= configuracion.toleranciaMinutos,
    minutosTarde,
  };
}

export function resultadoPuntualidadDesdeRespuesta(valor: unknown): ResultadoPuntualidad | null {
  if (!valor || typeof valor !== "object") return null;
  const respuestaCompleta = valor as Record<string, unknown>;
  if (!esConfiguracionPuntualidad(valor)) return null;
  if (typeof respuestaCompleta.obtuvoPuntos !== "boolean" || !Number.isInteger(respuestaCompleta.minutosTarde)) return null;
  return {
    tipoEspecial: TIPO_ESPECIAL_PUNTUALIDAD,
    fechaHoraObjetivo: valor.fechaHoraObjetivo,
    toleranciaMinutos: valor.toleranciaMinutos,
    obtuvoPuntos: respuestaCompleta.obtuvoPuntos,
    minutosTarde: Number(respuestaCompleta.minutosTarde),
  };
}

export function mensajePuntualidad(resultado: ResultadoPuntualidad, puntos: number) {
  if (resultado.obtuvoPuntos) {
    return resultado.minutosTarde === 0
      ? `Llegaste a tiempo y ganaste ${puntos} puntos.`
      : `Llegaste ${resultado.minutosTarde} minutos después de la hora y estás dentro del límite. Ganaste ${puntos} puntos.`;
  }
  return `Desafortunadamente, llegaste ${resultado.minutosTarde} minutos tarde y ya no aplican los ${puntos} puntos de este desafío.`;
}

export function fechaHoraPuntualidadLegible(configuracion: ConfiguracionPuntualidad) {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: ZONA_HORARIA_EVENTO,
  }).format(fechaHoraObjetivoComoFecha(configuracion));
}
