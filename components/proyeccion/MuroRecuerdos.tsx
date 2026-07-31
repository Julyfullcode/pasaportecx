"use client";

import { useState } from "react";
import { FotoCircular } from "@/components/marca/FotoCircular";
import { usePollingVisible } from "@/lib/usePollingVisible";

type Recuerdo = {
  id: string;
  urlFoto: string;
  descripcion: string | null;
  participante: { nombre: string; urlFoto: string };
  reacciones: { tipo: string }[];
};

export function MuroRecuerdosProyeccion({ inicial }: { inicial: Recuerdo[] }) {
  const [recuerdos, setRecuerdos] = useState(inicial);
  usePollingVisible(async () => {
    const respuesta = await fetch("/api/proyeccion/datos", { cache: "no-store" });
    if (respuesta.ok) setRecuerdos((await respuesta.json()).recuerdos);
  }, 5_000);
  return (
    <div className="grid h-full min-h-0 grid-cols-4 grid-rows-3 gap-[clamp(8px,1.2vw,18px)] py-[clamp(12px,2vh,24px)]">
      {recuerdos.slice(0, 12).map((recuerdo, indice) => {
        const corazones = recuerdo.reacciones.filter((reaccion) => reaccion.tipo === "CORAZON").length;
        const risas = recuerdo.reacciones.filter((reaccion) => reaccion.tipo === "RISA").length;
        return (
          <figure key={recuerdo.id} className={`entrada-suave relative overflow-hidden rounded-[1.5rem] bg-white/10 shadow-2xl ${indice === 0 ? "col-span-2 row-span-2 ring-2 ring-[var(--epm-verde)]/70" : ""}`}>
            <img src={recuerdo.urlFoto} alt={recuerdo.descripcion || `Recuerdo de ${recuerdo.participante.nombre}`} className="h-full min-h-0 w-full object-cover" />
            {indice === 0 && <span className="absolute left-4 top-4 rounded-full bg-gradient-to-r from-rose-500 to-amber-400 px-4 py-2 text-sm font-extrabold shadow-lg">🔥 El favorito</span>}
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/95 via-slate-950/70 to-transparent p-4 pt-14">
              {recuerdo.descripcion && <p className="mb-2 text-[clamp(11px,1.15vw,18px)] font-bold">{recuerdo.descripcion}</p>}
              <div className="flex items-center gap-2">
                <FotoCircular src={recuerdo.participante.urlFoto} alt={`Foto de ${recuerdo.participante.nombre}`} className="h-[clamp(28px,2.6vw,42px)] w-[clamp(28px,2.6vw,42px)] border-2" />
                <strong className="min-w-0 flex-1 truncate text-[clamp(10px,1vw,16px)]">{recuerdo.participante.nombre}</strong>
                <span className="rounded-full bg-white/15 px-2 py-1 text-[clamp(10px,.9vw,14px)] font-extrabold">❤ {corazones} · 😂 {risas}</span>
              </div>
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
