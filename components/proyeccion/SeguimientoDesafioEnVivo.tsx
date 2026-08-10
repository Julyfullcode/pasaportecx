"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Coins, Hourglass, ShieldCheck, UsersRound } from "lucide-react";
import { FotoCircular } from "@/components/marca/FotoCircular";
import { usePollingVisible } from "@/lib/usePollingVisible";
import type { ParticipanteSeguimiento, SeguimientoDesafio } from "@/lib/seguimiento-desafio";

const PARTICIPANTES_POR_PAGINA = 12;
const INTERVALO_ROTACION_MS = 8_000;

function textoEstado(persona: ParticipanteSeguimiento) {
  if (!persona.respondio) return "Sin respuesta";
  if (persona.estado === "PENDIENTE") return "Pendiente de revisión";
  if (persona.estado === "RECHAZADO") return "Respuesta rechazada";
  return "Respondió";
}

function claseEstado(persona: ParticipanteSeguimiento) {
  if (!persona.respondio) return "bg-white/8 text-white/60";
  if (persona.estado === "PENDIENTE") return "bg-amber-300/20 text-amber-200";
  if (persona.estado === "RECHAZADO") return "bg-rose-300/20 text-rose-200";
  return "bg-emerald-300/20 text-emerald-200";
}

function tiempoRestante(cierraEn: string | null, ahora: number, estado: string) {
  if (estado !== "PUBLICADO") return estado === "CERRADO" ? "Cerrado" : "Sin publicar";
  if (!cierraEn) return "Sin límite";
  const restante = new Date(cierraEn).getTime() - ahora;
  if (restante <= 0) return "Finalizado";
  const segundos = Math.floor(restante / 1000);
  const dias = Math.floor(segundos / 86_400);
  const horas = Math.floor((segundos % 86_400) / 3_600);
  const minutos = Math.floor((segundos % 3_600) / 60);
  const segundosRestantes = segundos % 60;
  if (dias > 0) return `${dias}d ${horas}h ${minutos}m`;
  if (horas > 0) return `${horas}h ${minutos}m ${segundosRestantes}s`;
  return `${minutos}m ${String(segundosRestantes).padStart(2, "0")}s`;
}

