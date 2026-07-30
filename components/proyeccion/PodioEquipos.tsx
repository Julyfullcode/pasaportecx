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
  participantes: { id: string; urlFoto: string }[];
};

export function PodioEquipos({ inicial, metodo, tamano }: { inicial: Equipo[]; metodo: string; tamano: number }) {
  const [equipos, setEquipos] = useState(inicial);
  const [criterio, setCriterio] = useState(metodo);
  usePollingVisible(async () => {
    const r = await fetch("/api/ranking", { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      setEquipos(d.equipos);
      setCriterio(d.configuracion.metodoPuntajeEquipo);
    }
  }, 3_000);
  return (
    <div className="flex h-full min-h-0 flex-col py-[clamp(12px,2vh,24px)]">
      <p className="mx-auto mb-3 w-fit shrink-0 rounded-full bg-white/15 px-5 py-2 text-[clamp(12px,1.2vw,19px)] font-extrabold">Criterio: {criterio === "PROMEDIO" ? "promedio por integrante activo" : "suma total"}</p>
      <div className="mx-auto grid min-h-0 w-full max-w-[1500px] flex-1 auto-rows-fr grid-cols-3 gap-[clamp(12px,1.7vw,28px)]">
        {equipos.slice(0, tamano).map((equipo, indice) => (
          <article key={equipo.id} className="flex min-h-0 flex-col overflow-hidden rounded-[2rem] bg-white/95 text-[var(--epm-gris-texto)] shadow-2xl transition-all duration-700">
            <div className="shrink-0 p-[clamp(14px,1.8vw,28px)] text-white" style={{ background: equipo.colorHex }}>
              <span className="text-[clamp(28px,4vw,60px)] font-extrabold">#{indice + 1}</span><h2 className="text-[clamp(21px,2.7vw,42px)] font-extrabold">{equipo.nombre}</h2>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden p-[clamp(14px,1.8vw,28px)]">
              <strong className="font-display text-[clamp(32px,4vw,62px)] text-[var(--epm-azul-profundo)]">{equipo.puntaje.toLocaleString("es-CO")}</strong>
              <p className="flex items-center gap-2 text-[clamp(12px,1.3vw,20px)] text-slate-500"><Users /> {equipo.integrantes} integrantes</p>
              <div className="mt-5 flex flex-wrap -space-x-3">{equipo.participantes.slice(0, 14).map((p) => <FotoCircular key={p.id} src={p.urlFoto} alt="Integrante del equipo" className="h-[clamp(38px,4vw,62px)] w-[clamp(38px,4vw,62px)]" />)}</div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
