"use client";

import { useState } from "react";
import { Crown, Medal, Users } from "lucide-react";
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
    const respuesta = await fetch("/api/ranking", { cache: "no-store" });
    if (respuesta.ok) setEquipos((await respuesta.json()).equipos);
  }, 3_000);

  const top = equipos.slice(0, tamano);
  const principales = [top[1], top[0], top[2]].filter(Boolean);
  return (
    <div className="flex h-full min-h-0 flex-col gap-[clamp(9px,1.2vh,15px)] py-[clamp(12px,2vh,24px)]">
      <div className="mx-auto grid min-h-0 w-full max-w-[1500px] flex-1 grid-cols-[.94fr_1.12fr_.94fr] items-end gap-[clamp(12px,1.7vw,28px)]">
        {principales.map((equipo) => {
          const puesto = top.findIndex((item) => item.id === equipo.id) + 1;
          const primero = puesto === 1;
          return (
            <article key={equipo.id} className={`relative flex min-h-0 flex-col overflow-hidden rounded-[2rem] bg-white/95 text-[var(--epm-gris-texto)] shadow-2xl transition-all duration-700 ${primero ? "h-full border-4 border-amber-300 shadow-[0_0_60px_rgba(251,191,36,.4)] ring-4 ring-amber-200/20" : puesto === 2 ? "h-[91%] border-2 border-slate-200" : "h-[87%] border-2 border-orange-300/70"}`}>
              <div className="relative shrink-0 p-[clamp(14px,1.8vw,28px)] text-white" style={{ background: primero ? `linear-gradient(135deg, ${equipo.colorHex}, #8CC63F)` : equipo.colorHex }}>
                <span className={`mb-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[clamp(10px,1vw,15px)] font-extrabold ${primero ? "bg-amber-300 text-amber-950" : "bg-white/20"}`}>{primero ? <Crown size={19} fill="currentColor" /> : <Medal size={18} />}{primero ? "Primer lugar" : puesto === 2 ? "Segundo lugar" : "Tercer lugar"}</span>
                <div className="flex items-end justify-between gap-3"><h2 className={`${primero ? "text-[clamp(26px,3.1vw,50px)]" : "text-[clamp(21px,2.5vw,40px)]"} font-extrabold leading-tight`}>{equipo.nombre}</h2><span className={`${primero ? "text-[clamp(44px,5vw,76px)]" : "text-[clamp(28px,3.5vw,54px)]"} font-extrabold leading-none`}>#{puesto}</span></div>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden p-[clamp(14px,1.8vw,28px)]">
                <strong className={`font-display ${primero ? "text-[clamp(42px,5vw,78px)] text-amber-500" : "text-[clamp(32px,4vw,62px)] text-[var(--epm-azul-profundo)]"}`}>{equipo.puntaje.toLocaleString("es-CO")}</strong>
                <p className="flex items-center gap-2 text-[clamp(12px,1.3vw,20px)] text-slate-500"><Users /> {equipo.integrantes} integrantes</p>
                <div className="mt-5 flex flex-wrap gap-[clamp(4px,.55vw,9px)]">
                  {equipo.participantes.slice(0, 14).map((participante) => (
                    <div key={participante.id} className="relative shrink-0">
                      <FotoCircular src={participante.urlFoto} alt={`Foto de ${participante.nombre}`} className={primero ? "h-[clamp(50px,5vw,78px)] w-[clamp(50px,5vw,78px)]" : "h-[clamp(42px,4.2vw,66px)] w-[clamp(42px,4.2vw,66px)]"} />
                      {participante.empresa.urlLogo && (
                        <span className="absolute -bottom-1 -right-1 z-10 grid h-[clamp(19px,1.7vw,27px)] w-[clamp(19px,1.7vw,27px)] place-items-center overflow-hidden rounded-full border-2 border-white bg-white p-0.5 shadow-md" title={participante.empresa.nombre}>
                          <img src={participante.empresa.urlLogo} alt="" className="max-h-full max-w-full object-contain" />
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {top.length > 3 && (
        <div className="grid shrink-0 grid-cols-4 gap-2">
          {top.slice(3, 7).map((equipo, indice) => <div key={equipo.id} className="flex items-center gap-3 rounded-2xl bg-white/12 px-4 py-2 backdrop-blur"><strong className="text-xl text-[var(--epm-verde)]">#{indice + 4}</strong><span className="min-w-0 flex-1 truncate font-extrabold">{equipo.nombre}</span><strong>{equipo.puntaje.toLocaleString("es-CO")}</strong></div>)}
        </div>
      )}
    </div>
  );
}
