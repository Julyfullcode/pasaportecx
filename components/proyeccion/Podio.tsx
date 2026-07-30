"use client";

import { useState } from "react";
import { FotoCircular } from "@/components/marca/FotoCircular";
import { usePollingVisible } from "@/lib/usePollingVisible";

export type PersonaPodio = {
  id: string;
  nombre: string;
  urlFoto: string;
  puntosTotales: number;
  empresa: { nombre: string; urlLogo?: string | null };
  grupo: { nombre: string; colorHex: string };
};

export function Podio({ inicial, tamano }: { inicial: PersonaPodio[]; tamano: number }) {
  const [personas, setPersonas] = useState(inicial);
  usePollingVisible(async () => {
    const r = await fetch("/api/ranking", { cache: "no-store" });
    if (r.ok) setPersonas((await r.json()).individual);
  }, 3_000);

  const top = personas.slice(0, tamano);
  const principales = [top[1], top[0], top[2]].filter(Boolean);
  return (
    <div className="flex h-full min-h-0 flex-col gap-[clamp(10px,1.5vh,18px)] py-[clamp(14px,2vh,24px)]">
      <div className="grid min-h-0 flex-1 grid-cols-3 gap-[clamp(12px,1.7vw,28px)]">
        {principales.map((persona) => {
          const puesto = top.findIndex((p) => p.id === persona.id) + 1;
          return (
            <article key={persona.id} className={`relative flex min-h-0 items-center gap-[clamp(12px,1.5vw,24px)] overflow-hidden rounded-[clamp(20px,2vw,32px)] border p-[clamp(14px,1.7vw,28px)] shadow-2xl backdrop-blur-md ${puesto === 1 ? "border-[var(--epm-verde)] bg-white/20 ring-2 ring-[var(--epm-verde)]/35" : "border-white/20 bg-white/10"}`}>
              <div className="relative shrink-0">
                <FotoCircular src={persona.urlFoto} alt={`Foto de ${persona.nombre}`} className={`${puesto === 1 ? "h-[clamp(160px,17vw,270px)] w-[clamp(160px,17vw,270px)]" : "h-[clamp(135px,14vw,225px)] w-[clamp(135px,14vw,225px)]"}`} />
                <span className="absolute -left-1 -top-1 grid h-[clamp(42px,4vw,64px)] w-[clamp(42px,4vw,64px)] min-h-0 place-items-center rounded-full bg-[var(--epm-verde)] font-display text-[clamp(21px,2.2vw,36px)] font-extrabold text-[var(--epm-azul-profundo)] shadow-lg">{puesto}</span>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-[clamp(20px,2.3vw,38px)] font-extrabold leading-tight">{persona.nombre}</h2>
                <div className="mt-3 flex items-center gap-2">
                  {persona.empresa.urlLogo && <span className="grid h-10 w-20 shrink-0 place-items-center rounded-lg bg-white/90 p-1"><img src={persona.empresa.urlLogo} alt={`Logo ${persona.empresa.nombre}`} className="max-h-full max-w-full object-contain" /></span>}
                  <p className="min-w-0 truncate text-[clamp(12px,1.1vw,18px)] text-white/75">{persona.empresa.nombre}</p>
                </div>
                <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[clamp(10px,.9vw,14px)] font-bold"><span className="h-3 w-3 rounded-full" style={{ background: persona.grupo.colorHex }} />{persona.grupo.nombre}</span>
                <strong className="mt-4 block font-display text-[clamp(30px,4vw,64px)] leading-none text-[var(--epm-verde)]">{persona.puntosTotales.toLocaleString("es-CO")} <small className="text-[.38em] text-white/65">pts</small></strong>
              </div>
            </article>
          );
        })}
      </div>
      {top.length > 3 && (
        <div className="grid shrink-0 grid-cols-2 gap-3">
          {top.slice(3, 5).map((persona, indice) => (
            <div key={persona.id} className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-2 backdrop-blur">
              <strong className="text-2xl text-[var(--epm-verde)]">{indice + 4}</strong>
              <FotoCircular src={persona.urlFoto} alt={`Foto de ${persona.nombre}`} className="h-14 w-14 shrink-0" />
              <span className="min-w-0 flex-1 truncate font-extrabold">{persona.nombre}</span>
              <strong>{persona.puntosTotales.toLocaleString("es-CO")} pts</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
