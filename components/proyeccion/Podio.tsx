"use client";

import { useEffect, useState } from "react";
import { FotoCircular } from "@/components/marca/FotoCircular";

export type PersonaPodio = {
  id: string;
  nombre: string;
  urlFoto: string;
  puntosTotales: number;
  empresa: { nombre: string };
  grupo: { nombre: string; colorHex: string };
};

export function Podio({ inicial, tamano }: { inicial: PersonaPodio[]; tamano: number }) {
  const [personas, setPersonas] = useState(inicial);
  useEffect(() => {
    let intervalo: ReturnType<typeof setInterval> | undefined;
    const actualizar = async () => {
      const r = await fetch("/api/ranking", { cache: "no-store" });
      if (r.ok) setPersonas((await r.json()).individual);
    };
    const fuente = new EventSource("/api/stream");
    fuente.onmessage = actualizar;
    fuente.onerror = () => { fuente.close(); intervalo = setInterval(actualizar, 5_000); };
    return () => { fuente.close(); if (intervalo) clearInterval(intervalo); };
  }, []);
  const top = personas.slice(0, tamano);
  const orden = [top[1], top[0], top[2]].filter(Boolean);
  return (
    <div className="mt-[clamp(25px,4vh,55px)]">
      <div className="mx-auto flex max-w-[1500px] items-end justify-center gap-[clamp(15px,3vw,55px)]">
        {orden.map((persona) => {
          const puesto = top.findIndex((p) => p.id === persona.id) + 1;
          const alto = puesto === 1 ? "h-[clamp(240px,34vh,390px)]" : puesto === 2 ? "h-[clamp(195px,27vh,320px)]" : "h-[clamp(165px,23vh,285px)]";
          return (
            <div key={persona.id} className={`flex w-[27%] min-w-0 flex-col items-center justify-start rounded-t-[2rem] border border-white/20 bg-white/10 p-[clamp(12px,2vw,28px)] text-center shadow-2xl backdrop-blur-md transition-all duration-700 ${alto}`}>
              <span className="mb-[-18px] grid h-[clamp(42px,4vw,66px)] w-[clamp(42px,4vw,66px)] place-items-center rounded-full bg-[var(--epm-verde)] font-display text-[clamp(22px,2.5vw,38px)] font-extrabold text-[var(--epm-azul-profundo)]">{puesto}</span>
              <FotoCircular src={persona.urlFoto} alt={`Foto de ${persona.nombre}`} className="h-[clamp(90px,10vw,165px)] w-[clamp(90px,10vw,165px)]" />
              <h2 className="mt-3 truncate text-[clamp(16px,2vw,31px)] font-extrabold">{persona.nombre}</h2>
              <p className="text-[clamp(11px,1.2vw,18px)] text-white/75">{persona.empresa.nombre} · {persona.grupo.nombre}</p>
              <strong className="mt-auto font-display text-[clamp(24px,3vw,46px)] text-[var(--epm-verde)]">{persona.puntosTotales.toLocaleString("es-CO")}</strong>
            </div>
          );
        })}
      </div>
      {top.length > 3 && <div className="mx-auto mt-5 flex max-w-5xl justify-center gap-4">{top.slice(3).map((p, i) => <div key={p.id} className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl bg-white/10 p-3 backdrop-blur"><strong className="text-2xl text-[var(--epm-verde)]">{i + 4}</strong><FotoCircular src={p.urlFoto} alt={`Foto de ${p.nombre}`} className="h-14 w-14" /><span className="min-w-0 flex-1 truncate font-extrabold">{p.nombre}</span><strong>{p.puntosTotales}</strong></div>)}</div>}
    </div>
  );
}
