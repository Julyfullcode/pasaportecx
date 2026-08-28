"use client";

import Link from "next/link";
import { IdCard, Orbit, Sparkles } from "lucide-react";
import type { PlanetaArquetipo, PlanetaId } from "@/lib/universo-arquetipos";

export function MapaEstelar({ planetas, progreso, arquetipo }: { planetas: PlanetaArquetipo[]; progreso: Record<PlanetaId, { completados: number; total: number }>; arquetipo: PlanetaId }) {
  return <main className="fixed inset-0 z-[60] h-dvh overflow-hidden bg-[#06132d]">
    <div className="absolute left-5 top-5 z-30 sm:left-8 sm:top-7"><p className="text-xs font-extrabold uppercase tracking-[.22em] text-lime-300">El Universo de la Experiencia</p><h1 className="mt-1 font-display text-[clamp(25px,4vw,42px)] font-extrabold">Mapa estelar</h1><p className="mt-1 max-w-sm text-sm text-white/55">Elige un planeta. Cada reto completado ilumina su órbita.</p></div>
    <Link href="/universo/tarjeta" className="absolute right-5 top-5 z-30 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-extrabold backdrop-blur sm:right-8 sm:top-7"><IdCard size={18} /> <span className="hidden sm:inline">Mi arquetipo</span></Link>
    <div className="absolute left-1/2 top-[54%] aspect-square w-[min(96vw,88vh)] -translate-x-1/2 -translate-y-1/2 sm:top-1/2">
      <div className="absolute left-1/2 top-1/2 z-20 grid h-[18%] w-[18%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[radial-gradient(circle_at_35%_28%,#f5ffd4,#8DB63F_24%,#005E7D_63%,#071a38)] text-center shadow-[0_0_70px_rgba(195,224,90,.3)]"><span><Sparkles className="mx-auto h-5 w-5 sm:h-7 sm:w-7" /><strong className="mt-1 hidden font-display text-sm leading-none sm:block">Experiencia<br />del Cliente</strong></span></div>
      {planetas.map((planeta, indice) => {
        const avance = progreso[planeta.id]; const porcentaje = avance.total ? avance.completados / avance.total * 100 : 0; const tamano = 36 + indice * 13;
        return <div key={planeta.id} className="orbita-mapa absolute left-1/2 top-1/2" style={{ width: `${tamano}%`, height: `${tamano * .58}%`, transform: `translate(-50%,-50%) rotate(${indice % 2 ? 8 : -8}deg)`, zIndex: 15 - indice }}>
          <svg aria-hidden="true" className="absolute inset-0 h-full w-full overflow-visible"><ellipse cx="50%" cy="50%" rx="49%" ry="48%" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="1.5" /><ellipse cx="50%" cy="50%" rx="49%" ry="48%" fill="none" pathLength="100" stroke={planeta.color} strokeWidth="2.8" strokeDasharray={`${porcentaje} 100`} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 7px ${planeta.color})`, transition: "stroke-dasharray .7s ease" }} /></svg>
          <Link href={`/universo/planeta/${planeta.id}`} className="planeta-en-orbita absolute grid h-[clamp(58px,8vw,92px)] w-[clamp(58px,8vw,92px)] place-items-center rounded-full text-center shadow-2xl transition hover:scale-110 focus:scale-110" style={{ offsetPath: "ellipse(49% 48% at 50% 50%)", offsetDistance: `${8 + indice * 17}%`, animationDuration: `${38 + indice * 13}s`, background: `radial-gradient(circle at 32% 25%,#fff 0 3%,${planeta.color} 12%,${planeta.colorProfundo} 66%,#060815 100%)`, boxShadow: `0 0 ${18 + porcentaje / 4}px ${planeta.color}66`, transform: `rotate(${indice % 2 ? -8 : 8}deg)` }}><span><strong className="block font-display text-[10px] leading-tight sm:text-xs">{planeta.nombre}</strong><small className="mt-0.5 block text-[9px] font-extrabold text-white/70">{avance.completados}/{avance.total}</small>{planeta.id === arquetipo && <i className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-lime-300 text-[9px] not-italic text-[#071a38]">★</i>}</span></Link>
        </div>;
      })}
    </div>
    <div className="absolute bottom-5 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/12 bg-[#071a38]/75 px-4 py-2 text-xs font-bold text-white/55 backdrop-blur"><Orbit className="mr-2 inline text-cyan-300" size={16} /> {Object.values(progreso).reduce((total, item) => total + item.completados, 0)} retos completados</div>
    <style jsx>{`.planeta-en-orbita{animation:orbitar linear infinite}@keyframes orbitar{to{offset-distance:calc(var(--inicio,0%) + 100%)}}@media(prefers-reduced-motion:reduce){.planeta-en-orbita{animation:none}}`}</style>
  </main>;
}
