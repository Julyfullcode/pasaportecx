import { notFound } from "next/navigation";
import { MessageSquareText } from "lucide-react";
import { requerirAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { preguntasDe } from "@/lib/actividad";
import { analizarRespuestasActividad } from "@/lib/analisis-actividad";
import { Logo } from "@/components/marca/Logo";
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

  return <main className="marca-gradiente min-h-screen p-5 text-white md:p-8"><ActualizacionModeracion />
    <header className="flex items-center gap-5 border-b border-white/20 pb-5"><Logo className="h-12 w-auto md:h-16" /><span className="h-12 w-px bg-white/25" /><div><p className="font-extrabold uppercase tracking-widest text-[var(--epm-verde)]">Matriz de resultados anónimos</p><h1 className="text-3xl font-extrabold md:text-5xl">{actividad.titulo}</h1></div><span className="ml-auto hidden rounded-full bg-white/15 px-5 py-3 font-extrabold md:inline-flex">{evaluaciones.length} evaluaciones</span></header>

    {evaluaciones.length ? <>
      <section className="mt-6 overflow-x-auto rounded-3xl bg-white shadow-2xl">
        <table className="w-full min-w-max border-separate border-spacing-0 text-slate-800">
          <thead><tr><th className="sticky left-0 z-20 w-72 min-w-72 border-b border-r bg-[var(--epm-azul-profundo)] p-5 text-left text-lg text-white">Preguntas</th>{evaluaciones.map((respuestas, indice) => { const empresa = empresaPorId.get(respuestas.find((respuesta) => respuesta.empresaEvaluadaId)?.empresaEvaluadaId ?? ""); return <th key={respuestas[0].participanteId} className="w-72 min-w-72 border-b border-r bg-slate-50 p-4 text-center last:border-r-0">{empresa?.urlLogo ? <img src={empresa.urlLogo} alt={`Logo de ${empresa.nombre}`} className="mx-auto h-14 w-32 object-contain" /> : <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-sky-100 font-extrabold text-[var(--epm-azul)]">{indice + 1}</span>}<strong className="mt-2 block text-sm text-[var(--epm-azul-profundo)]">{empresa?.nombre ?? "Sin empresa"}</strong></th>; })}</tr></thead>
          <tbody>{preguntas.map((pregunta, indicePregunta) => <tr key={pregunta.id}><th className={`sticky left-0 z-10 w-72 min-w-72 border-b border-r p-5 text-left align-top text-sm font-extrabold text-[var(--epm-azul-profundo)] ${indicePregunta % 2 ? "bg-sky-50" : "bg-white"}`}><span className="mb-2 block text-xs uppercase tracking-wider text-[var(--epm-teal)]">Pregunta {indicePregunta + 1}</span>{pregunta.titulo}</th>{evaluaciones.map((respuestas) => { const respuesta = respuestas.find((item) => item.preguntaId === pregunta.id); return <td key={respuestas[0].participanteId} className={`w-72 min-w-72 whitespace-pre-line border-b border-r p-5 align-top text-sm leading-relaxed last:border-r-0 ${indicePregunta % 2 ? "bg-sky-50/50" : "bg-white"}`}>{respuesta ? textoRespuesta(respuesta.respuesta) : <span className="text-slate-400">Sin respuesta</span>}</td>; })}</tr>)}</tbody>
        </table>
      </section>
      <div className="mt-6"><ResumenAnalisisActividad analisis={analisis} oscuro /></div>
    </> : <section className="grid min-h-[65vh] place-items-center text-center"><div><MessageSquareText className="mx-auto text-[var(--epm-verde)]" size={72} /><h2 className="mt-5 text-4xl font-extrabold">Esperando respuestas</h2><p className="mt-3 text-xl text-white/75">La matriz y su conclusión aparecerán automáticamente.</p></div></section>}
  </main>;
}
