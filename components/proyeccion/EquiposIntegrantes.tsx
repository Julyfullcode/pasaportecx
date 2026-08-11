"use client";

import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, ChevronLeft, ChevronRight, Sparkles, Users } from "lucide-react";
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
    tieneLicencia: boolean;
    empresa: { nombre: string };
  }[];
};

function modulo(valor: number, total: number) {
  return ((valor % total) + total) % total;
}

const estilos = [
  "border-sky-300/35 from-sky-400/20 to-cyan-200/5",
  "border-emerald-300/35 from-emerald-400/20 to-lime-200/5",
  "border-amber-300/35 from-amber-400/20 to-orange-200/5",
  "border-violet-300/35 from-violet-400/20 to-fuchsia-200/5",
];

export function EquiposIntegrantes({ inicial }: { inicial: EquipoProyeccion[] }) {
  const [equipos, setEquipos] = useState(inicial);
  const [ciclo, setCiclo] = useState(0);
  const [reinicioAutomatico, setReinicioAutomatico] = useState(0);
  const equiposPorTanda = Math.min(4, Math.max(1, equipos.length));
  const limiteIntegrantes = 6;
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
  }, [necesitaRotar, reinicioAutomatico]);

  function moverVista(direccion: -1 | 1) {
    setCiclo((actual) => actual + direccion);
    setReinicioAutomatico((actual) => actual + 1);
  }

  const visibles = useMemo(() => {
    if (!equipos.length) return [];
    const inicio = equipos.length > equiposPorTanda ? modulo(ciclo * equiposPorTanda, equipos.length) : 0;
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
        <div className="flex shrink-0 items-center gap-2">
          {necesitaRotar && (
            <div className="flex items-center gap-1 rounded-full border border-white/15 bg-slate-950/20 p-1 backdrop-blur">
              <button type="button" onClick={() => moverVista(-1)} aria-label="Vista anterior de equipos" title="Vista anterior" className="grid h-9 w-9 place-items-center rounded-full text-white transition hover:bg-white/15"><ChevronLeft size={22} /></button>
              <span className="px-2 text-[clamp(10px,.8vw,13px)] font-extrabold text-white/65">Mover vista</span>
              <button type="button" onClick={() => moverVista(1)} aria-label="Siguiente vista de equipos" title="Siguiente vista" className="grid h-9 w-9 place-items-center rounded-full bg-[var(--epm-verde)] text-[var(--epm-azul-profundo)] transition hover:brightness-105"><ChevronRight size={22} /></button>
            </div>
          )}
          <span className="rounded-full bg-white/15 px-5 py-2 text-[clamp(12px,1.1vw,18px)] font-extrabold">{equipos.length} equipos · {totalIntegrantes} integrantes</span>
        </div>
      </div>
      <div className={`grid min-h-0 flex-1 gap-[clamp(10px,1.2vw,18px)] ${columnas}`}>
        {visibles.map((equipo, indiceEquipo) => {
          const cantidad = equipo.participantes.length;
          const inicio = cantidad > limiteIntegrantes ? modulo(ciclo * limiteIntegrantes, cantidad) : 0;
          const integrantes = cantidad
            ? Array.from(
                { length: Math.min(limiteIntegrantes, cantidad) },
                (_, indice) => equipo.participantes[(inicio + indice) % cantidad],
              )
            : [];
          return (
            <article key={`${equipo.id}-${ciclo}`} data-equipo-id={equipo.id} className={`entrada-suave flex min-h-0 flex-col overflow-hidden rounded-[clamp(20px,2vw,32px)] border bg-gradient-to-br ${estilos[indiceEquipo % estilos.length]} shadow-2xl backdrop-blur-md`}>
              <header className="flex shrink-0 items-center gap-3 border-b border-white/15 px-[clamp(14px,1.5vw,24px)] py-[clamp(12px,1.4vh,20px)]">
                <span className="grid h-[clamp(42px,3.5vw,58px)] w-[clamp(42px,3.5vw,58px)] shrink-0 place-items-center rounded-2xl bg-[var(--epm-verde)] font-display text-[clamp(20px,1.8vw,30px)] font-extrabold text-[var(--epm-azul-profundo)] shadow-lg">{equipo.orden}</span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-[clamp(18px,1.65vw,28px)] font-extrabold leading-tight">{equipo.nombre}</h2>
                  <p className="mt-1 text-[clamp(11px,.9vw,15px)] font-bold text-white/65">{cantidad} {cantidad === 1 ? "integrante" : "integrantes"}</p>
                </div>
                <Users className="shrink-0 text-white/45" size={28} />
              </header>
              {integrantes.length ? (
                <div className="grid min-h-0 flex-1 grid-cols-1 gap-[clamp(6px,.6vw,9px)] overflow-hidden p-[clamp(10px,.9vw,16px)]" style={{ gridTemplateRows: `repeat(${integrantes.length}, minmax(0, 1fr))` }}>
                  {integrantes.map((persona) => (
                    <div key={`${persona.id}-${ciclo}`} data-integrante-id={persona.id} data-tiene-licencia={persona.tieneLicencia ? "true" : "false"} className={`flex min-h-0 min-w-0 items-center gap-[clamp(12px,1vw,18px)] rounded-2xl border px-[clamp(12px,1vw,18px)] py-[clamp(4px,.45vh,7px)] ${persona.tieneLicencia ? "border-[var(--epm-verde)]/70 bg-[var(--epm-verde)]/20 shadow-[0_0_0_1px_rgba(143,207,46,.25)]" : "border-white/10 bg-slate-950/15"}`}>
                      <FotoCircular src={persona.urlFoto} alt={`Foto de ${persona.nombre}`} className={`h-[clamp(60px,3.6vw,72px)] w-[clamp(60px,3.6vw,72px)] shrink-0 border-[3px] ${persona.tieneLicencia ? "border-[var(--epm-verde)]" : ""}`} />
                      <div className="min-w-0 flex-1">
                        <p className="whitespace-normal text-[clamp(15px,1.05vw,19px)] font-extrabold leading-tight text-white">{persona.nombre}</p>
                        <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                          <p className="min-w-0 flex-1 truncate text-[clamp(11px,.78vw,14px)] font-semibold text-white/65">{persona.empresa.nombre}</p>
                          {persona.tieneLicencia && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--epm-verde)] px-1.5 py-0.5 text-[clamp(9px,.65vw,11px)] font-extrabold text-[var(--epm-azul-profundo)]"><BadgeCheck size={11} /> Licencia</span>}
                        </div>
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