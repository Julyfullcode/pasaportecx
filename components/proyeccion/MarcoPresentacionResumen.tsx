"use client";

import { useCallback, useEffect, useState } from "react";
import { RotateCw } from "lucide-react";

const ANCHO_PC_MOVIL = 1920;
const ALTO_PC_MOVIL = 900;

type AjusteLienzo = {
  escala: number;
  anchoDisponible: number;
  altoDisponible: number;
  anchoLienzo: number;
  altoLienzo: number;
};

function medirLienzo(): AjusteLienzo {
  // El viewport visual cambia continuamente durante el gesto de pellizco.
  // Usamos el viewport de diseño para que el zoom no reajuste el lienzo.
  const anchoDisponible = window.innerWidth;
  const altoDisponible = window.innerHeight;
  const esCelularHorizontal = altoDisponible <= 600 && anchoDisponible <= 1100;
  const anchoLienzo = esCelularHorizontal ? ANCHO_PC_MOVIL : anchoDisponible;
  const altoLienzo = esCelularHorizontal ? ALTO_PC_MOVIL : altoDisponible;
  return {
    escala: Math.min(anchoDisponible / anchoLienzo, altoDisponible / altoLienzo),
    anchoDisponible,
    altoDisponible,
    anchoLienzo,
    altoLienzo,
  };
}

export function MarcoPresentacionResumen() {
  const [ajuste, setAjuste] = useState<AjusteLienzo>({ escala: 0, anchoDisponible: 0, altoDisponible: 0, anchoLienzo: 0, altoLienzo: 0 });

  const actualizar = useCallback(() => setAjuste((actual) => {
    const siguiente = medirLienzo();
    return actual.escala === siguiente.escala
      && actual.anchoDisponible === siguiente.anchoDisponible
      && actual.altoDisponible === siguiente.altoDisponible
      ? actual
      : siguiente;
  }), []);

  useEffect(() => {
    actualizar();
    window.addEventListener("resize", actualizar);
    screen.orientation?.addEventListener("change", actualizar);
    return () => {
      window.removeEventListener("resize", actualizar);
      screen.orientation?.removeEventListener("change", actualizar);
    };
  }, [actualizar]);

  async function activarHorizontal() {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      const orientacion = screen.orientation as ScreenOrientation & { lock?: (modo: "landscape") => Promise<void> };
      await orientacion.lock?.("landscape");
    } catch {
      // iOS no ofrece bloqueo de orientación: el aviso permanece hasta girar físicamente el equipo.
    }
  }

  return (
    <main className="fixed inset-0 overflow-hidden bg-[var(--epm-azul-profundo)]" style={{ touchAction: "pan-x pan-y pinch-zoom" }}>
      <iframe
        src="/admin/proyeccion/resumen?lienzo=1"
        title="Presentación final del evento"
        allow="fullscreen"
        allowFullScreen
        scrolling="no"
        className="absolute left-1/2 top-1/2 border-0 bg-[var(--epm-azul-profundo)] shadow-2xl"
        style={{
          width: ajuste.anchoLienzo,
          height: ajuste.altoLienzo,
          transform: `translate(-50%, -50%) scale(${ajuste.escala})`,
          transformOrigin: "center",
          opacity: ajuste.escala > 0 ? 1 : 0,
          touchAction: "pan-x pan-y pinch-zoom",
        }}
      />
      <div className="aviso-orientacion-marco absolute inset-0 z-20 hidden place-items-center bg-[var(--epm-azul-profundo)] p-7 text-center text-white">
        <div className="max-w-sm">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[var(--epm-verde)] text-[var(--epm-azul-profundo)]"><RotateCw size={40} /></div>
          <h1 className="mt-6 font-display text-3xl font-extrabold">Gira tu celular</h1>
          <p className="mt-3 text-white/70">Esta presentación está diseñada para verse horizontalmente.</p>
          <button type="button" onClick={() => void activarHorizontal()} className="mt-6 rounded-full border border-white/25 bg-white/10 px-6 py-3 font-extrabold">Intentar modo horizontal</button>
        </div>
      </div>
      <span className="sr-only" aria-live="polite">Lienzo ajustado a {Math.round(ajuste.anchoDisponible)} por {Math.round(ajuste.altoDisponible)} píxeles.</span>
      <style jsx global>{`
        @media (orientation: portrait) and (max-width: 900px) {
          .aviso-orientacion-marco { display: grid; }
        }
      `}</style>
    </main>
  );
}
