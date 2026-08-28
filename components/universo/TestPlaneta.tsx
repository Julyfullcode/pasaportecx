"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, LoaderCircle, Orbit, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import type { PreguntaTestUniverso } from "@/lib/universo-arquetipos";

export function TestPlaneta({ preguntas }: { preguntas: PreguntaTestUniverso[] }) {
  const router = useRouter();
  const [indice, setIndice] = useState(0);
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const pregunta = preguntas[indice];
  const seleccion = respuestas[pregunta.id];

  async function continuar() {
    if (!seleccion || enviando) return;
    if (indice < preguntas.length - 1) { setIndice((actual) => actual + 1); return; }
    setEnviando(true); setError("");
    try {
      const respuesta = await fetch("/api/universo/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ respuestas }) });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok) throw new Error(cuerpo.error ?? "No pudimos guardar el resultado.");
      router.push("/universo/tarjeta?revelar=1"); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "No pudimos guardar el resultado."); } finally { setEnviando(false); }
  }

  return <main className="mx-auto flex min-h-dvh max-w-4xl flex-col px-5 py-7 sm:px-8 sm:py-10">
    <header><div className="flex items-center justify-between gap-4"><span className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-white/10 px-4 py-2 text-xs font-extrabold uppercase tracking-[.18em] text-cyan-100"><Orbit size={17} /> ¿Qué planeta eres?</span><span className="font-extrabold text-white/55">{indice + 1} / {preguntas.length}</span></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-lime-300 transition-all duration-500" style={{ width: `${(indice + 1) / preguntas.length * 100}%` }} /></div></header>
    <section key={pregunta.id} className="entrada-suave my-auto py-8"><p className="text-sm font-extrabold uppercase tracking-[.2em] text-lime-300">Encuentra tu señal</p><h1 className="mt-4 font-display text-[clamp(30px,6vw,52px)] font-extrabold leading-tight">{pregunta.texto}</h1><div className="mt-8 grid gap-3 sm:grid-cols-2">{pregunta.opciones.map((opcion, posicion) => <button key={opcion.id} type="button" onClick={() => setRespuestas((actuales) => ({ ...actuales, [pregunta.id]: opcion.id }))} className={`group min-h-28 rounded-3xl border p-5 text-left transition ${seleccion === opcion.id ? "border-lime-300 bg-lime-300/15 shadow-[0_0_30px_rgba(195,224,90,.12)]" : "border-white/12 bg-white/[.07] hover:border-cyan-300/50 hover:bg-white/10"}`}><span className={`grid h-8 w-8 place-items-center rounded-full text-sm font-extrabold ${seleccion === opcion.id ? "bg-lime-300 text-[#071a38]" : "bg-white/10 text-cyan-100"}`}>{String.fromCharCode(65 + posicion)}</span><span className="mt-3 block text-base font-bold leading-relaxed text-white/85">{opcion.texto}</span></button>)}</div>{error && <p role="alert" className="mt-5 rounded-2xl border border-red-300/20 bg-red-400/10 p-4 font-bold text-red-100">{error}</p>}</section>
    <footer className="flex items-center justify-between gap-3"><button type="button" onClick={() => setIndice((actual) => Math.max(0, actual - 1))} disabled={indice === 0 || enviando} className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-3 font-extrabold text-white/70 disabled:opacity-30"><ArrowLeft /> Anterior</button><button type="button" onClick={() => void continuar()} disabled={!seleccion || enviando} className="inline-flex items-center gap-2 rounded-full bg-lime-300 px-6 py-3 font-display font-extrabold text-[#071a38] shadow-[0_0_28px_rgba(195,224,90,.2)] disabled:opacity-35">{enviando ? <LoaderCircle className="animate-spin" /> : indice === preguntas.length - 1 ? <Sparkles /> : null}{indice === preguntas.length - 1 ? "Descubrir mi planeta" : "Siguiente"}{indice < preguntas.length - 1 && <ArrowRight />}</button></footer>
  </main>;
}
