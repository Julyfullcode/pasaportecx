import { AlertTriangle, CheckCircle2, HardDrive, Images, Trash2 } from "lucide-react";
import { limpiarArchivosHuerfanos } from "@/app/admin/actions";
import type { obtenerReporteAlmacenamiento } from "@/lib/almacenamiento";

type Reporte = Awaited<ReturnType<typeof obtenerReporteAlmacenamiento>>;

function formatoBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(bytes >= 100 * 1024 ** 2 ? 0 : 1)} MB`;
}

const etiquetas: Record<string, string> = {
  "agenda-dias": "Fotos de agenda",
  empresas: "Logos de empresas",
  evidencias: "Evidencias",
  expositores: "Expositores",
  miniaturas: "Miniaturas",
  perfiles: "Fotos de perfil",
  recuerdos: "Recuerdos",
};

export function EstadoAlmacenamiento({ reporte }: { reporte: Reporte }) {
  if (!reporte.disponible) {
    return (
      <section className="tarjeta mt-6 p-5">
        <h2 className="flex items-center gap-2 text-xl font-extrabold"><HardDrive /> Almacenamiento</h2>
        <p className="mt-2 text-sm text-slate-600">{reporte.motivo}</p>
      </section>
    );
  }

  const nivel = reporte.porcentaje >= 95 ? "critico" : reporte.porcentaje >= 85 ? "alto" : reporte.porcentaje >= 70 ? "medio" : "bien";
  const colorBarra = nivel === "critico" ? "bg-red-600" : nivel === "alto" ? "bg-orange-500" : nivel === "medio" ? "bg-amber-400" : "bg-emerald-500";
  return (
    <section className="tarjeta mt-6 overflow-hidden">
      <div className="marca-gradiente p-5 text-white md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-extrabold text-[var(--epm-verde)]">Control de capacidad</p>
            <h2 className="flex items-center gap-2 text-2xl font-extrabold"><HardDrive /> Almacenamiento</h2>
          </div>
          <div className="rounded-2xl bg-white/12 px-4 py-3 text-right backdrop-blur">
            <strong className="block text-2xl">{formatoBytes(reporte.bytesTotales)}</strong>
            <span className="text-xs text-white/75">de {formatoBytes(reporte.limiteBytes)} · {reporte.archivos} archivos</span>
          </div>
        </div>
        <div className="mt-5 h-4 overflow-hidden rounded-full bg-white/20">
          <div className={`h-full rounded-full transition-all ${colorBarra}`} style={{ width: `${Math.max(1, reporte.porcentaje)}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs font-bold">
          <span>{reporte.porcentaje.toFixed(1)}% utilizado</span>
          <span>{formatoBytes(Math.max(0, reporte.limiteBytes - reporte.bytesTotales))} disponibles</span>
        </div>
        {nivel !== "bien" && (
          <p className="mt-3 flex items-center gap-2 rounded-xl bg-white/10 p-3 text-sm font-bold">
            <AlertTriangle size={18} /> {nivel === "critico" ? "Capacidad crítica: elimina archivos antes de nuevas cargas." : nivel === "alto" ? "Capacidad alta: conviene realizar una limpieza." : "El almacenamiento llegó al 70%; revisa las categorías con mayor consumo."}
          </p>
        )}
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[1.3fr_.7fr]">
        <div>
          <h3 className="flex items-center gap-2 font-extrabold text-[var(--epm-azul-profundo)]"><Images size={19} /> Consumo por categoría</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {reporte.carpetas.map((carpeta) => (
              <div key={carpeta.nombre} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
                <div className="min-w-0"><strong className="block truncate text-sm">{etiquetas[carpeta.nombre] ?? carpeta.nombre}</strong><span className="text-xs text-slate-500">{carpeta.archivos} archivos</span></div>
                <strong className="shrink-0 text-sm text-[var(--epm-azul-profundo)]">{formatoBytes(carpeta.bytes)}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <h3 className="flex items-center gap-2 font-extrabold text-emerald-950">{reporte.huerfanos.length ? <Trash2 size={19} /> : <CheckCircle2 size={19} />} Archivos huérfanos</h3>
          <p className="mt-2 text-sm text-emerald-900/80">
            {reporte.huerfanos.length
              ? `Encontramos ${reporte.huerfanos.length} archivos sin referencia, creados hace más de 24 horas, que ocupan ${formatoBytes(reporte.bytesHuerfanos)}.`
              : "No encontramos archivos antiguos sin referencia. El almacenamiento está limpio."}
          </p>
          {reporte.huerfanos.length > 0 && (
            <form action={limpiarArchivosHuerfanos} className="mt-4">
              <label className="etiqueta text-xs" htmlFor="confirmar-limpieza">Escribe ELIMINAR HUERFANOS</label>
              <input id="confirmar-limpieza" className="campo" name="confirmacion" required autoComplete="off" />
              <button className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-red-700 px-4 font-extrabold text-white"><Trash2 size={17} /> Eliminar únicamente estos archivos</button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
