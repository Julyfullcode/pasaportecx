"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, LoaderCircle, MessageSquareText } from "lucide-react";
import { usePollingVisible } from "@/lib/usePollingVisible";

type DatosGrafica = {
  pregunta: string | null;
  contexto: string | null;
  total: number;
  tipo: "SIN_PREGUNTA" | "OPCIONES" | "VERDADERO_FALSO" | "ABIERTA";
  datos: { id: string; etiqueta: string; cantidad?: number; verdaderas?: number; falsas?: number }[];
};

export function GraficaActividadEnVivo({ id }: { id: string }) {
  const [datos, setDatos] = useState<DatosGrafica | null>(null);
  const cargar = useCallback(async () => {
    const respuesta = await fetch(`/api/admin/actividades/${encodeURIComponent(id)}/vivo`, { cache: "no-store" });
    if (respuesta.ok) setDatos(await respuesta.json());
  }, [id]);
  useEffect(() => { void cargar(); }, [cargar]);
  usePollingVisible(cargar, 1800);
  if (!datos) return <section className="tarjeta grid min-h-56 place-items-center p-6"><LoaderCircle className="animate-spin text-[var(--epm-azul)]" /></section>;
  if (!datos.pregunta) return <section className="tarjeta p-6 text-center"><BarChart3 className="mx-auto text-[var(--epm-azul)]" /><h2 className="mt-3 text-xl font-extrabold">La gráfica aparecerá con la pregunta</h2><p className="mt-2 text-slate-600">Publica la primera pregunta para comenzar a ver resultados en tiempo real.</p></section>;
  return <section className="tarjeta p-5 md:p-7">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-extrabold text-[var(--epm-verde-medio)]">Resultados en tiempo real</p><h2 className="mt-1 text-xl font-extrabold text-[var(--epm-azul-profundo)]">{datos.pregunta}</h2></div><span className="rounded-full bg-sky-50 px-4 py-2 font-extrabold text-[var(--epm-azul)]">{datos.total} respuestas</span></div>
    {datos.tipo === "ABIERTA" ? <div className="mt-6 flex items-center gap-4 rounded-2xl bg-gradient-to-r from-sky-50 to-emerald-50 p-6"><MessageSquareText className="text-[var(--epm-teal)]" size={42} /><div><strong className="text-4xl text-[var(--epm-azul-profundo)]">{datos.total}</strong><p className="text-slate-600">respuestas abiertas recibidas</p></div></div> : <div className="mt-6 space-y-5">{datos.datos.map((item) => datos.tipo === "OPCIONES" ? <div key={item.id}><div className="mb-1 flex items-end justify-between gap-3"><span className="text-sm font-bold text-slate-700">{item.etiqueta}</span><strong className="text-[var(--epm-azul)]">{item.cantidad ?? 0}</strong></div><div className="h-7 overflow-hidden rounded-full bg-slate-100"><div className="grid h-full place-items-center rounded-full bg-gradient-to-r from-[var(--epm-azul)] to-[var(--epm-teal)] text-xs font-bold text-white transition-all" style={{ width: `${datos.total ? Math.max(3, (item.cantidad ?? 0) / datos.total * 100) : 0}%` }}>{datos.total ? Math.round((item.cantidad ?? 0) / datos.total * 100) : 0}%</div></div></div> : <div key={item.id}><p className="mb-2 text-sm font-bold text-slate-700">{item.etiqueta}</p><div className="flex h-8 overflow-hidden rounded-full bg-slate-100">{(item.verdaderas ?? 0) > 0 && <div className="grid h-full place-items-center bg-emerald-500 px-2 text-xs font-bold text-white" style={{ width: `${datos.total ? (item.verdaderas ?? 0) / datos.total * 100 : 0}%` }}>V {item.verdaderas}</div>}{(item.falsas ?? 0) > 0 && <div className="grid h-full place-items-center bg-amber-500 px-2 text-xs font-bold text-white" style={{ width: `${datos.total ? (item.falsas ?? 0) / datos.total * 100 : 0}%` }}>F {item.falsas}</div>}</div></div>)}</div>}
  </section>;
}