export function SeguimientoDesafioEnVivo({ inicial, compacto = false }: { inicial: SeguimientoDesafio; compacto?: boolean }) {
  const [seguimiento, setSeguimiento] = useState(inicial);
  const [pagina, setPagina] = useState(0);
  const [ahora, setAhora] = useState(() => Date.now());
  const paginas = Math.max(1, Math.ceil(seguimiento.participantes.length / PARTICIPANTES_POR_PAGINA));

  usePollingVisible(async () => {
    const respuesta = await fetch(`/api/proyeccion/desafios/${seguimiento.desafio.id}`, { cache: "no-store" });
    if (respuesta.ok) setSeguimiento(await respuesta.json());
  }, 3_000);

  useEffect(() => {
    const reloj = window.setInterval(() => setAhora(Date.now()), 1_000);
    return () => window.clearInterval(reloj);
  }, []);

  useEffect(() => {
    setPagina((actual) => Math.min(actual, paginas - 1));
    if (paginas < 2) return;
    const rotador = window.setInterval(() => setPagina((actual) => (actual + 1) % paginas), INTERVALO_ROTACION_MS);
    return () => window.clearInterval(rotador);
  }, [paginas]);

  const visibles = useMemo(
    () => seguimiento.participantes.slice(pagina * PARTICIPANTES_POR_PAGINA, (pagina + 1) * PARTICIPANTES_POR_PAGINA),
    [pagina, seguimiento.participantes],
  );
  const { resumen, desafio } = seguimiento;
  const cierre = tiempoRestante(desafio.cierraEn, ahora, desafio.estado);
  const metricas = [
    { etiqueta: "Respondieron", valor: `${resumen.respondieron} de ${resumen.totalParticipantes}`, Icono: CheckCircle2, clase: "text-emerald-200" },
    { etiqueta: "Pendientes", valor: resumen.pendientes.toLocaleString("es-CO"), Icono: UsersRound, clase: "text-sky-200" },
    { etiqueta: "Puntos otorgados", valor: resumen.puntosOtorgados.toLocaleString("es-CO"), Icono: Coins, clase: "text-[var(--epm-verde)]" },
    { etiqueta: "Tiempo restante", valor: cierre, Icono: Hourglass, clase: "text-amber-200" },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-[clamp(10px,1.5vh,18px)] py-[clamp(12px,1.8vh,22px)]">
      <div className={`grid shrink-0 grid-cols-4 ${compacto ? "gap-2" : "gap-[clamp(8px,1vw,16px)]"}`}>
        {metricas.map(({ etiqueta, valor, Icono, clase }) => (
          <section key={etiqueta} className="rounded-[clamp(14px,1.4vw,22px)] border border-white/15 bg-white/10 p-[clamp(10px,1.2vw,18px)] shadow-xl backdrop-blur">
            <div className="flex items-center gap-2 text-white/65"><Icono className={clase} size={20} /><span className="text-[clamp(10px,.9vw,14px)] font-extrabold uppercase tracking-wide">{etiqueta}</span></div>
            <strong className={`mt-2 block truncate font-display text-[clamp(22px,2.6vw,42px)] leading-none ${clase}`}>{valor}</strong>
          </section>
        ))}
      </div>

      <section className="shrink-0 rounded-2xl border border-white/10 bg-slate-950/15 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-4 text-[clamp(11px,1vw,15px)] font-bold">
          <span>{desafio.categoria} · {desafio.puntos} puntos por respuesta</span>
          <span>{resumen.porcentaje}% completado{desafio.limiteCompletitudes ? ` · límite: ${desafio.limiteCompletitudes}` : ""}</span>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-[var(--epm-verde)] to-emerald-300 transition-all duration-700" style={{ width: `${resumen.porcentaje}%` }} />
        </div>
      </section>

      <div className="min-h-0 flex-1">
        {visibles.length ? (
          <div className={`grid h-full auto-rows-fr gap-[clamp(7px,.8vw,13px)] ${compacto ? "grid-cols-3" : "grid-cols-4"}`}>
            {visibles.map((persona) => (
              <article key={persona.id} className={`flex min-h-0 items-center gap-3 overflow-hidden rounded-[clamp(13px,1.2vw,20px)] border p-[clamp(8px,.9vw,14px)] backdrop-blur ${persona.respondio ? "border-white/20 bg-white/13" : "border-white/8 bg-slate-950/12"}`}>
                <FotoCircular src={persona.urlFoto} alt={`Foto de ${persona.nombre}`} className="h-[clamp(42px,4.2vw,68px)] w-[clamp(42px,4.2vw,68px)] shrink-0 border-2" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h2 className="truncate text-[clamp(12px,1.1vw,18px)] font-extrabold">{persona.nombre}</h2>
                    {persona.esStaff && <ShieldCheck className="shrink-0 text-violet-200" size={15} aria-label="Staff" />}
                  </div>
                  <span className={`mt-1 inline-flex rounded-full px-2 py-1 text-[clamp(8px,.72vw,11px)] font-extrabold uppercase tracking-wide ${claseEstado(persona)}`}>{textoEstado(persona)}</span>
                </div>
                <strong className={`shrink-0 text-[clamp(13px,1.25vw,20px)] ${persona.puntosOtorgados > 0 ? "text-[var(--epm-verde)]" : "text-white/45"}`}>{persona.respondio ? `+${persona.puntosOtorgados}` : "—"}<small className="ml-1 text-[.65em]">pts</small></strong>
              </article>
            ))}
          </div>
        ) : (
          <div className="grid h-full place-items-center rounded-3xl border border-white/15 bg-white/8 text-center">
            <div><Clock3 className="mx-auto text-[var(--epm-verde)]" size={60} /><h2 className="mt-4 font-display text-3xl font-extrabold">Aún no hay participantes activos</h2><p className="mt-2 text-white/65">El seguimiento comenzará cuando existan personas registradas.</p></div>
          </div>
        )}
      </div>

      {paginas > 1 && <p className="shrink-0 text-center text-xs font-bold text-white/55">Página {pagina + 1} de {paginas} · rotación automática</p>}
    </div>
  );
}
