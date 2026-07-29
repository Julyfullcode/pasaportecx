"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { FotoCircular } from "@/components/marca/FotoCircular";

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
  useEffect(() => {
    let intervalo: ReturnType<typeof setInterval> | undefined;
    const actualizar = async () => { const r = await fetch("/api/ranking", { cache: "no-store" }); if (r.ok) { const d = await r.json(); setEquipos(d.equipos); setCriterio(d.configuracion.metodoPuntajeEquipo); } };
    const fuente = new EventSource("/api/stream"); fuente.onmessage = actualizar; fuente.onerror = () => { fuente.close(); intervalo = setInterval(actualizar, 5_000); };
    return () => { fuente.close(); if (intervalo) clearInterval(intervalo); };
  }, []);
  return (
    <div className="mt-[clamp(30px,6vh,80px)]">
      <p className="mx-auto w-fit rounded-full bg-white/15 px-6 py-3 text-[clamp(14px,1.5vw,23px)] font-extrabold">Criterio: {criterio === "PROMEDIO" ? "promedio por integrante activo" : "suma total"}</p>
      <div className="mx-auto mt-7 grid max-w-[1500px] grid-cols-3 gap-[clamp(14px,2vw,34px)]">
        {equipos.slice(0, tamano).map((equipo, indice) => (
          <article key={equipo.id} className="overflow-hidden rounded-[2rem] bg-white/95 text-[var(--epm-gris-texto)] shadow-2xl transition-all duration-700">
            <div className="p-[clamp(18px,2.5vw,36px)] text-white" style={{ background: equipo.colorHex }}>
              <span className="text-[clamp(28px,4vw,60px)] font-extrabold">#{indice + 1}</span><h2 className="text-[clamp(21px,2.7vw,42px)] font-extrabold">{equipo.nombre}</h2>
            </div>
            <div className="p-[clamp(18px,2.5vw,36px)]">
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
