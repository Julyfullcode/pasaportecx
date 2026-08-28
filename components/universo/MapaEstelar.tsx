"use client";

import Link from "next/link";
import { ArrowUpRight, Check, IdCard, Layers3, Sparkles, Telescope } from "lucide-react";
import type { PlanetaArquetipo, PlanetaId } from "@/lib/universo-arquetipos";

export function MapaEstelar({ planetas, progreso, arquetipo }: { planetas: PlanetaArquetipo[]; progreso: Record<PlanetaId, { completados: number; total: number }>; arquetipo: PlanetaId }) {
  const completados = Object.values(progreso).reduce((total, item) => total + item.completados, 0);
  const totalRetos = Object.values(progreso).reduce((total, item) => total + item.total, 0);
  const inclinaciones = [-2.4, 1.3, -1.1, 1.8, -1.8];

  return <main className="fixed inset-0 z-[60] overflow-y-auto bg-[#041027] text-white">
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
      <span className="absolute inset-0 opacity-35 [background-image:radial-gradient(circle_at_20%_20%,rgba(63,214,168,.38),transparent_22rem),radial-gradient(circle_at_82%_28%,rgba(111,182,255,.26),transparent_24rem),linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] [background-size:auto,auto,42px_42px,42px_42px]" />
      {Array.from({ length: 28 }, (_, indice) => <i key={indice} className="absolute rounded-full bg-white shadow-[0_0_9px_white]" style={{ left: `${(indice * 37) % 97}%`, top: `${(indice * 61) % 93}%`, width: indice % 5 === 0 ? 3 : 1.5, height: indice % 5 === 0 ? 3 : 1.5, opacity: .18 + (indice % 4) * .12 }} />)}
    </div>

    <div className="relative mx-auto flex min-h-dvh w-full max-w-[1500px] flex-col px-5 py-6 sm:px-8 sm:py-8">
      <header className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[.22em] text-lime-300">El Universo de la Experiencia</p>
          <h1 className="mt-2 font-display text-[clamp(34px,5vw,58px)] font-extrabold leading-none">Mapa estelar</h1>
          <p className="mt-3 max-w-2xl text-[clamp(15px,1.5vw,19px)] leading-relaxed text-white/62">Elige la tarjeta que quieras tomar. Cada una abre una perspectiva distinta para transformar la experiencia.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[.07] px-4 py-2.5 text-sm font-bold text-white/70"><Sparkles className="text-lime-300" size={18} /> {completados}/{totalRetos} retos</span>
          <Link href="/universo/galaxia" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-lime-300/25 bg-lime-300/10 px-4 py-2.5 text-sm font-extrabold text-lime-200"><Telescope size={18} /> Ver Galaxia Colectiva</Link>
          <Link href="/universo/tarjeta" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-extrabold backdrop-blur"><IdCard size={18} /> Mi tarjeta</Link>
        </div>
      </header>

      <section data-testid="organizador-tarjetas" className="relative my-auto py-9 sm:py-12">
        <div className="mx-auto max-w-[1380px] rounded-[2.5rem] border border-white/12 bg-[linear-gradient(155deg,rgba(21,67,94,.78),rgba(5,24,51,.92))] p-4 shadow-[0_38px_100px_rgba(0,0,0,.48)] backdrop-blur-xl sm:p-7">
          <div className="mb-5 flex items-center justify-between gap-4 px-2 sm:px-3">
            <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-lime-300 text-[#071a38]"><Layers3 size={22} /></span><div><h2 className="font-display text-xl font-extrabold sm:text-2xl">Organizador de experiencias</h2><p className="text-xs text-white/48 sm:text-sm">Toma una tarjeta para comenzar</p></div></div>
            <span className="hidden text-xs font-extrabold uppercase tracking-[.2em] text-white/35 sm:block">5 perspectivas · una experiencia</span>
          </div>

          <div className="organizador-scroll overflow-x-auto px-2 pb-4 pt-3 sm:px-3">
            <div className="flex min-w-[1040px] items-end gap-4 xl:min-w-0">
              {planetas.map((planeta, indice) => {
                const avance = progreso[planeta.id];
                const porcentaje = avance.total ? Math.round(avance.completados / avance.total * 100) : 0;
                const esInicial = planeta.id === arquetipo;
                return <Link key={planeta.id} href={`/universo/planeta/${planeta.id}`} aria-label={`Tomar tarjeta ${planeta.nombre}`} className="tarjeta-selector group relative z-10 flex min-h-[410px] min-w-[190px] flex-1 basis-0 flex-col overflow-hidden rounded-[1.7rem] border p-5 shadow-[0_24px_55px_rgba(0,0,0,.38)] outline-none transition duration-300 hover:z-30 hover:-translate-y-5 hover:rotate-0 hover:scale-[1.035] focus-visible:z-30 focus-visible:-translate-y-5 focus-visible:ring-4 focus-visible:ring-lime-300/50 sm:min-h-[440px] sm:p-6" style={{ background: `linear-gradient(155deg,${planeta.colorProfundo},#071a38 58%,#02060e)`, borderColor: esInicial ? planeta.color : "rgba(255,255,255,.18)", transform: `rotate(${inclinaciones[indice]}deg)`, boxShadow: esInicial ? `0 26px 65px ${planeta.color}38` : "0 24px 55px rgba(0,0,0,.38)" }}>
                  <span aria-hidden="true" className="absolute -right-16 -top-16 h-48 w-48 rounded-full border-[22px] opacity-25 transition duration-500 group-hover:scale-110" style={{ borderColor: planeta.color }} />
                  <span aria-hidden="true" className="absolute right-5 top-24 h-px w-24 rotate-[-32deg] opacity-35" style={{ background: planeta.color, boxShadow: `24px 22px 0 ${planeta.color},-18px 42px 0 ${planeta.color}` }} />
                  <div className="relative flex items-start justify-between gap-3"><span className="grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-white/10 font-display text-lg font-extrabold">{planeta.numero}</span>{esInicial && <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-[#071a38]" style={{ background: planeta.color }}><Sparkles size={11} /> Tu inicial</span>}</div>
                  <div className="relative mt-auto pt-24">
                    <p className="text-[10px] font-extrabold uppercase tracking-[.18em]" style={{ color: planeta.color }}>{planeta.tema}</p>
                    <h3 className="mt-2 font-display text-[clamp(23px,2.2vw,32px)] font-extrabold leading-[.96]">{planeta.nombre}</h3>
                    <p className="mt-3 text-sm font-bold leading-snug text-white/65">{planeta.arquetipo}</p>
                    <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full transition-all duration-700" style={{ width: `${porcentaje}%`, background: planeta.color, boxShadow: `0 0 12px ${planeta.color}` }} /></div>
                    <div className="mt-2 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-white/45"><span>{avance.completados}/{avance.total} retos</span>{porcentaje === 100 && <span className="inline-flex items-center gap-1" style={{ color: planeta.color }}><Check size={12} /> Completa</span>}</div>
                    <span className="mt-5 flex items-center justify-between border-t border-white/12 pt-4 text-xs font-extrabold uppercase tracking-[.14em] text-white/85">Tomar tarjeta <ArrowUpRight className="transition group-hover:-translate-y-1 group-hover:translate-x-1" size={18} /></span>
                  </div>
                </Link>;
              })}
            </div>
          </div>

          <div aria-hidden="true" className="relative z-20 -mt-12 h-20 rounded-[1.6rem] border border-white/15 bg-[linear-gradient(180deg,rgba(25,87,105,.96),rgba(5,35,63,.98))] shadow-[0_-8px_30px_rgba(0,0,0,.25),0_20px_36px_rgba(0,0,0,.35)]"><span className="absolute inset-x-7 top-4 h-px bg-white/15" /><span className="absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-extrabold uppercase tracking-[.25em] text-white/30">Explora · conecta · transforma</span></div>
        </div>
      </section>
    </div>

    <style jsx>{`.organizador-scroll{scrollbar-width:thin;scrollbar-color:rgba(195,224,90,.55) rgba(255,255,255,.08)}.tarjeta-selector{transform-origin:center bottom}`}</style>
  </main>;
}
