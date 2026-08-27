"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { Compass, Layers3, LoaderCircle, Orbit, Rocket, Send, Sparkles, Telescope } from "lucide-react";
import type { ConstelacionUniverso, TarjetaUniverso } from "@/lib/universo-experiencia";

export type TarjetaRecibida = TarjetaUniverso & { constelacion: ConstelacionUniverso };
export type MisionUniversoVisible = { tarjetaId: string; reflexion: string; respondidaEn?: string; tarjeta: TarjetaRecibida };

type Props = {
  codigo: string;
  titulo: string;
  invitacion: string;
  tarjeta: TarjetaRecibida | null;
  misiones: MisionUniversoVisible[];
  agotado: boolean;
  puntos: number;
  alGuardar: () => Promise<void>;
};

const ESTRELLAS = Array.from({ length: 48 }, (_, indice) => ({
  left: `${(indice * 37 + 11) % 97}%`, top: `${(indice * 53 + 7) % 94}%`, tamano: 1 + (indice % 4), demora: `${(indice % 9) * .23}s`,
}));

function Planeta({ className, color, secundario, anillo = false }: { className: string; color: string; secundario: string; anillo?: boolean }) {
  return <span aria-hidden="true" className={`planeta-universo absolute rounded-full ${className}`} style={{ "--planeta-a": color, "--planeta-b": secundario } as CSSProperties}>{anillo && <span className="anillo-planeta absolute left-1/2 top-1/2 h-[32%] w-[145%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-[5px] border-lime-300/80" />}</span>;
}

function ConsolidadoOrbital({ misiones }: { misiones: MisionUniversoVisible[] }) {
  const visibles = misiones.slice(-12);
  return <div data-testid="consolidado-universo" className="grid gap-7 xl:grid-cols-[1fr_.9fr]">
    <div className="relative mx-auto aspect-square w-full max-w-[520px]">
      {[88, 66, 44].map((tamano, indice) => <span key={tamano} className="absolute left-1/2 top-1/2 rounded-full border" style={{ width: `${tamano}%`, height: `${tamano * .62}%`, transform: `translate(-50%,-50%) rotate(${indice % 2 ? 13 : -13}deg)`, borderColor: `rgba(103,232,249,${.2 + indice * .12})`, boxShadow: `0 0 ${20 + indice * 10}px rgba(34,211,238,.08)` }} />)}
      <span className="nucleo-universo absolute left-1/2 top-1/2 grid h-32 w-32 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-center shadow-[0_0_70px_rgba(163,230,53,.28)]"><span><strong className="block font-display text-4xl">{misiones.length}</strong><small className="font-extrabold uppercase tracking-[.16em] text-white/65">misiones</small></span></span>
      {visibles.map((mision, indice) => {
        const angulo = (indice / Math.max(visibles.length, 1)) * Math.PI * 2 - Math.PI / 2;
        const radioX = 41 - (indice % 3) * 10;
        const radioY = 27 - (indice % 3) * 6;
        return <span key={`${mision.tarjetaId}-${indice}`} title={mision.tarjeta.titulo} className="mision-orbita absolute grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white/35 font-display text-sm font-extrabold" style={{ left: `${50 + Math.cos(angulo) * radioX}%`, top: `${50 + Math.sin(angulo) * radioY}%`, background: mision.tarjeta.constelacion.color, boxShadow: `0 0 24px ${mision.tarjeta.constelacion.colorSecundario}`, animationDelay: `${indice * .08}s` }}>{indice + Math.max(1, misiones.length - visibles.length + 1)}</span>;
      })}
    </div>
    <div><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-full bg-cyan-300/15 text-cyan-200"><Layers3 /></span><div><h2 className="font-display text-2xl font-extrabold">Tu órbita consolidada</h2><p className="text-sm text-white/55">Cada señal que respondes se convierte en un planeta.</p></div></div>
      <div className="mt-5 max-h-[390px] space-y-3 overflow-y-auto pr-2">{[...misiones].reverse().map((mision, indice) => <article key={`${mision.tarjetaId}-${indice}`} className="rounded-2xl border border-white/12 bg-white/[.07] p-4 backdrop-blur"><div className="flex items-center gap-3"><span className="h-3 w-3 shrink-0 rounded-full" style={{ background: mision.tarjeta.constelacion.colorSecundario, boxShadow: `0 0 14px ${mision.tarjeta.constelacion.colorSecundario}` }} /><p className="text-xs font-extrabold uppercase tracking-[.15em] text-white/55">{mision.tarjeta.constelacion.nombre}</p></div><h3 className="mt-2 font-display text-lg font-extrabold">{mision.tarjeta.titulo}</h3><p className="mt-1 text-sm leading-relaxed text-white/70">“{mision.reflexion}”</p></article>)}</div>
    </div>
  </div>;
}

