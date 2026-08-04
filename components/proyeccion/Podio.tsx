"use client";

import { useState } from "react";
import { Crown, Medal } from "lucide-react";
import { FotoCircular } from "@/components/marca/FotoCircular";
import { usePollingVisible } from "@/lib/usePollingVisible";

export type PersonaPodio = {
  id: string;
  nombre: string;
  urlFoto: string;
  puntosTotales: number;
  empresa: { nombre: string; urlLogo?: string | null };
};

const nombresPuesto = ["Primer lugar", "Segundo lugar", "Tercer lugar"];

export function Podio({ inicial, tamano }: { inicial: PersonaPodio[]; tamano: number }) {
  const [personas, setPersonas] = useState(inicial);
  usePollingVisible(async () => {
    const respuesta = await fetch("/api/ranking", { cache: "no-store" });
    if (respuesta.ok) setPersonas((await respuesta.json()).individual);
  }, 3_000);

  const top = personas.slice(0, tamano);
  const principales = [top[1], top[0], top[2]].filter(Boolean);
  return (
    <div className="flex h-full min-h-0 flex-col gap-[clamp(10px,1.5vh,18px)] py-[clamp(14px,2vh,24px)]">
      <div className="grid min-h-0 flex-1 grid-cols-[.94fr_1.12fr_.94fr] items-end gap-[clamp(12px,1.7vw,28px)]">
        {principales.map((persona) => {
          const puesto = top.findIndex((participante) => participante.id === persona.id) + 1;
          const primero = puesto === 1;
          const estilo = primero
            ? "h-full border-4 border-amber-300 bg-gradient-to-br from-amber-300/35 via-white/25 to-[var(--epm-verde)]/20 shadow-[0_0_60px_rgba(251,191,36,.38)] ring-4 ring-amber-200/20"
            : puesto === 2
              ? "h-[91%] border-2 border-slate-200/70 bg-white/13"
              : "h-[87%] border-2 border-orange-300/55 bg-orange-200/10";
          return (
            <article key={persona.id} className={`relative flex min-h-0 items-center gap-[clamp(12px,1.5vw,24px)] overflow-hidden rounded-[clamp(20px,2vw,34px)] p-[clamp(14px,1.7vw,28px)] shadow-2xl backdrop-blur-md ${estilo}`}>
              {primero && <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-amber-200/25 blur-2xl" />}
              <div className="relative z-10 shrink-0">
                <div className={primero ? "rounded-full bg-gradient-to-br from-yellow-200 via-amber-400 to-yellow-600 p-[clamp(5px,.55vw,9px)] shadow-[0_0_35px_rgba(251,191,36,.55)]" : puesto === 2 ? "rounded-full bg-gradient-to-br from-white to-slate-400 p-1.5" : "rounded-full bg-gradient-to-br from-orange-200 to-orange-600 p-1.5"}>
                  <FotoCircular src={persona.urlFoto} alt={`Foto de ${persona.nombre}`} className={primero ? "h-[clamp(185px,19vw,300px)] w-[clamp(185px,19vw,300px)] border-4" : "h-[clamp(130px,13vw,215px)] w-[clamp(130px,13vw,215px)] border-4"} />
                </div>
                <span className={`absolute -left-1 -top-1 grid h-[clamp(44px,4.4vw,70px)] w-[clamp(44px,4.4vw,70px)] place-items-center rounded-full font-display text-[clamp(22px,2.3vw,38px)] font-extrabold shadow-xl ${primero ? "bg-gradient-to-br from-yellow-200 to-amber-500 text-amber-950" : puesto === 2 ? "bg-slate-200 text-slate-700" : "bg-orange-400 text-orange-950"}`}>{puesto}</span>
              </div>
              <div className="relative z-10 min-w-0 flex-1">
                <span className={`mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[clamp(10px,1vw,16px)] font-extrabold uppercase tracking-wide ${primero ? "bg-amber-300 text-amber-950 shadow-lg" : "bg-white/15 text-white/85"}`}>
                  {primero ? <Crown size={20} fill="currentColor" /> : <Medal size={18} />}
                  {nombresPuesto[puesto - 1]}
                </span>
                <h2 className={`${primero ? "text-[clamp(25px,2.8vw,46px)]" : "text-[clamp(19px,2.1vw,34px)]"} font-extrabold leading-tight`}>{persona.nombre}</h2>
                <div className="mt-3 flex items-center gap-2">
                  {persona.empresa.urlLogo && <span className="grid h-10 w-20 shrink-0 place-items-center rounded-lg bg-white/95 p-1"><img src={persona.empresa.urlLogo} alt={`Logo ${persona.empresa.nombre}`} className="max-h-full max-w-full object-contain" /></span>}
                  <p className="min-w-0 truncate text-[clamp(12px,1.1vw,18px)] text-white/75">{persona.empresa.nombre}</p>
                </div>
                <strong className={`mt-4 block font-display leading-none ${primero ? "text-[clamp(40px,5vw,80px)] text-amber-300 drop-shadow" : "text-[clamp(28px,3.5vw,56px)] text-[var(--epm-verde)]"}`}>{persona.puntosTotales.toLocaleString("es-CO")} <small className="text-[.34em] text-white/70">pts</small></strong>
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
