import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronLeft, Download, Eye, ExternalLink, Play, Radio, Square } from "lucide-react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { preguntasDe } from "@/lib/actividad";
import { ActualizacionModeracion } from "@/components/admin/ActualizacionModeracion";
import { ReiniciarActividad } from "@/components/admin/ReiniciarActividad";
import { GraficaActividadEnVivo } from "@/components/admin/GraficaActividadEnVivo";
import { avanzarActividad, cerrarActividad, publicarActividad, retrocederActividad } from "@/app/admin/(privado)/actividades/actions";

export const dynamic = "force-dynamic";

export default async function ModerarActividad({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actividad = await db.actividad.findUnique({ where: { id }, include: { _count: { select: { respuestas: true, participaciones: true } } } });
  if (!actividad) notFound();
  const preguntas = preguntasDe(actividad.configuracion);
  const esFormularioCompleto = actividad.tipo === "EVALUACION_WHATSAPP";
  const conteos = await db.respuestaActividad.groupBy({ by: ["preguntaId"], where: { actividadId: id }, _count: { _all: true } });
  const conteoPorPregunta = new Map(conteos.map((item) => [item.preguntaId, item._count._all]));
  const actual = actividad.pasoActual > 0 && actividad.pasoActual <= preguntas.length ? preguntas[actividad.pasoActual - 1] : null;
  const etapa = esFormularioCompleto ? "Formulario completo" : actividad.pasoActual === 0 ? "Invitación inicial" : actual ? `Pregunta ${actividad.pasoActual} de ${preguntas.length}` : "Pantalla de cierre";
  const descripcionEtapa = esFormularioCompleto ? "Al publicar, las personas verán la empresa y todas las preguntas abiertas en una sola pantalla." : actual?.titulo ?? (actividad.pasoActual === 0 ? actividad.invitacion : actividad.cierre);

  return <div className="p-4 md:p-7"><ActualizacionModeracion />
    <Link href="/admin/actividades" className="inline-flex items-center gap-2 font-extrabold text-[var(--epm-azul)]"><ArrowLeft size={18} /> Volver</Link>
    <div className="mt-4 flex flex-wrap items-end justify-between gap-3"><div><p className="font-extrabold text-[var(--epm-verde-medio)]">Control en vivo</p><h1 className="text-3xl font-extrabold text-[var(--epm-azul-profundo)]">{actividad.titulo}</h1></div><span className={`rounded-full px-4 py-2 text-sm font-extrabold ${actividad.estado === "PUBLICADA" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}><Radio className="mr-2 inline" size={16} />{actividad.estado}</span></div>

    <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_280px]">
      <section className="marca-gradiente overflow-hidden rounded-3xl p-6 text-white shadow-xl md:p-9"><p className="text-sm font-extrabold uppercase tracking-widest text-[var(--epm-verde)]">En pantalla ahora</p><h2 className="mt-3 text-3xl font-extrabold">{etapa}</h2><p className="mt-3 max-w-3xl text-lg text-white/85">{descripcionEtapa}</p><div className="mt-6 flex flex-wrap gap-3">
        {actividad.estado !== "PUBLICADA" ? <form action={publicarActividad}><input type="hidden" name="id" value={id} /><button className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--epm-verde)] px-5 font-extrabold text-[var(--epm-azul-profundo)]"><Play /> {esFormularioCompleto ? "Publicar formulario" : "Publicar e iniciar invitación"}</button></form> : <>
          {!esFormularioCompleto && <><form action={retrocederActividad}><input type="hidden" name="id" value={id} /><button disabled={actividad.pasoActual === 0} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/40 px-5 font-extrabold disabled:opacity-40"><ChevronLeft /> Anterior</button></form><form action={avanzarActividad}><input type="hidden" name="id" value={id} /><button disabled={actividad.pasoActual > preguntas.length} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--epm-verde)] px-5 font-extrabold text-[var(--epm-azul-profundo)] disabled:opacity-40">{actividad.pasoActual === 0 ? "Mostrar primera pregunta" : actividad.pasoActual === preguntas.length ? "Mostrar cierre" : "Siguiente pregunta"}<ArrowRight /></button></form></>}
          <form action={cerrarActividad}><input type="hidden" name="id" value={id} /><button className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/40 px-5 font-extrabold"><Square size={18} /> Cerrar actividad</button></form>
        </>}
      </div></section>
      <aside className="tarjeta flex flex-col items-center p-5 text-center"><h2 className="font-extrabold text-[var(--epm-azul-profundo)]">QR de acceso</h2><p className="mt-1 text-xs text-slate-500">Permanece disponible durante la moderación.</p><img src={`/api/admin/actividades/${id}/qr`} alt={`QR de ${actividad.titulo}`} className="mt-3 aspect-square w-full max-w-56 rounded-2xl border bg-white object-contain p-2" /><a href={`/api/admin/actividades/${id}/qr`} target="_blank" rel="noopener noreferrer" className="boton-secundario mt-3 w-full"><ExternalLink size={17} /> Abrir QR grande</a></aside>
    </div>

    <div className="mt-6"><GraficaActividadEnVivo id={id} /></div>
    <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_280px]">
      <section className="tarjeta p-5"><h2 className="text-xl font-extrabold text-[var(--epm-azul-profundo)]">Estado de respuestas</h2><div className="mt-4 space-y-2">{preguntas.map((pregunta, indice) => <div key={pregunta.id} className={`flex items-center gap-3 rounded-xl border p-3 ${!esFormularioCompleto && actividad.pasoActual === indice + 1 ? "border-[var(--epm-azul)] bg-sky-50" : "border-slate-200"}`}><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white font-extrabold text-[var(--epm-azul)]">{indice + 1}</span><span className="min-w-0 flex-1"><strong className="block truncate">{pregunta.titulo}</strong><small className="text-slate-500">{conteoPorPregunta.get(pregunta.id) ?? 0} respuestas</small></span>{(esFormularioCompleto ? (conteoPorPregunta.get(pregunta.id) ?? 0) > 0 : actividad.pasoActual > indice + 1) && <CheckCircle2 className="text-emerald-600" />}</div>)}</div></section>
      <aside className="space-y-4"><div className="tarjeta p-5"><Eye className="text-[var(--epm-azul)]" /><strong className="mt-2 block text-3xl text-[var(--epm-azul-profundo)]">{actividad._count.respuestas}</strong><span className="text-sm text-slate-600">respuestas totales</span><strong className="mt-4 block text-3xl text-[var(--epm-azul-profundo)]">{actividad._count.participaciones}</strong><span className="text-sm text-slate-600">personas completaron</span></div><div className="tarjeta p-5"><a href={`/api/admin/actividades/${id}/resultados`} className="boton-secundario mb-4 w-full"><Download size={18} /> Exportar Excel</a><p className="mb-3 text-sm text-slate-600"><strong>Exporta primero los resultados.</strong> Reiniciar conserva las preguntas, pero elimina respuestas y puntos.</p><ReiniciarActividad id={id} /></div></aside>
    </div>
  </div>;
}
