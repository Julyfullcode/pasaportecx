"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock3, LoaderCircle, RefreshCw, ScanLine, ShieldCheck } from "lucide-react";

type DatosQr = {
  qr: string;
  vigenciaMs: number;
};

export function QrPuntualidadDinamico({
  desafioId,
  inicial,
  hora,
}: {
  desafioId: string;
  inicial: DatosQr;
  hora: string;
}) {
  const [datos, setDatos] = useState(inicial);
  const [venceLocal, setVenceLocal] = useState(() => Date.now() + inicial.vigenciaMs);
  const [segundos, setSegundos] = useState(() => Math.max(1, Math.ceil(inicial.vigenciaMs / 1000)));
  const [error, setError] = useState("");

  const actualizar = useCallback(async () => {
    try {
      const respuesta = await fetch(`/api/admin/desafios/${desafioId}/qr-puntualidad`, { cache: "no-store" });
      if (!respuesta.ok) throw new Error("No fue posible renovar el QR");
      const nuevos = await respuesta.json() as DatosQr;
      setDatos(nuevos);
      setVenceLocal(Date.now() + nuevos.vigenciaMs);
      setError("");
    } catch {
      setError("No pudimos renovar el código. Reintentando…");
      setVenceLocal(Date.now() + 2_000);
    }
  }, [desafioId]);

  useEffect(() => {
    const temporizador = window.setTimeout(() => void actualizar(), Math.max(500, venceLocal - Date.now() + 120));
    return () => window.clearTimeout(temporizador);
  }, [actualizar, venceLocal]);

  useEffect(() => {
    const intervalo = window.setInterval(() => {
      setSegundos(Math.max(0, Math.ceil((venceLocal - Date.now()) / 1000)));
    }, 250);
    return () => window.clearInterval(intervalo);
  }, [venceLocal]);

  return (
    <section className="grid h-full min-h-0 items-center gap-[clamp(18px,3vw,54px)] py-[clamp(18px,3vh,42px)] lg:grid-cols-[minmax(0,1fr)_minmax(360px,.72fr)]">
      <div className="min-w-0">
        <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[clamp(12px,1.1vw,17px)] font-extrabold uppercase tracking-[.15em] text-[var(--epm-verde)]"><Clock3 size={20} /> Llegada a tiempo</p>
        <h2 className="mt-5 font-display text-[clamp(38px,5.6vw,82px)] font-extrabold leading-[.98]">Escanea y registra <span className="block text-[var(--epm-verde)]">tu llegada</span></h2>
        <p className="mt-6 max-w-3xl text-[clamp(16px,1.65vw,25px)] leading-relaxed text-white/80">Abre el desafío en tu celular, permite el uso de la cámara y apunta al código que está en pantalla.</p>
        <div className="mt-7 flex flex-wrap gap-3 text-[clamp(12px,1.1vw,17px)] font-bold">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-3"><ShieldCheck size={20} /> QR seguro y temporal</span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-3"><RefreshCw size={20} /> Cambia cada 15 segundos</span>
        </div>
        <p className="mt-6 text-[clamp(14px,1.25vw,19px)] font-extrabold text-white/75">Hora configurada: <span className="text-white">{hora}</span></p>
      </div>

      <div className="mx-auto w-full max-w-[min(58vh,590px)] rounded-[clamp(24px,3vw,42px)] bg-white p-[clamp(15px,2vw,27px)] text-center text-[var(--epm-azul-profundo)] shadow-2xl">
        <div className="flex items-center justify-between gap-3 px-2">
          <span className="inline-flex items-center gap-2 font-display text-[clamp(17px,1.7vw,25px)] font-extrabold"><ScanLine /> Escanea ahora</span>
          <span className="grid h-12 w-12 place-items-center rounded-full bg-sky-50 font-display text-xl font-extrabold text-[var(--epm-azul)]">{segundos}</span>
        </div>
        <div className="relative mt-3 aspect-square overflow-hidden rounded-3xl border border-slate-100 bg-white p-2 shadow-inner">
          <img src={datos.qr} alt="Código QR dinámico para registrar la llegada a tiempo" className="h-full w-full object-contain" />
          {error && <div className="absolute inset-x-3 bottom-3 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-800">{error}</div>}
        </div>
        <p className="mt-3 flex items-center justify-center gap-2 text-sm font-bold text-slate-500">{error ? <LoaderCircle className="animate-spin" size={17} /> : <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />} Renovación automática activa</p>
      </div>
    </section>
  );
}
