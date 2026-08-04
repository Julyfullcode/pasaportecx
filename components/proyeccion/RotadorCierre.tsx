"use client";

import { useEffect, useState } from "react";
import { Heart, Lightbulb, Rocket, Sprout } from "lucide-react";
import { FotoCircular } from "@/components/marca/FotoCircular";
import { usePollingVisible } from "@/lib/usePollingVisible";
import type { TarjetaCierreProyeccion } from "@/lib/cosecha-proyeccion";

const INTERVALO_ROTACION_MS = 8_000;

export function RotadorCierre({ inicial }: { inicial: TarjetaCierreProyeccion[] }) {
  const [tarjetas, setTarjetas] = useState(inicial);
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    if (tarjetas.length < 2) return;
    const temporizador = window.setInterval(
      () => setIndice((actual) => (actual + 1) % tarjetas.length),
      INTERVALO_ROTACION_MS,
    );
    return () => window.clearInterval(temporizador);
  }, [tarjetas.length]);

  usePollingVisible(async () => {
    const respuesta = await fetch("/api/proyeccion/cierre", { cache: "no-store" });
    if (!respuesta.ok) return;
    const nuevas = (await respuesta.json()).tarjetas as TarjetaCierreProyeccion[];
    setTarjetas(nuevas);
    setIndice((actual) => nuevas.length ? Math.min(actual, nuevas.length - 1) : 0);
  }, 3_000);

  const tarjeta = tarjetas[indice];
  if (!tarjeta) {
    return (
      <div className="grid h-full place-items-center text-center">
        <div>
          <Sprout className="mx-auto text-[var(--epm-verde)]" size={72} />
          <h2 className="mt-5 font-display text-[clamp(30px,4vw,58px)] font-extrabold">Esperando las primeras tarjetas</h2>
          <p className="mt-3 text-[clamp(15px,1.5vw,24px)] text-white/70">Aparecerán aquí a medida que las personas completen el desafío de cierre.</p>
        </div>
      </div>
    );
  }

  const bloques = [
    { titulo: "Me llevo", texto: tarjeta.respuestas.meLlevo, Icono: Lightbulb, clase: "from-sky-500/25 to-cyan-400/10 border-sky-300/30" },
    { titulo: "Agradezco", texto: tarjeta.respuestas.agradezco, Icono: Heart, clase: "from-rose-500/25 to-amber-400/10 border-rose-300/30" },
    { titulo: "Activo", texto: tarjeta.respuestas.activo, Icono: Rocket, clase: "from-emerald-500/25 to-lime-400/10 border-emerald-300/30" },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col py-[clamp(12px,2vh,24px)]">
      <div className="mb-3 flex shrink-0 items-center justify-between gap-4">
        <p className="text-[clamp(13px,1.2vw,20px)] font-bold text-white/70">Cosecha, gratitud y celebración</p>
        <span className="rounded-full bg-white/15 px-4 py-2 text-[clamp(11px,1vw,16px)] font-extrabold">{indice + 1} de {tarjetas.length} tarjetas</span>
      </div>
      <article key={tarjeta.id + "-" + indice} className="entrada-suave grid min-h-0 flex-1 overflow-hidden rounded-[clamp(24px,3vw,44px)] border border-white/20 bg-white/10 p-[clamp(18px,2.4vw,38px)] shadow-2xl backdrop-blur md:grid-cols-[minmax(230px,.52fr)_minmax(0,1.48fr)]">
        <div className="flex min-h-0 flex-col items-center justify-center border-b border-white/15 pb-5 text-center md:border-b-0 md:border-r md:pb-0 md:pr-[clamp(20px,3vw,48px)]">
          <FotoCircular src={tarjeta.participante.urlFoto} alt={"Foto de " + tarjeta.participante.nombre} className="h-[clamp(130px,18vw,270px)] w-[clamp(130px,18vw,270px)] border-4" />
          <h2 className="mt-5 font-display text-[clamp(24px,3vw,46px)] font-extrabold leading-tight">{tarjeta.participante.nombre}</h2>
          <p className="mt-2 text-[clamp(13px,1.25vw,20px)] font-bold text-white/70">{tarjeta.participante.empresa.nombre}</p>
        </div>
        <div className="grid min-h-0 gap-[clamp(10px,1.4vw,20px)] pt-5 md:pl-[clamp(20px,3vw,48px)] md:pt-0">
          {bloques.map(({ titulo, texto, Icono, clase }) => (
            <section key={titulo} className={"min-h-0 overflow-hidden rounded-[clamp(16px,1.7vw,26px)] border bg-gradient-to-r p-[clamp(13px,1.5vw,24px)] " + clase}>
              <h3 className="flex items-center gap-2 font-display text-[clamp(16px,1.6vw,25px)] font-extrabold text-[var(--epm-verde)]"><Icono size={24} /> {titulo}</h3>
              <p className="mt-2 line-clamp-4 text-[clamp(15px,1.55vw,25px)] font-bold leading-snug text-white">{texto}</p>
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
