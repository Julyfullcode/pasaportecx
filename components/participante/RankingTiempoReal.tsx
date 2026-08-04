"use client";

import { useState } from "react";
import { Medal } from "lucide-react";
import { FotoCircular } from "@/components/marca/FotoCircular";
import { usePollingVisible } from "@/lib/usePollingVisible";

type Datos = {
  individual: {
    id: string;
    nombre: string;
    urlFoto: string;
    puntosTotales: number;
    empresa: { nombre: string };
  }[];
};

export function RankingTiempoReal({
  inicial,
  participanteId,
}: {
  inicial: Datos;
  participanteId: string;
}) {
  const [datos, setDatos] = useState(inicial);
  usePollingVisible(async () => {
    const respuesta = await fetch("/api/ranking", { cache: "no-store" });
    if (respuesta.ok) setDatos(await respuesta.json());
  }, 10_000);
  return (
    <div className="mt-5 space-y-2">
      {datos.individual.map((persona, indice) => (
        <div key={persona.id} className={`tarjeta flex items-center gap-3 p-3 ${persona.id === participanteId ? "ring-2 ring-[var(--epm-azul)]" : ""}`}>
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-display font-extrabold ${indice < 3 ? "bg-[var(--epm-azul-profundo)] text-[var(--epm-verde)]" : "bg-slate-100 text-slate-500"}`}>{indice < 3 ? <Medal size={18} /> : indice + 1}</span>
          <FotoCircular src={persona.urlFoto} alt={`Foto de ${persona.nombre}`} className="h-12 w-12" />
          <div className="min-w-0 flex-1">
            <strong className="block truncate text-[var(--epm-azul-profundo)]">{persona.nombre}{persona.id === participanteId ? " · Tú" : ""}</strong>
            <p className="truncate text-xs text-slate-500">{persona.empresa.nombre}</p>
          </div>
          <strong className="text-lg text-[var(--epm-azul-profundo)]">{persona.puntosTotales.toLocaleString("es-CO")}</strong>
        </div>
      ))}
    </div>
  );
}
