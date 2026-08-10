import { notFound } from "next/navigation";
import { MessageSquareText } from "lucide-react";
import { requerirAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { preguntasDe } from "@/lib/actividad";
import { analizarRespuestasActividad } from "@/lib/analisis-actividad";
import { Logo } from "@/components/marca/Logo";
import { TexturaArcos } from "@/components/marca/TexturaArcos";
import { ActualizacionModeracion } from "@/components/admin/ActualizacionModeracion";
import { ResumenAnalisisActividad } from "@/components/admin/ResumenAnalisisActividad";

export const dynamic = "force-dynamic";

function textoRespuesta(valor: unknown) {
  if (typeof valor === "string") return valor;
  if (valor && typeof valor === "object" && !Array.isArray(valor)) return Object.entries(valor as Record<string, unknown>).map(([clave, respuesta]) => `${clave.toUpperCase()}: ${respuesta === true ? "Verdadero" : respuesta === false ? "Falso" : String(respuesta)}`).join(" · ");
  return "";
}

export default async function ProyectarRespuestasActividad({ params }: { params: Promise<{ id: string }> }) {
  await requerirAdmin();
  const { id } = await params;
  const actividad = await db.actividad.findUnique({ where: { id }, include: { respuestas: { orderBy: { respondidoEn: "asc" } } } });
  if (!actividad || !actividad.anonima) notFound();
  const preguntas = preguntasDe(actividad.configuracion);
  const empresas = await db.empresa.findMany({ select: { id: true, nombre: true, urlLogo: true } });
  const empresaPorId = new Map(empresas.map((empresa) => [empresa.id, empresa]));
  const grupos = new Map<string, typeof actividad.respuestas>();
  for (const respuesta of actividad.respuestas) {
    const lista = grupos.get(respuesta.participanteId) ?? [];
    lista.push(respuesta);
    grupos.set(respuesta.participanteId, lista);
  }
  const evaluaciones = Array.from(grupos.values());
  const analisis = analizarRespuestasActividad(preguntas, actividad.respuestas);

  return <main className="marca-gradiente relative min-h-screen overflow-hidden p-4 text-white md:p-7"><TexturaArcos /><ActualizacionModeracion />
    <div className="relative z-10">
    <header className="flex items-center gap-5 rounded-3xl border border-white/15 bg-white/10 p-5 shadow-xl backdrop-blur md:p-6"><Logo className="h-11 w-auto md:h-14" /><span className="h-12 w-px bg-white/25" /><div className="min-w-0"><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[var(--epm-verde)] md:text-sm">Resultados anónimos en vivo</p><h1 className="truncate text-2xl font-extrabold md:text-4xl">{actividad.titulo}</h1></div><span className="ml-auto hidden shrink-0 rounded-full bg-[var(--epm-verde)] px-5 py-3 font-extrabold text-[var(--epm-azul-profundo)] md:inline-flex">{evaluaciones.length} evaluaciones</span></header>

    {evaluaciones.length ? <>
      <section className="mt-5 overflow-x-auto rounded-3xl border border-white/20 bg-white/10 p-3 shadow-2xl backdrop-blur md:p-4">
        <table className="w-full min-w-max border-separate [border-spacing:0_10px] text-slate-800">
          <thead><tr><th className="sticky left-0 z-20 w-80 min-w-80 rounded-l-2xl bg-[var(--epm-azul-profundo)] p-5 text-left text-lg text-white"><span className="text-xs font-extrabold uppercase tracking-[.16em] text-[var(--epm-verde)]">Guía de lectura</span><strong className="mt-1 block text-xl">Preguntas evaluadas</strong></th>{evaluaciones.map((respuestas, indice) => { const empresa = empresaPorId.get(respuestas.find((respuesta) => respuesta.empresaEvaluadaId)?.empresaEvaluadaId ?? ""); return <th key={respuestas[0].participanteId} className="w-80 min-w-80 border-l border-white/20 bg-gradient-to-br from-sky-50 to-emerald-50 p-4 text-center last:rounded-r-2xl"><div className="mx-auto flex min-h-20 items-center justify-center rounded-2xl bg-white p-3 shadow-sm">{empresa?.urlLogo ? <img src={empresa.urlLogo} alt={`Logo de ${empresa.nombre}`} className="h-12 w-36 object-contain" /> : <span className="grid h-12 w-12 place-items-center rounded-full bg-sky-100 font-extrabold text-[var(--epm-azul)]">{indice + 1}</span>}</div><strong className="mt-2 block text-sm text-[var(--epm-azul-profundo)]">{empresa?.nombre ?? "Sin empresa"}</strong><span className="mt-1 block text-[11px] font-bold uppercase tracking-wider text-[var(--epm-teal)]">Evaluación {indice + 1}</span></th>; })}</tr></thead>
          <tbody>{preguntas.map((pregunta, indicePregunta) => <tr key={pregunta.id}><th className="sticky left-0 z-10 w-80 min-w-80 rounded-l-2xl border-l-4 border-[var(--epm-verde)] bg-[var(--epm-azul-profundo)] p-5 text-left align-top text-sm font-extrabold text-white shadow-lg"><span className="mb-2 block text-xs uppercase tracking-[.16em] text-[var(--epm-verde)]">Pregunta {indicePregunta + 1}</span><span className="text-base leading-snug">{pregunta.titulo}</span>{pregunta.contexto && <span className="mt-2 block text-xs font-medium leading-relaxed text-white/65">{pregunta.contexto}</span>}</th>{evaluaciones.map((respuestas) => { const respuesta = respuestas.find((item) => item.preguntaId === pregunta.id); return <td key={respuestas[0].participanteId} className="w-80 min-w-80 border-l border-slate-100 bg-white/95 p-3 align-top last:rounded-r-2xl"><div className="min-h-24 whitespace-pre-line rounded-2xl border border-sky-100 bg-gradient-to-br from-white to-sky-50 p-4 text-sm leading-relaxed text-slate-700 shadow-sm">{respuesta ? textoRespuesta(respuesta.respuesta) : <span className="italic text-slate-400">Sin respuesta</span>}</div></td>; })}</tr>)}</tbody>
        </table>
      </section>
      <div className="mt-5"><ResumenAnalisisActividad analisis={analisis} /></div>
    </> : <section className="grid min-h-[65vh] place-items-center text-center"><div><MessageSquareText className="mx-auto text-[var(--epm-verde)]" size={72} /><h2 className="mt-5 text-4xl font-extrabold">Esperando respuestas</h2><p className="mt-3 text-xl text-white/75">La matriz y su conclusión aparecerán automáticamente.</p></div></section>}
    </div>
  </main>;
}
