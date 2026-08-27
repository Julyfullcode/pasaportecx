"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { CheckCircle2, Compass, LoaderCircle, Orbit, Rocket, Send, Sparkles, Telescope } from "lucide-react";
import type { ConstelacionUniverso, TarjetaUniverso } from "@/lib/universo-experiencia";

type TarjetaRecibida = TarjetaUniverso & { constelacion: ConstelacionUniverso };

type Props = {
  codigo: string;
  titulo: string;
  invitacion: string;
  tarjeta: TarjetaRecibida;
  completada: boolean;
  reflexionGuardada: string | null;
  puntos: number;
  alGuardar: () => Promise<void>;
};

const POSICIONES_ESTRELLAS = Array.from({ length: 42 }, (_, indice) => ({
  left: `${(indice * 37 + 11) % 97}%`,
  top: `${(indice * 53 + 7) % 94}%`,
  tamano: 1 + (indice % 4),
  demora: `${(indice % 9) * .23}s`,
}));

function Planeta({ className, color, secundario, anillo = false }: { className: string; color: string; secundario: string; anillo?: boolean }) {
  return <span aria-hidden="true" className={`planeta-universo absolute rounded-full ${className}`} style={{ "--planeta-a": color, "--planeta-b": secundario } as CSSProperties}>{anillo && <span className="anillo-planeta absolute left-1/2 top-1/2 h-[32%] w-[145%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-[5px] border-lime-300/80" />}</span>;
}

