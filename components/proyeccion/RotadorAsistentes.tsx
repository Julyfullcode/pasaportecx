"use client";

import { useEffect, useMemo, useState } from "react";
import { FotoCircular } from "@/components/marca/FotoCircular";

type Persona = { id: string; nombre: string; urlFoto: string; creadoEn?: string | Date; empresa: { nombre: string }; grupo: { nombre: string; colorHex: string } };

function barajar<T>(datos: T[]) {
  return [...datos].sort(() => Math.random() - 0.5);
}

export function RotadorAsistentes({ inicial, modo, intervalo }: { inicial: Persona[]; modo: "MOSAICO" | "CARRUSEL" | "DESTACADO"; intervalo: number }) {
  const [personas, setPersonas] = useState(() => barajar(inicial));
  const [inicio, setInicio] = useState(0);
  const [nuevos, setNuevos] = useState<Set<string>>(new Set());
  const cantidad = modo === "DESTACADO" ? 1 : modo === "CARRUSEL" ? 5 : 12;
  useEffect(() => {
    const temporizador = setInterval(() => setInicio((actual) => {
      const siguiente = actual + cantidad;
      if (siguiente >= personas.length) { setPersonas((p) => barajar(p)); return 0; }
      return siguiente;
    }), intervalo * 1000);
    return () => clearInterval(temporizador);
  }, [cantidad, intervalo, personas.length]);
  useEffect(() => {
    let polling: ReturnType<typeof setInterval> | undefined;
    const actualizar = async () => {
      const r = await fetch("/api/ranking", { cache: "no-store" });
      if (!r.ok) return;
      const datos = (await r.json()).individual as Persona[];
      const ids = new Set(personas.map((p) => p.id));
      const llegados = datos.filter((p) => !ids.has(p.id));
      if (llegados.length) {
        setNuevos(new Set(llegados.map((p) => p.id)));
        setPersonas((p) => [...llegados, ...p]);
        setInicio(0);
        setTimeout(() => setNuevos(new Set()), 12_000);
      }
    };
    const fuente = new EventSource("/api/stream"); fuente.onmessage = actualizar; fuente.onerror = () => { fuente.close(); polling = setInterval(actualizar, 5_000); };
    return () => { fuente.close(); if (polling) clearInterval(polling); };
  }, [personas]);
  const visibles = useMemo(() => {
    if (!personas.length) return [];
    return Array.from({ length: Math.min(cantidad, personas.length) }, (_, i) => personas[(inicio + i) % personas.length]);
  }, [cantidad, inicio, personas]);
  return (
    <div className="flex h-full flex-col justify-center">
      <p className="mb-5 ml-auto rounded-full bg-white/15 px-6 py-3 text-[clamp(16px,2vw,30px)] font-extrabold">{personas.length} personas ya están aquí</p>
      <div className={`grid items-stretch gap-[clamp(12px,2vw,28px)] ${modo === "DESTACADO" ? "grid-cols-1" : modo === "CARRUSEL" ? "grid-cols-5" : "grid-cols-4"}`}>
        {visibles.map((persona) => (
          <article key={`${persona.id}-${inicio}`} className={`entrada-suave flex flex-col items-center justify-center rounded-[2rem] border p-[clamp(14px,2vw,30px)] text-center backdrop-blur ${modo === "DESTACADO" ? "mx-auto w-[55%] bg-white/15" : "bg-white/10"} ${nuevos.has(persona.id) ? "border-[var(--epm-verde)] ring-4 ring-[var(--epm-verde)]/40" : "border-white/15"}`}>
            {nuevos.has(persona.id) && <span className="mb-2 rounded-full bg-[var(--epm-verde)] px-4 py-1 font-extrabold text-[var(--epm-azul-profundo)]">¡Bienvenido!</span>}
            <FotoCircular src={persona.urlFoto} alt={`Foto de ${persona.nombre}`} className={modo === "DESTACADO" ? "h-[clamp(180px,24vw,350px)] w-[clamp(180px,24vw,350px)]" : "h-[clamp(70px,8vw,135px)] w-[clamp(70px,8vw,135px)]"} />
            <h2 className="mt-3 text-[clamp(15px,1.8vw,29px)] font-extrabold">{persona.nombre}</h2>
            <p className="text-[clamp(10px,1.1vw,17px)] text-white/70">{persona.empresa.nombre}</p>
            <span className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[clamp(10px,1vw,15px)] font-bold"><span className="h-3 w-3 rounded-full" style={{ background: persona.grupo.colorHex }} />{persona.grupo.nombre}</span>
          </article>
        ))}
      </div>
    </div>
  );
}
