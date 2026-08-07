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
  if (valor && typeof valor === "object" && !Array.isArray(valor)) {
    return Object.entries(valor as Record<string, unknown>).map(([clave, respuesta]) => `${clave.toUpperCase()}: ${respuesta === true ? "Verdadero" : respuesta === false ? "Falso" : String(respuesta)}`).join(" · ");
  }
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
  const tarjetas = Array.from(grupos.values());
  return <main className="marca-gradiente min-h-screen p-5 text-white md:p-8"><ActualizacionModeracion />
    <header className="flex items-center gap-5 border-b border-white/20 pb-5"><Logo className="h-12 w-auto md:h-16" /><span className="h-12 w-px bg-white/25" /><div><p className="font-extrabold uppercase tracking-widest text-[var(--epm-verde)]">Resultados anónimos</p><h1 className="text-3xl font-extrabold md:text-5xl">{actividad.titulo}</h1></div><span className="ml-auto hidden rounded-full bg-white/15 px-5 py-3 font-extrabold md:inline-flex">{tarjetas.length} evaluaciones</span></header>
    {tarjetas.length ? <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{tarjetas.map((respuestas, indice) => {
      const empresa = empresaPorId.get(respuestas.find((respuesta) => respuesta.empresaEvaluadaId)?.empresaEvaluadaId ?? "");
      return <article key={respuestas[0].participanteId} className="overflow-hidden rounded-3xl bg-white text-slate-800 shadow-2xl">
        <div className="flex min-h-24 items-center gap-4 border-b bg-slate-50 p-5">{empresa?.urlLogo ? <img src={empresa.urlLogo} alt={`Logo de ${empresa.nombre}`} className="h-14 w-28 object-contain" /> : <span className="grid h-14 w-14 place-items-center rounded-full bg-sky-100 font-extrabold text-[var(--epm-azul)]">{indice + 1}</span>}<div><small className="font-bold uppercase tracking-wider text-slate-500">Empresa evaluada</small><h2 className="text-xl font-extrabold text-[var(--epm-azul-profundo)]">{empresa?.nombre ?? "Sin empresa"}</h2></div></div>
        <div className="space-y-4 p-5">{preguntas.map((pregunta) => { const respuesta = respuestas.find((item) => item.preguntaId === pregunta.id); return respuesta ? <div key={pregunta.id}><h3 className="text-sm font-extrabold text-[var(--epm-teal)]">{pregunta.titulo}</h3><p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-700">{textoRespuesta(respuesta.respuesta)}</p></div> : null; })}</div>
      </article>;
    })}</section> : <section className="grid min-h-[65vh] place-items-center text-center"><div><MessageSquareText className="mx-auto text-[var(--epm-verde)]" size={72} /><h2 className="mt-5 text-4xl font-extrabold">Esperando respuestas</h2><p className="mt-3 text-xl text-white/75">Las tarjetas aparecerán automáticamente.</p></div></section>}
  </main>;
}
