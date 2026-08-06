import Link from "next/link";
import { ChevronRight, MessagesSquare, Pencil, Radio, Users } from "lucide-react";
import { asegurarActividadConocimiento, preguntasDe } from "@/lib/actividad";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminActividades() {
  await asegurarActividadConocimiento();
  const actividades = await db.actividad.findMany({ orderBy: { creadoEn: "desc" }, include: { _count: { select: { respuestas: true, participaciones: true } } } });
  return <div className="p-4 md:p-7">
    <div><p className="font-extrabold text-[var(--epm-verde-medio)]">Participación guiada</p><h1 className="text-3xl font-extrabold text-[var(--epm-azul-profundo)]">Actividades</h1><p className="mt-2 max-w-3xl text-slate-600">Configura el ejercicio y controla en vivo cuándo aparece cada pregunta. Las actividades son independientes de los desafíos.</p></div>
    <div className="mt-6 space-y-4">{actividades.map((actividad) => {
      const preguntas = preguntasDe(actividad.configuracion);
      return <article key={actividad.id} className="tarjeta overflow-hidden">
        <div className="flex flex-wrap items-center gap-4 p-5"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-emerald-50 text-[var(--epm-teal)]"><MessagesSquare /></span><div className="min-w-[230px] flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-extrabold text-[var(--epm-azul-profundo)]">{actividad.titulo}</h2><span className={`rounded-full px-2 py-1 text-xs font-extrabold ${actividad.estado === "PUBLICADA" ? "bg-emerald-100 text-emerald-800" : actividad.estado === "CERRADA" ? "bg-slate-200 text-slate-700" : "bg-amber-100 text-amber-800"}`}>{actividad.estado}</span></div><p className="mt-1 text-sm text-slate-600">{preguntas.length} preguntas · {actividad.puntosHabilitados ? `${actividad.puntos} puntos al completar` : "Sin puntos"}</p></div></div>
        <div className="grid border-t bg-slate-50 sm:grid-cols-2"><div className="flex items-center gap-3 border-b p-4 sm:border-b-0 sm:border-r"><Users className="text-[var(--epm-azul)]" /><span><strong className="block">{actividad._count.participaciones} participantes completaron</strong><small className="text-slate-500">{actividad._count.respuestas} respuestas guardadas</small></span></div><div className="flex flex-wrap items-center justify-end gap-3 p-4"><Link href={`/admin/actividades/${actividad.id}`} className="boton-secundario !min-h-10"><Pencil size={17} /> Configurar</Link><Link href={`/admin/actividades/${actividad.id}/moderar`} className="boton-primario !min-h-10"><Radio size={17} /> Moderar <ChevronRight size={17} /></Link></div></div>
      </article>;
    })}</div>
  </div>;
}
