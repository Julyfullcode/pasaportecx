export type Muestra = {
  duracionMs: number;
  status?: number;
  timeout?: boolean;
  errorLogico?: string;
};

export type ReporteMetrica = {
  escenario: string;
  solicitudes: number;
  duracionSegundos: number;
  avgMs: number;
  p95Ms: number;
  p99Ms: number;
  throughputRps: number;
  errores: { total: number; tasaPorcentaje: number; http4xx: number; http5xx: number; timeouts: number; logicos: number };
};

function percentil(valores: number[], porcentaje: number) {
  if (!valores.length) return 0;
  const ordenados = [...valores].sort((a, b) => a - b);
  return ordenados[Math.max(0, Math.ceil(ordenados.length * porcentaje) - 1)];
}

function redondear(valor: number, decimales = 2) {
  const factor = 10 ** decimales;
  return Math.round(valor * factor) / factor;
}

export function crearReporte(escenario: string, muestras: Muestra[], duracionMs: number): ReporteMetrica {
  const tiempos = muestras.map((muestra) => muestra.duracionMs);
  const http4xx = muestras.filter((muestra) => (muestra.status ?? 0) >= 400 && (muestra.status ?? 0) < 500).length;
  const http5xx = muestras.filter((muestra) => (muestra.status ?? 0) >= 500).length;
  const timeouts = muestras.filter((muestra) => muestra.timeout).length;
  const logicos = muestras.filter((muestra) => Boolean(muestra.errorLogico)).length;
  const totalErrores = muestras.filter((muestra) => muestra.timeout || muestra.errorLogico || (muestra.status ?? 0) >= 400).length;
  return {
    escenario,
    solicitudes: muestras.length,
    duracionSegundos: redondear(duracionMs / 1000),
    avgMs: redondear(tiempos.reduce((suma, valor) => suma + valor, 0) / Math.max(1, tiempos.length)),
    p95Ms: redondear(percentil(tiempos, 0.95)),
    p99Ms: redondear(percentil(tiempos, 0.99)),
    throughputRps: redondear(muestras.length / Math.max(0.001, duracionMs / 1000)),
    errores: {
      total: totalErrores,
      tasaPorcentaje: redondear((totalErrores / Math.max(1, muestras.length)) * 100),
      http4xx,
      http5xx,
      timeouts,
      logicos,
    },
  };
}

export function imprimirReporte(reporte: ReporteMetrica) {
  console.log(`\n[LOAD] ${reporte.escenario}`);
  console.table({
    solicitudes: reporte.solicitudes,
    "duración (s)": reporte.duracionSegundos,
    "avg (ms)": reporte.avgMs,
    "p95 (ms)": reporte.p95Ms,
    "p99 (ms)": reporte.p99Ms,
    "throughput (req/s)": reporte.throughputRps,
    "errores (%)": reporte.errores.tasaPorcentaje,
    "4xx": reporte.errores.http4xx,
    "5xx": reporte.errores.http5xx,
    timeouts: reporte.errores.timeouts,
    "errores lógicos": reporte.errores.logicos,
  });
}