export function UniversoTarjetas({ codigo, titulo, invitacion, tarjeta, misiones, agotado, puntos, alGuardar }: Props) {
  const [fase, setFase] = useState<"mazo" | "barajando" | "revelada" | "consolidado">(misiones.length ? "consolidado" : "mazo");
  const [reflexion, setReflexion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const estrellas = useMemo(() => ESTRELLAS, []);

  function activarOrbita() { if (fase === "mazo" && tarjeta) { setFase("barajando"); window.setTimeout(() => setFase("revelada"), 1_050); } }
  function sacarOtra() { setError(""); setReflexion(""); setFase("mazo"); }
  async function guardar() {
    if (!tarjeta || reflexion.trim().length < 8 || enviando) return;
    setEnviando(true); setError("");
    try {
      const respuesta = await fetch(`/api/actividades/${encodeURIComponent(codigo)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tarjetaId: tarjeta.id, reflexion: reflexion.trim() }) });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok) throw new Error(cuerpo.error ?? "No pudimos guardar tu misión.");
      await alGuardar(); setReflexion(""); setFase("consolidado");
    } catch (e) { setError(e instanceof Error ? e.message : "No pudimos guardar tu misión."); } finally { setEnviando(false); }
  }

  return <section data-testid="universo-tarjetas" className="universo-experiencia relative min-h-[calc(100dvh-2.5rem)] overflow-hidden rounded-[2rem] border border-white/10 bg-[#06142f] text-white shadow-2xl">
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">{estrellas.map((estrella, indice) => <i key={indice} className="estrella-universo absolute rounded-full bg-white" style={{ left: estrella.left, top: estrella.top, width: estrella.tamano, height: estrella.tamano, animationDelay: estrella.demora }} />)}<Planeta className="-left-12 top-[18%] h-36 w-36 opacity-35" color="#8f4bb4" secundario="#ec62c9" /><Planeta className="-right-10 top-[8%] h-44 w-44 opacity-40" color="#ef3f86" secundario="#ffd47c" anillo /><Planeta className="-bottom-16 right-[8%] h-48 w-48 opacity-30" color="#0a8ed1" secundario="#69d947" anillo /></div>
    <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-2.5rem)] max-w-6xl flex-col px-5 py-7 sm:px-9 sm:py-9">
      <header className="flex items-start justify-between gap-4"><div><div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-white/10 px-4 py-2 text-xs font-extrabold uppercase tracking-[.2em] text-cyan-100 backdrop-blur"><Orbit size={17} /> {misiones.length ? `${misiones.length} ${misiones.length === 1 ? "misión en órbita" : "misiones en órbita"}` : "Experiencia interactiva"}</div><h1 className="mt-4 max-w-3xl font-display text-[clamp(34px,7vw,64px)] font-extrabold leading-[.92]">{titulo}</h1><p className="mt-4 max-w-3xl text-[clamp(15px,2vw,18px)] leading-relaxed text-white/70">{invitacion}</p></div><span className="hidden h-16 w-16 shrink-0 place-items-center rounded-full border border-white/15 bg-white/10 text-lime-300 backdrop-blur sm:grid"><Telescope size={30} /></span></header>

      {fase === "consolidado" ? <div className="flex-1 py-8"><ConsolidadoOrbital misiones={misiones} /><div className="mt-6 text-center">{agotado ? <div className="inline-flex items-center gap-2 rounded-full border border-lime-300/25 bg-lime-300/10 px-5 py-3 font-extrabold text-lime-200"><Sparkles /> Completaste las 20 señales del universo</div> : <button data-testid="sacar-otra-tarjeta" type="button" onClick={sacarOtra} className="inline-flex min-h-14 items-center gap-3 rounded-full bg-gradient-to-r from-lime-400 to-cyan-400 px-7 font-display text-lg font-extrabold text-[#082343] shadow-[0_0_35px_rgba(163,230,53,.3)] transition hover:scale-105"><Rocket /> Sacar otra tarjeta</button>}{misiones.length === 1 && puntos > 0 && <p className="mt-3 text-sm font-bold text-lime-200">+{puntos} puntos por activar tu primera misión</p>}</div></div> : fase !== "revelada" ? <div className="grid flex-1 place-items-center py-8 text-center"><div><div data-testid="mazo-universo" className={`mazo-universo relative mx-auto h-64 w-44 ${fase === "barajando" ? "barajando" : ""}`}>{[4,3,2,1,0].map((indice) => <div key={indice} className="carta-dorso absolute inset-0 grid place-items-center overflow-hidden rounded-[1.7rem] border border-white/25 bg-gradient-to-br from-[#0b6a82] via-[#064f79] to-[#10244d] shadow-2xl" style={{ transform: `translate(${(indice - 2) * 5}px, ${indice * -3}px) rotate(${(indice - 2) * 2.5}deg)`, animationDelay: `${indice * .06}s` }}><span className="absolute inset-3 rounded-[1.25rem] border border-lime-300/45" /><span className="relative grid h-24 w-24 place-items-center rounded-full border border-cyan-200/35"><Orbit className="text-lime-300" size={48} /><i className="absolute h-3 w-3 translate-x-11 -translate-y-2 rounded-full bg-fuchsia-400 shadow-[0_0_18px_#e879f9]" /></span></div>)}</div><p className="mt-8 text-sm font-extrabold uppercase tracking-[.22em] text-cyan-100/70">{20 - misiones.length} señales por descubrir</p><button type="button" onClick={activarOrbita} disabled={fase === "barajando" || !tarjeta} className="mt-5 inline-flex min-h-14 items-center gap-3 rounded-full bg-gradient-to-r from-lime-400 to-cyan-400 px-7 font-display text-lg font-extrabold text-[#082343] shadow-[0_0_35px_rgba(163,230,53,.3)] transition hover:scale-105 disabled:cursor-wait disabled:opacity-80">{fase === "barajando" ? <><LoaderCircle className="animate-spin" /> Buscando tu señal…</> : <><Rocket /> Activar la órbita</>}</button>{misiones.length > 0 && <button type="button" onClick={() => setFase("consolidado")} className="mx-auto mt-4 block text-sm font-bold text-cyan-100/70 underline decoration-cyan-300/30 underline-offset-4">Ver mi órbita consolidada</button>}</div></div> : tarjeta && <div className="grid flex-1 items-center gap-7 py-8 lg:grid-cols-[.9fr_1.1fr]">
        <article data-testid="tarjeta-universo-revelada" className="tarjeta-revelada relative mx-auto w-full max-w-[390px] overflow-hidden rounded-[2rem] border border-white/25 p-7 shadow-[0_30px_80px_rgba(0,0,0,.45)]" style={{ background: `linear-gradient(155deg, ${tarjeta.constelacion.colorSecundario}, ${tarjeta.constelacion.color} 42%, #082445 120%)` }}><span className="absolute -right-14 -top-14 h-44 w-44 rounded-full border-[18px] border-white/10" /><div className="relative flex items-center justify-between"><span className="grid h-12 w-12 place-items-center rounded-full bg-white/15 font-display text-xl font-extrabold">{tarjeta.constelacion.numero}</span><Sparkles className="text-white/75" /></div><div className="relative mt-20"><p className="text-xs font-extrabold uppercase tracking-[.2em] text-white/70">{tarjeta.constelacion.nombre}</p><h2 className="mt-3 font-display text-4xl font-extrabold leading-[.94]">{tarjeta.titulo}</h2><p className="mt-5 text-lg leading-relaxed text-white/90">{tarjeta.mensaje}</p></div><div className="relative mt-8 border-t border-white/20 pt-5 text-xs font-bold uppercase tracking-[.17em] text-white/70">Explora · Conecta · Transforma</div></article>
        <div className="rounded-[2rem] border border-white/15 bg-white/[.08] p-5 shadow-2xl backdrop-blur-xl sm:p-7"><div className="flex items-center gap-3 text-lime-300"><span className="grid h-11 w-11 place-items-center rounded-full bg-lime-300/15"><Compass /></span><div><p className="text-xs font-extrabold uppercase tracking-[.18em]">Misión estelar {misiones.length + 1}</p><p className="text-sm text-white/55">Lleva la tarjeta a tu realidad</p></div></div><p className="mt-5 font-display text-[clamp(21px,3vw,29px)] font-bold leading-snug">{tarjeta.reto}</p><label className="mt-6 block"><span className="text-sm font-extrabold text-cyan-100">Tu acción o reflexión</span><textarea data-testid="reflexion-universo" className="mt-2 min-h-32 w-full rounded-2xl border border-white/20 bg-[#061a36]/80 p-4 text-white outline-none placeholder:text-white/35 focus:border-lime-300 focus:ring-4 focus:ring-lime-300/10" maxLength={500} value={reflexion} onChange={(evento) => setReflexion(evento.target.value)} placeholder="Escribe la señal que quieres convertir en acción…" /></label><div className="mt-2 flex justify-between text-xs text-white/40"><span>Mínimo 8 caracteres</span><span>{reflexion.length}/500</span></div>{error && <p role="alert" className="mt-4 rounded-xl bg-red-400/15 p-3 text-sm font-bold text-red-100">{error}</p>}<button type="button" disabled={reflexion.trim().length < 8 || enviando} onClick={() => void guardar()} className="mt-5 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-lime-300 px-6 py-3 font-display font-extrabold text-[#082343] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">{enviando ? <LoaderCircle className="animate-spin" /> : <Send />} Poner mi misión en órbita</button><button type="button" onClick={() => setFase(misiones.length ? "consolidado" : "mazo")} className="mt-3 w-full text-sm font-bold text-white/55">Volver {misiones.length ? "a mi consolidado" : "al mazo"}</button></div>
      </div>}
    </div>
    <style jsx>{`
      .universo-experiencia{background-image:radial-gradient(circle at 50% 45%,rgba(7,118,142,.22),transparent 32rem),linear-gradient(145deg,#06142f 0%,#071d42 58%,#031027 100%)}
      .estrella-universo{opacity:.28;animation:estrella-parpadea 2.8s ease-in-out infinite alternate;box-shadow:0 0 10px white}
      :global(.planeta-universo){background:radial-gradient(circle at 30% 25%,rgba(255,255,255,.75) 0 4%,var(--planeta-b) 14%,var(--planeta-a) 58%,#171341 100%);box-shadow:0 0 0 14px color-mix(in srgb,var(--planeta-a) 20%,transparent),0 0 60px color-mix(in srgb,var(--planeta-b) 22%,transparent)}
      :global(.anillo-planeta){transform:translate(-50%,-50%) rotate(-18deg)}
      .nucleo-universo{background:radial-gradient(circle at 34% 28%,#e9ff9a,#84cc16 24%,#087e8b 62%,#071b3c 100%)}
      .mision-orbita{animation:aparecer-planeta .55s cubic-bezier(.18,.82,.22,1.18) both}.barajando .carta-dorso{animation:barajar-carta 1s cubic-bezier(.2,.75,.2,1) both}.tarjeta-revelada{animation:revelar-tarjeta .75s cubic-bezier(.18,.82,.22,1.18) both}
      @keyframes estrella-parpadea{to{opacity:.95;transform:scale(1.4)}}@keyframes aparecer-planeta{from{opacity:0;scale:.2}to{opacity:1;scale:1}}@keyframes barajar-carta{0%{transform:translate(0,0) rotate(0)}40%{transform:translate(24px,-28px) rotate(12deg)}75%{transform:translate(-20px,15px) rotate(-8deg)}100%{transform:translate(0,0) rotate(360deg) scale(.92);opacity:.15}}@keyframes revelar-tarjeta{from{opacity:0;transform:translateY(28px) rotateY(85deg) scale(.85)}to{opacity:1;transform:translateY(0) rotateY(0) scale(1)}}
    `}</style>
  </section>;
}
