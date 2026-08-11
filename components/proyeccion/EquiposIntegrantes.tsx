"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles, Users } from "lucide-react";
import { FotoCircular } from "@/components/marca/FotoCircular";
import { usePollingVisible } from "@/lib/usePollingVisible";

export type EquipoProyeccion = {
  id: string;
  nombre: string;
  orden: number;
  participantes: {
    id: string;
    nombre: string;
    urlFoto: string;
    empresa: { nombre: string };
  }[];
};

const estilos = [
  "border-sky-300/35 from-sky-400/20 to-cyan-200/5",
  "border-emerald-300/35 from-emerald-400/20 to-lime-200/5",
  "border-amber-300/35 from-amber-400/20 to-orange-200/5",
  "border-violet-300/35 from-violet-400/20 to-fuchsia-200/5",
];

export function EquiposIntegrantes({ inicial }: { inicial: EquipoProyeccion[] }) {
  const [equipos, setEquipos] = useState(inicial);
  const [ciclo, setCiclo] = useState(0);
  const equiposPorTanda = Math.min(4, Math.max(1, equipos.length));
  const limiteIntegrantes = equipos.length === 1 ? 36 : 24;
  const necesitaRotar = equipos.length > equiposPorTanda
    || equipos.some((equipo) => equipo.participantes.length > limiteIntegrantes);

  usePollingVisible(async () => {
    const respuesta = await fetch("/api/proyeccion/equipos", { cache: "no-store" });
    if (!respuesta.ok) return;
    const datos = await respuesta.json() as { equipos: EquipoProyeccion[] };
    setEquipos(datos.equipos);
  }, 5_000);

  useEffect(() => {
    if (!necesitaRotar) return;
    const intervalo = window.setInterval(() => setCiclo((actual) => actual + 1), 8_000);
    return () => window.clearInterval(intervalo);
  }, [necesitaRotar]);

  const visibles = useMemo(() => {
    if (!equipos.length) return [];
    const inicio = equipos.length > equiposPorTanda ? (ciclo * equiposPorTanda) % equipos.length : 0;
    return Array.from(
      { length: equiposPorTanda },
      (_, indice) => equipos[(inicio + indice) % equipos.length],
    );
  }, [ciclo, equipos, equiposPorTanda]);

  const columnas = visibles.length === 1
    ? "grid-cols-1 max-w-6xl mx-auto"
    : visibles.length === 2
      ? "grid-cols-2"
      : visibles.length === 3
        ? "grid-cols-3"
        : "grid-cols-4";
  const totalIntegrantes = equipos.reduce((total, equipo) => total + equipo.participantes.length, 0);

  if (!equipos.length) {
    return (
      <div className="grid h-full place-items-center py-8">
        <div className="rounded-[2rem] border border-white/20 bg-white/10 px-12 py-10 text-center shadow-2xl backdrop-blur">
          <Users className="mx-auto text-[var(--epm-verde)]" size={58} />
          <h2 className="mt-4 text-3xl font-extrabold">Aún no hay equipos activos</h2>
          <p className="mt-2 text-white/70">Configura los equipos y asigna sus integrantes desde Participantes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col py-[clamp(12px,2vh,24px)]">
      <div className="mb-3 flex shrink-0 items-center justify-between gap-4">
        <p className="flex items-center gap-2 text-[clamp(13px,1.2vw,20px)] font-bold text-white/70"><Sparkles className="text-[var(--epm-verde)]" size={20} /> Personas que suman desde cada equipo</p>
        <span className="rounded-full bg-white/15 px-5 py-2 text-[clamp(12px,1.1vw,18px)] font-extrabold">{equipos.length} equipos · {totalIntegrantes} integrantes</span>
      </div>
      <div className={`grid min-h-0 flex-1 gap-[clamp(10px,1.2vw,18px)] ${columnas}`}>
        {visibles.map((equipo, indiceEquipo) => {
          const cantidad = equipo.participantes.length;
          const inicio = cantidad > limiteIntegrantes ? (ciclo * limiteIntegrantes) % cantidad : 0;
          const integrantes = cantidad
            ? Array.from(
                { length: Math.min(limiteIntegrantes, cantidad) },
                (_, indice) => equipo.participantes[(inicio + indice) % cantidad],
              )
            : [];
          return (
            <article key={`${equipo.id}-${ciclo}`} className={`entrada-suave flex min-h-0 flex-col overflow-hidden rounded-[clamp(20px,2vw,32px)] border bg-gradient-to-br ${estilos[indiceEquipo % estilos.length]} shadow-2xl backdrop-blur-md`}>
              <header className="flex shrink-0 items-center gap-3 border-b border-white/15 px-[clamp(14px,1.5vw,24px)] py-[clamp(12px,1.4vh,20px)]">
                <span className="grid h-[clamp(42px,3.5vw,58px)] w-[clamp(42px,3.5vw,58px)] shrink-0 place-items-center rounded-2xl bg-[var(--epm-verde)] font-display text-[clamp(20px,1.8vw,30px)] font-extrabold text-[var(--epm-azul-profundo)] shadow-lg">{equipo.orden}</span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-[clamp(18px,1.65vw,28px)] font-extrabold leading-tight">{equipo.nombre}</h2>
                  <p className="mt-1 text-[clamp(11px,.9vw,15px)] font-bold text-white/65">{cantidad} {cantidad === 1 ? "integrante" : "integrantes"}</p>
                </div>
                <Users className="shrink-0 text-white/45" size={28} />
              </header>
              {integrantes.length ? (
                <div className={`grid min-h-0 flex-1 content-start gap-[clamp(5px,.7vw,10px)] overflow-hidden p-[clamp(10px,1.1vw,18px)] ${visibles.length === 1 ? "grid-cols-3" : "grid-cols-2"}`}>
                  {integrantes.map((persona) => (
                    <div key={`${persona.id}-${ciclo}`} className="flex min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-slate-950/15 px-[clamp(7px,.65vw,11px)] py-[clamp(5px,.6vh,9px)]">
                      <FotoCircular src={persona.urlFoto} alt={`Foto de ${persona.nombre}`} className="h-[clamp(30px,2.3vw,42px)] w-[clamp(30px,2.3vw,42px)] shrink-0 border-2" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[clamp(10px,.82vw,14px)] font-extrabold leading-tight">{persona.nombre}</p>
                        <p className="mt-0.5 truncate text-[clamp(8px,.68vw,11px)] text-white/55">{persona.empresa.nombre}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid min-h-0 flex-1 place-items-center p-6 text-center text-white/55">
                  <div><Users className="mx-auto mb-3" size={38} /><p className="font-bold">Sin integrantes asignados</p></div>
                </div>
              )}
              {cantidad > limiteIntegrantes && <p className="shrink-0 border-t border-white/10 px-4 py-2 text-center text-[10px] font-bold text-white/55">Rotación automática · mostrando {integrantes.length} de {cantidad}</p>}
            </article>
          );
        })}
      </div>
    </div>
  );
}