"use client";

import { useEffect, useMemo, useState } from "react";
import { FotoCircular } from "@/components/marca/FotoCircular";
import { usePollingVisible } from "@/lib/usePollingVisible";

type Persona = {
  id: string;
  nombre: string;
  urlFoto: string;
  creadoEn?: string | Date;
  empresa: { nombre: string; urlLogo?: string | null };
  grupo: { nombre: string; colorHex: string };
};

function barajar<T>(datos: T[]) {
  return [...datos].sort(() => Math.random() - 0.5);
}

export function RotadorAsistentes({ inicial, modo, intervalo }: { inicial: Persona[]; modo: "MOSAICO" | "CARRUSEL" | "DESTACADO"; intervalo: number }) {
  const [personas, setPersonas] = useState(() => barajar(inicial));
  const [inicio, setInicio] = useState(0);
  const [nuevos, setNuevos] = useState<Set<string>>(new Set());
  const cantidad = modo === "DESTACADO" ? 1 : modo === "CARRUSEL" ? 4 : 8;

  useEffect(() => {
    if (!personas.length) return;
    const temporizador = setInterval(() => setInicio((actual) => {
      const siguiente = actual + cantidad;
      if (siguiente >= personas.length) { setPersonas((p) => barajar(p)); return 0; }
      return siguiente;
    }), intervalo * 1000);
    return () => clearInterval(temporizador);
  }, [cantidad, intervalo, personas.length]);

  usePollingVisible(async () => {
      const r = await fetch("/api/ranking", { cache: "no-store" });
      if (!r.ok) return;
      const datos = (await r.json()).individual as Persona[];
      setPersonas((actuales) => {
        const ids = new Set(actuales.map((p) => p.id));
        const llegados = datos.filter((p) => !ids.has(p.id));
        if (!llegados.length) return datos;
        setNuevos(new Set(llegados.map((p) => p.id)));
        setInicio(0);
        setTimeout(() => setNuevos(new Set()), 12_000);
        return [...llegados, ...datos.filter((p) => !llegados.some((nuevo) => nuevo.id === p.id))];
      });
  }, 3_000);

  const visibles = useMemo(() => {
    if (!personas.length) return [];
    return Array.from({ length: Math.min(cantidad, personas.length) }, (_, i) => personas[(inicio + i) % personas.length]);
  }, [cantidad, inicio, personas]);

  const columnas = modo === "DESTACADO" ? "grid-cols-1" : modo === "CARRUSEL" ? "grid-cols-2" : "grid-cols-4";
  return (
    <div className="flex h-full min-h-0 flex-col py-[clamp(12px,2vh,24px)]">
      <p className="mb-3 ml-auto shrink-0 rounded-full bg-white/15 px-5 py-2 text-[clamp(13px,1.35vw,22px)] font-extrabold">{personas.length} personas ya están aquí</p>
      <div className={`grid min-h-0 flex-1 auto-rows-fr items-stretch gap-[clamp(10px,1.4vw,22px)] ${columnas}`}>
        {visibles.map((persona) => (
          <article key={`${persona.id}-${inicio}`} className={`entrada-suave flex min-h-0 items-center gap-[clamp(12px,1.5vw,24px)] overflow-hidden rounded-[clamp(18px,2vw,30px)] border p-[clamp(12px,1.5vw,24px)] text-left backdrop-blur ${modo === "DESTACADO" ? "mx-auto w-[72%] bg-white/15" : "bg-white/10"} ${nuevos.has(persona.id) ? "border-[var(--epm-verde)] ring-4 ring-[var(--epm-verde)]/40" : "border-white/15"}`}>
            <FotoCircular
              src={persona.urlFoto}
              alt={`Foto de ${persona.nombre}`}
              className={`shrink-0 ${modo === "DESTACADO" ? "h-[clamp(230px,32vh,390px)] w-[clamp(230px,32vh,390px)]" : "h-[clamp(92px,9vw,155px)] w-[clamp(92px,9vw,155px)]"}`}
            />
            <div className="min-w-0 flex-1">
              {nuevos.has(persona.id) && <span className="mb-2 inline-flex rounded-full bg-[var(--epm-verde)] px-3 py-1 text-xs font-extrabold text-[var(--epm-azul-profundo)]">¡Bienvenido!</span>}
              <h2 className={`font-extrabold leading-tight ${modo === "DESTACADO" ? "text-[clamp(34px,4vw,64px)]" : "text-[clamp(17px,1.7vw,28px)]"}`}>{persona.nombre}</h2>
              <div className="mt-2 flex min-w-0 items-center gap-3">
                {persona.empresa.urlLogo && <span className="grid h-[clamp(34px,3vw,50px)] w-[clamp(65px,6vw,105px)] shrink-0 place-items-center rounded-lg bg-white/90 p-1.5"><img src={persona.empresa.urlLogo} alt={`Logo ${persona.empresa.nombre}`} className="max-h-full max-w-full object-contain" /></span>}
                <p className={`truncate font-bold text-white/80 ${modo === "DESTACADO" ? "text-[clamp(20px,2vw,34px)]" : "text-[clamp(12px,1.05vw,17px)]"}`}>{persona.empresa.nombre}</p>
              </div>
              <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[clamp(10px,.95vw,15px)] font-bold"><span className="h-3 w-3 rounded-full" style={{ background: persona.grupo.colorHex }} />{persona.grupo.nombre}</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
