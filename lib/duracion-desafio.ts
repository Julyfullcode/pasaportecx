import { ZONA_HORARIA_EVENTO } from "@/lib/puntualidad";

export const DURACION_PREDETERMINADA_MINUTOS = 60;
export const DURACION_MAXIMA_MINUTOS = 10_080;

export type DesafioConDuracion = {
  duracionMinutos: number | null;
  publicadoEn: Date | null;
  disponibleDesde: Date | null;
  disponibleHasta: Date | null;
  creadoEn: Date;
};

export function fechaCierreDesafio(desafio: DesafioConDuracion) {
  if (desafio.duracionMinutos !== null) {
    const inicio = desafio.publicadoEn ?? desafio.creadoEn;
    return new Date(inicio.getTime() + desafio.duracionMinutos * 60_000);
  }
  return desafio.disponibleHasta;
}

export function estadoTemporalDesafio(desafio: DesafioConDuracion, ahora = new Date()) {
  if (desafio.disponibleDesde && desafio.disponibleDesde > ahora) return "PROGRAMADO" as const;
  const cierre = fechaCierreDesafio(desafio);
  if (cierre && cierre <= ahora) return "FINALIZADO" as const;
  return "DISPONIBLE" as const;
}

export function fechaHoraColombiaComoFecha(valor: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor)) {
    throw new Error("Configura una fecha y hora de cierre válidas.");
  }
  const fecha = new Date(valor + ":00-05:00");
  if (Number.isNaN(fecha.getTime())) throw new Error("Configura una fecha y hora de cierre válidas.");
  return fecha;
}

export function fechaParaInputColombia(fecha: Date | null) {
  if (!fecha) return "";
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: ZONA_HORARIA_EVENTO,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(fecha).map((parte) => [parte.type, parte.value]),
  );
  return partes.year + "-" + partes.month + "-" + partes.day + "T" + partes.hour + ":" + partes.minute;
}

export function descripcionDuracionDesafio(desafio: DesafioConDuracion) {
  if (desafio.duracionMinutos !== null) {
    return desafio.duracionMinutos + " minutos desde la publicación";
  }
  const cierre = fechaCierreDesafio(desafio);
  if (!cierre) return "Sin duración configurada";
  return "Cierra " + new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: ZONA_HORARIA_EVENTO,
  }).format(cierre);
}
