"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { FotoCircular } from "@/components/marca/FotoCircular";
import { usePollingVisible } from "@/lib/usePollingVisible";

type Equipo = {
  id: string;
  nombre: string;
  colorHex: string;
  integrantes: number;
  puntaje: number;
  participantes: { id: string; nombre: string; urlFoto: string; empresa: { nombre: string; urlLogo: string | null } }[];
};

export function PodioEquipos({ inicial, tamano }: { inicial: Equipo[]; tamano: number }) {
  const [equipos, setEquipos] = useState(inicial);
  usePollingVisible(async () => {
    const r = await fetch("/api/ranking", { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      setEquipos(d.equipos);
    }
  }, 3_000);
  return (
    <div className="flex h-full min-h-0 flex-col py-[clamp(12px,2vh,24px)]">
      <div className="mx-auto grid min-h-0 w-full max-w-[1500px] flex-1 auto-rows-fr grid-cols-3 gap-[clamp(12px,1.7vw,28px)]">
        {equipos.slice(0, tamano).map((equipo, indice) => (
          <article key={equipo.id} className="flex min-h-0 flex-col overflow-hidden rounded-[2rem] bg-white/95 text-[var(--epm-gris-texto)] shadow-2xl transition-all duration-700">
            <div className="shrink-0 p-[clamp(14px,1.8vw,28px)] text-white" style={{ background: equipo.colorHex }}>
              <span className="text-[clamp(28px,4vw,60px)] font-extrabold">#{indice + 1}</span><h2 className="text-[clamp(21px,2.7vw,42px)] font-extrabold">{equipo.nombre}</h2>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden p-[clamp(14px,1.8vw,28px)]">
              <strong className="font-display text-[clamp(32px,4vw,62px)] text-[var(--epm-azul-profundo)]">{equipo.puntaje.toLocaleString("es-CO")}</strong>
              <p className="flex items-center gap-2 text-[clamp(12px,1.3vw,20px)] text-slate-500"><Users /> {equipo.integrantes} integrantes</p>
              <div className="mt-5 flex flex-wrap gap-[clamp(4px,.55vw,9px)]">
                {equipo.participantes.slice(0, 14).map((p) => (
                  <div key={p.id} className="relative shrink-0">
                    <FotoCircular src={p.urlFoto} alt={`Foto de ${p.nombre}`} className="h-[clamp(42px,4.4vw,68px)] w-[clamp(42px,4.4vw,68px)]" />
                    {p.empresa.urlLogo && (
                      <span className="absolute -bottom-1 -right-1 z-10 grid h-[clamp(19px,1.7vw,27px)] w-[clamp(19px,1.7vw,27px)] place-items-center overflow-hidden rounded-full border-2 border-white bg-white p-0.5 shadow-md" title={p.empresa.nombre}>
                        <img src={p.empresa.urlLogo} alt="" className="max-h-full max-w-full object-contain" />
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
