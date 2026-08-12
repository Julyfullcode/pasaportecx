import { notFound } from "next/navigation";
import { MessageSquareText } from "lucide-react";
import { requerirAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { preguntasDe } from "@/lib/actividad";
import { Logo } from "@/components/marca/Logo";
import { ActualizacionModeracion } from "@/components/admin/ActualizacionModeracion";

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

  return <main className="marca-gradiente flex h-screen flex-col overflow-hidden p-5 text-white md:p-8"><ActualizacionModeracion />
    <header className="flex shrink-0 items-center gap-5 border-b border-white/20 pb-5"><Logo className="h-12 w-auto md:h-16" /><span className="h-12 w-px bg-white/25" /><div className="min-w-0"><p className="font-extrabold tracking-wide text-[var(--epm-verde)]">Matriz de resultados anónimos</p><h1 className="truncate text-3xl font-extrabold md:text-5xl">{actividad.titulo}</h1></div><span className="ml-auto hidden shrink-0 rounded-full bg-white/15 px-5 py-3 font-extrabold md:inline-flex">{evaluaciones.length} evaluaciones</span></header>

    {evaluaciones.length ? <div className="flex min-h-0 flex-1 flex-col">
      <section className="mt-4 min-h-0 flex-1 overflow-hidden rounded-3xl bg-white shadow-2xl">
        <table className="h-full w-full table-fixed border-separate border-spacing-0 text-slate-800">
          <thead><tr><th className="w-[24%] border-b border-r bg-white p-[clamp(8px,1vw,16px)] text-left text-[clamp(18px,1.45vw,27px)] font-extrabold text-[var(--epm-azul-profundo)]">Preguntas</th>{evaluaciones.map((respuestas, indice) => { const empresa = empresaPorId.get(respuestas.find((respuesta) => respuesta.empresaEvaluadaId)?.empresaEvaluadaId ?? ""); return <th key={respuestas[0].participanteId} className="border-b border-r bg-slate-50 p-[clamp(6px,.8vw,13px)] text-center last:border-r-0">{empresa?.urlLogo ? <img src={empresa.urlLogo} alt={`Logo de ${empresa.nombre}`} className="mx-auto h-[clamp(24px,3.5vh,48px)] max-w-full object-contain" /> : <span className="mx-auto grid h-9 w-9 place-items-center rounded-full bg-sky-100 text-sm font-extrabold text-[var(--epm-azul)]">{indice + 1}</span>}<strong className="mt-1 block truncate text-[clamp(9px,.75vw,13px)] text-[var(--epm-azul-profundo)]">{empresa?.nombre ?? "Sin empresa"}</strong></th>; })}</tr></thead>
          <tbody>{preguntas.map((pregunta, indicePregunta) => <tr key={pregunta.id}><th className={`w-[24%] border-b border-r p-[clamp(7px,.8vw,13px)] text-left align-middle text-[clamp(10px,.78vw,14px)] font-extrabold leading-snug text-[var(--epm-azul-profundo)] ${indicePregunta % 2 ? "bg-sky-50" : "bg-white"}`}>{pregunta.titulo}</th>{evaluaciones.map((respuestas) => { const respuesta = respuestas.find((item) => item.preguntaId === pregunta.id); return <td key={respuestas[0].participanteId} className={`overflow-hidden whitespace-pre-line border-b border-r p-[clamp(7px,.8vw,13px)] align-middle text-[clamp(8px,.68vw,12px)] leading-snug last:border-r-0 ${indicePregunta % 2 ? "bg-sky-50/50" : "bg-white"}`}>{respuesta ? textoRespuesta(respuesta.respuesta) : <span className="text-slate-400">Sin respuesta</span>}</td>; })}</tr>)}</tbody>
        </table>
      </section>
    </div> : <section className="grid min-h-0 flex-1 place-items-center text-center"><div><MessageSquareText className="mx-auto text-[var(--epm-verde)]" size={72} /><h2 className="mt-5 text-4xl font-extrabold">Esperando respuestas</h2><p className="mt-3 text-xl text-white/75">La matriz aparecerá automáticamente.</p></div></section>}
  </main>;
}
