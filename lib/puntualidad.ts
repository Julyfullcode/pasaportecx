export const TIPO_ESPECIAL_PUNTUALIDAD = "PUNTUALIDAD" as const;
export const ZONA_HORARIA_EVENTO = "America/Bogota";

export type ConfiguracionPuntualidad = {
  tipoEspecial: typeof TIPO_ESPECIAL_PUNTUALIDAD;
  fechaHoraObjetivo: string;
  toleranciaMinutos: number;
};

export type ResultadoPuntualidad = ConfiguracionPuntualidad & {
  estadoVentana: "ANTES" | "DENTRO" | "DESPUES";
  obtuvoPuntos: boolean;
  minutosAntes: number;
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

export function configuracionPuntualidadDesdeValor(valor: unknown): ConfiguracionPuntualidad | null {
  if (typeof valor === "string") {
    try {
      return configuracionPuntualidadDesdeValor(JSON.parse(valor));
    } catch {
      return null;
    }
  }
  if (!valor || typeof valor !== "object") return null;
  const config = valor as Record<string, unknown>;
  const anidada = config.puntualidad ?? config.configuracionPuntualidad;
  if (anidada && anidada !== valor) {
    const normalizada = configuracionPuntualidadDesdeValor(anidada);
    if (normalizada) return normalizada;
  }
  const tipoEspecial = String(config.tipoEspecial ?? config.tipo ?? config.tipoDesafio ?? "").trim().toUpperCase();
  const fechaGuardada = config.fechaHoraObjetivo ?? config.fechaHora ?? config.fechaObjetivo;
  const fechaOriginal = typeof fechaGuardada === "string" ? fechaGuardada.trim() : "";
  const fechaHoraObjetivo = fechaOriginal.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)?.[0] ?? "";
  const toleranciaGuardada = config.toleranciaMinutos ?? config.minutosTolerancia ?? config.tolerancia;
  const toleranciaMinutos = Number(toleranciaGuardada);
  const tieneCamposDePuntualidad = Boolean(fechaOriginal) && toleranciaGuardada !== undefined;
  if ((tipoEspecial !== TIPO_ESPECIAL_PUNTUALIDAD && !tieneCamposDePuntualidad)
    || !esFechaHoraReal(fechaHoraObjetivo)
    || !Number.isInteger(toleranciaMinutos)
    || toleranciaMinutos < 0
    || toleranciaMinutos > 1440) return null;
  return { tipoEspecial: TIPO_ESPECIAL_PUNTUALIDAD, fechaHoraObjetivo, toleranciaMinutos };
}

export function esConfiguracionPuntualidad(valor: unknown): valor is ConfiguracionPuntualidad {
  return configuracionPuntualidadDesdeValor(valor) !== null;
}

export function configuracionPuntualidadDesafio(
  configuracion: unknown,
  completitudes: unknown[] = [],
): ConfiguracionPuntualidad | null {
  const guardada = configuracionPuntualidadDesdeValor(configuracion);
  if (guardada) return guardada;
  for (const completitud of completitudes) {
    const candidata = completitud && typeof completitud === "object" && "respuesta" in completitud
      ? (completitud as { respuesta?: unknown }).respuesta
      : completitud;
    const recuperada = configuracionPuntualidadDesdeValor(candidata);
    if (recuperada) return recuperada;
  }
  return null;
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
  const toleranciaMs = configuracion.toleranciaMinutos * 60_000;
  const estadoVentana = ahora.getTime() < objetivo.getTime() - toleranciaMs
    ? "ANTES"
    : ahora.getTime() > objetivo.getTime() + toleranciaMs
      ? "DESPUES"
      : "DENTRO";
  const minutosAntes = diferenciaMs >= 0 ? 0 : Math.ceil(Math.abs(diferenciaMs) / 60_000);
  const minutosTarde = diferenciaMs <= 0 ? 0 : Math.ceil(diferenciaMs / 60_000);
  return {
    ...configuracion,
    estadoVentana,
    obtuvoPuntos: estadoVentana === "DENTRO",
    minutosAntes,
    minutosTarde,
  };
}

export function resultadoPuntualidadDesdeRespuesta(valor: unknown): ResultadoPuntualidad | null {
  if (!valor || typeof valor !== "object") return null;
  const respuestaCompleta = valor as Record<string, unknown>;
  const configuracion = configuracionPuntualidadDesdeValor(valor);
  if (!configuracion) return null;
  if (typeof respuestaCompleta.obtuvoPuntos !== "boolean" || !Number.isInteger(respuestaCompleta.minutosTarde)) return null;
  const estadoGuardado = respuestaCompleta.estadoVentana;
  const estadoVentana = estadoGuardado === "ANTES" || estadoGuardado === "DENTRO" || estadoGuardado === "DESPUES"
    ? estadoGuardado
    : respuestaCompleta.obtuvoPuntos ? "DENTRO" : "DESPUES";
  return {
    tipoEspecial: TIPO_ESPECIAL_PUNTUALIDAD,
    fechaHoraObjetivo: configuracion.fechaHoraObjetivo,
    toleranciaMinutos: configuracion.toleranciaMinutos,
    estadoVentana,
    obtuvoPuntos: respuestaCompleta.obtuvoPuntos,
    minutosAntes: Number.isInteger(respuestaCompleta.minutosAntes) ? Number(respuestaCompleta.minutosAntes) : 0,
    minutosTarde: Number(respuestaCompleta.minutosTarde),
  };
}

export function mensajePuntualidad(resultado: ResultadoPuntualidad, puntos: number) {
  if (resultado.estadoVentana === "ANTES") {
    return `Este desafío todavía no está disponible. La hora objetivo está a ${resultado.minutosAntes} minutos y podrás registrarte cuando falten ${resultado.toleranciaMinutos} minutos.`;
  }
  if (resultado.obtuvoPuntos) {
    return resultado.minutosTarde === 0
      ? `Llegaste a tiempo y ganaste ${puntos} puntos.`
      : `Llegaste ${resultado.minutosTarde} minutos después de la hora y estás dentro del límite. Ganaste ${puntos} puntos.`;
  }
  return `Desafortunadamente, llegaste ${resultado.minutosTarde} minutos tarde. El registro cerró ${resultado.toleranciaMinutos} minutos después de la hora y ya no aplican los ${puntos} puntos de este desafío.`;
}

export function fechaHoraPuntualidadLegible(configuracion: ConfiguracionPuntualidad) {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: ZONA_HORARIA_EVENTO,
  }).format(fechaHoraObjetivoComoFecha(configuracion));
}
