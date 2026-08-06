import { Download, FileSpreadsheet, Images } from "lucide-react";

const reportes = [
  ["participantes", "Participantes con puntajes", "Listado completo, empresa y estado."],
  ["ranking-individual", "Ranking individual final", "Posiciones ordenadas por puntaje."],
  ["completitudes", "Completitudes por desafío", "Detalle de estado, puntos y hora."],
  ["encuestas", "Respuestas de encuestas", "Respuestas libres y escalas exportables."],
  ["empresas", "Participación por empresa", "Totales agregados por filial."],
];

export default function Reportes() {
  return (
    <div className="p-4 md:p-7">
      <div><p className="font-extrabold text-[var(--epm-verde-medio)]">Datos para el cierre</p><h1 className="text-3xl font-extrabold text-[var(--epm-azul-profundo)]">Reportes</h1><p className="mt-2 text-sm text-slate-600">Archivos CSV con codificación UTF-8, listos para Excel o herramientas de análisis.</p></div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reportes.map(([tipo, titulo, texto]) => (
          <a key={tipo} href={`/api/reportes/${tipo}`} className="tarjeta group p-5">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-sky-50 text-[var(--epm-azul)]"><FileSpreadsheet /></span>
            <h2 className="mt-4 text-lg font-extrabold text-[var(--epm-azul-profundo)]">{titulo}</h2><p className="mt-1 text-sm text-slate-600">{texto}</p>
            <span className="mt-4 flex items-center gap-2 text-sm font-extrabold text-[var(--epm-azul)]"><Download size={17} /> Descargar CSV</span>
          </a>
        ))}
        <a href="/api/recuerdos/zip" className="tarjeta group p-5"><span className="grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-[var(--epm-verde-medio)]"><Images /></span><h2 className="mt-4 text-lg font-extrabold">Álbum completo</h2><p className="mt-1 text-sm text-slate-600">Todas las fotos originales del muro.</p><span className="mt-4 flex items-center gap-2 text-sm font-extrabold text-[var(--epm-azul)]"><Download size={17} /> Descargar ZIP</span></a>
      </div>
    </div>
  );
}