export function UniversoTarjetas({ codigo, titulo, invitacion, tarjeta, completada, reflexionGuardada, puntos, alGuardar }: Props) {
  const [fase, setFase] = useState<"mazo" | "barajando" | "revelada">(completada ? "revelada" : "mazo");
  const [reflexion, setReflexion] = useState(reflexionGuardada ?? "");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const lista = useMemo(() => POSICIONES_ESTRELLAS, []);

  useEffect(() => {
    if (!completada) return;
    setFase("revelada");
    setReflexion(reflexionGuardada ?? "");
  }, [completada, reflexionGuardada]);

  function activarOrbita() {
    if (fase !== "mazo") return;
    setFase("barajando");
    window.setTimeout(() => setFase("revelada"), 1_350);
  }

  async function guardar() {
    if (reflexion.trim().length < 8 || enviando) return;
    setEnviando(true);
    setError("");
    try {
      const respuesta = await fetch(`/api/actividades/${encodeURIComponent(codigo)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tarjetaId: tarjeta.id, reflexion: reflexion.trim() }),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok) throw new Error(cuerpo.error ?? "No pudimos guardar tu misión.");
      await alGuardar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos guardar tu misión.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section data-testid="universo-tarjetas" className="universo-experiencia relative min-h-[calc(100dvh-2.5rem)] overflow-hidden rounded-[2rem] border border-white/10 bg-[#06142f] text-white shadow-2xl">
      <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
        {lista.map((estrella, indice) => <i key={indice} className="estrella-universo absolute rounded-full bg-white" style={{ left: estrella.left, top: estrella.top, width: estrella.tamano, height: estrella.tamano, animationDelay: estrella.demora }} />)}
        <span className="absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full border border-cyan-300/10" />
        <span className="absolute -right-10 -top-10 h-[300px] w-[300px] rounded-full border border-lime-300/10" />
        <Planeta className="-left-12 top-[18%] h-36 w-36 opacity-45" color="#8f4bb4" secundario="#ec62c9" />
        <Planeta className="-right-10 top-[8%] h-44 w-44 opacity-45" color="#ef3f86" secundario="#ffd47c" anillo />
        <Planeta className="-bottom-16 right-[8%] h-48 w-48 opacity-35" color="#0a8ed1" secundario="#69d947" anillo />
        <span className="orbita-universo absolute left-1/2 top-[48%] h-[560px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-cyan-300/10" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-2.5rem)] max-w-6xl flex-col px-5 py-7 sm:px-9 sm:py-9">
        <header className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-white/10 px-4 py-2 text-xs font-extrabold uppercase tracking-[.2em] text-cyan-100 backdrop-blur"><Orbit size={17} /> Experiencia interactiva</div>
            <h1 className="mt-4 max-w-3xl font-display text-[clamp(34px,7vw,66px)] font-extrabold leading-[.92]">{titulo}</h1>
            <p className="mt-4 max-w-3xl text-[clamp(15px,2vw,19px)] leading-relaxed text-white/70">{invitacion}</p>
          </div>
          <span className="hidden h-16 w-16 shrink-0 place-items-center rounded-full border border-white/15 bg-white/10 text-lime-300 backdrop-blur sm:grid"><Telescope size={30} /></span>
        </header>

        {fase !== "revelada" ? (
          <div className="grid flex-1 place-items-center py-8 text-center">
            <div>
              <div data-testid="mazo-universo" className={`mazo-universo relative mx-auto h-64 w-44 ${fase === "barajando" ? "barajando" : ""}`}>
                {[4, 3, 2, 1, 0].map((indice) => <div key={indice} className="carta-dorso absolute inset-0 grid place-items-center overflow-hidden rounded-[1.7rem] border border-white/25 bg-gradient-to-br from-[#0b6a82] via-[#064f79] to-[#10244d] shadow-2xl" style={{ transform: `translate(${(indice - 2) * 5}px, ${indice * -3}px) rotate(${(indice - 2) * 2.5}deg)`, animationDelay: `${indice * .06}s` }}><span className="absolute inset-3 rounded-[1.25rem] border border-lime-300/45" /><span className="relative grid h-24 w-24 place-items-center rounded-full border border-cyan-200/35"><Orbit className="text-lime-300" size={48} /><i className="absolute h-3 w-3 translate-x-11 -translate-y-2 rounded-full bg-fuchsia-400 shadow-[0_0_18px_#e879f9]" /></span></div>)}
              </div>
              <p className="mt-8 text-sm font-extrabold uppercase tracking-[.22em] text-cyan-100/70">20 señales · 5 constelaciones · 1 misión para ti</p>
              <button type="button" onClick={activarOrbita} disabled={fase === "barajando"} className="mt-5 inline-flex min-h-14 items-center gap-3 rounded-full bg-gradient-to-r from-lime-400 to-cyan-400 px-7 font-display text-lg font-extrabold text-[#082343] shadow-[0_0_35px_rgba(163,230,53,.3)] transition hover:scale-105 disabled:cursor-wait disabled:opacity-80">{fase === "barajando" ? <><LoaderCircle className="animate-spin" /> Buscando tu señal…</> : <><Rocket /> Activar la órbita</>}</button>
            </div>
          </div>
        ) : (
          <div className="grid flex-1 items-center gap-7 py-8 lg:grid-cols-[.9fr_1.1fr]">
            <article data-testid="tarjeta-universo-revelada" className="tarjeta-revelada relative mx-auto w-full max-w-[390px] overflow-hidden rounded-[2rem] border border-white/25 p-7 shadow-[0_30px_80px_rgba(0,0,0,.45)]" style={{ background: `linear-gradient(155deg, ${tarjeta.constelacion.colorSecundario}, ${tarjeta.constelacion.color} 42%, #082445 120%)` }}>
              <span className="absolute -right-14 -top-14 h-44 w-44 rounded-full border-[18px] border-white/10" />
              <span className="absolute bottom-14 right-8 h-2 w-2 rounded-full bg-white/80 shadow-[30px_-18px_0_#fff,54px_12px_0_rgba(255,255,255,.6),-18px_22px_0_rgba(255,255,255,.7)]" />
              <div className="relative flex items-center justify-between"><span className="grid h-12 w-12 place-items-center rounded-full bg-white/15 font-display text-xl font-extrabold">{tarjeta.constelacion.numero}</span><Sparkles className="text-white/75" /></div>
              <div className="relative mt-20">
                <p className="text-xs font-extrabold uppercase tracking-[.2em] text-white/70">{tarjeta.constelacion.nombre}</p>
                <h2 className="mt-3 font-display text-4xl font-extrabold leading-[.94]">{tarjeta.titulo}</h2>
                <p className="mt-5 text-lg leading-relaxed text-white/90">{tarjeta.mensaje}</p>
              </div>
              <div className="relative mt-8 border-t border-white/20 pt-5 text-xs font-bold uppercase tracking-[.17em] text-white/70">Explora · Conecta · Transforma</div>
            </article>

            <div className="rounded-[2rem] border border-white/15 bg-white/[.08] p-5 shadow-2xl backdrop-blur-xl sm:p-7">
              <div className="flex items-center gap-3 text-lime-300"><span className="grid h-11 w-11 place-items-center rounded-full bg-lime-300/15"><Compass /></span><div><p className="text-xs font-extrabold uppercase tracking-[.18em]">Misión estelar</p><p className="text-sm text-white/55">Lleva la tarjeta a tu realidad</p></div></div>
              <p className="mt-5 font-display text-[clamp(21px,3vw,29px)] font-bold leading-snug">{tarjeta.reto}</p>
              {completada ? (
                <div className="mt-6 rounded-2xl border border-lime-300/25 bg-lime-300/10 p-5">
                  <div className="flex items-center gap-2 font-extrabold text-lime-300"><CheckCircle2 /> Misión puesta en órbita</div>
                  <p className="mt-3 leading-relaxed text-white/85">“{reflexionGuardada}”</p>
                  {puntos > 0 && <span className="mt-4 inline-flex rounded-full bg-lime-300 px-4 py-2 text-sm font-extrabold text-[#082343]">+{puntos} puntos</span>}
                </div>
              ) : (
                <>
                  <label className="mt-6 block"><span className="text-sm font-extrabold text-cyan-100">Tu acción o reflexión</span><textarea data-testid="reflexion-universo" className="mt-2 min-h-32 w-full rounded-2xl border border-white/20 bg-[#061a36]/80 p-4 text-white outline-none placeholder:text-white/35 focus:border-lime-300 focus:ring-4 focus:ring-lime-300/10" maxLength={500} value={reflexion} onChange={(evento) => setReflexion(evento.target.value)} placeholder="Escribe la señal que quieres convertir en acción…" /></label>
                  <div className="mt-2 flex justify-between text-xs text-white/40"><span>Mínimo 8 caracteres</span><span>{reflexion.length}/500</span></div>
                  {error && <p role="alert" className="mt-4 rounded-xl bg-red-400/15 p-3 text-sm font-bold text-red-100">{error}</p>}
                  <button type="button" disabled={reflexion.trim().length < 8 || enviando} onClick={() => void guardar()} className="mt-5 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-lime-300 px-6 py-3 font-display font-extrabold text-[#082343] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">{enviando ? <LoaderCircle className="animate-spin" /> : <Send />} Poner mi misión en órbita</button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .universo-experiencia { background-image: radial-gradient(circle at 50% 45%, rgba(7, 118, 142, .2), transparent 32rem), linear-gradient(145deg, #06142f 0%, #071d42 58%, #031027 100%); }
        .estrella-universo { opacity: .28; animation: estrella-parpadea 2.8s ease-in-out infinite alternate; box-shadow: 0 0 10px white; }
        :global(.planeta-universo) { background: radial-gradient(circle at 30% 25%, rgba(255,255,255,.75) 0 4%, var(--planeta-b) 14%, var(--planeta-a) 58%, #171341 100%); box-shadow: 0 0 0 14px color-mix(in srgb, var(--planeta-a) 20%, transparent), 0 0 60px color-mix(in srgb, var(--planeta-b) 22%, transparent); }
        :global(.anillo-planeta) { transform: translate(-50%, -50%) rotate(-18deg); }
        .orbita-universo { transform: translate(-50%, -50%) rotate(-12deg); }
        .mazo-universo { perspective: 900px; }
        .barajando .carta-dorso { animation: barajar-carta 1.15s cubic-bezier(.2,.75,.2,1) both; }
        .tarjeta-revelada { animation: revelar-tarjeta .75s cubic-bezier(.18,.82,.22,1.18) both; }
        @keyframes estrella-parpadea { to { opacity: .95; transform: scale(1.4); } }
        @keyframes barajar-carta { 0% { transform: translate(0, 0) rotate(0); } 35% { transform: translate(calc((var(--indice, 1)) * 22px), -28px) rotate(12deg); } 70% { transform: translate(-20px, 15px) rotate(-8deg); } 100% { transform: translate(0, 0) rotate(360deg) scale(.92); opacity: .15; } }
        @keyframes revelar-tarjeta { from { opacity: 0; transform: translateY(28px) rotateY(85deg) scale(.85); } to { opacity: 1; transform: translateY(0) rotateY(0) scale(1); } }
      `}</style>
    </section>
  );
}
