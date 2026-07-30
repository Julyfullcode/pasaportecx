"use client";

import { useEffect, useRef } from "react";

export function usePollingVisible(
  actualizar: () => void | Promise<void>,
  intervaloMs: number,
) {
  const actualizarRef = useRef(actualizar);
  actualizarRef.current = actualizar;

  useEffect(() => {
    let ejecutando = false;
    let cancelado = false;

    const ejecutar = async () => {
      if (cancelado || ejecutando || document.visibilityState !== "visible") return;
      ejecutando = true;
      try {
        await actualizarRef.current();
      } catch {
        // La siguiente ejecución reintenta; evita errores no controlados si cambia la red.
      } finally {
        ejecutando = false;
      }
    };

    const alVolver = () => {
      if (document.visibilityState === "visible") void ejecutar();
    };
    const temporizador = window.setInterval(() => void ejecutar(), intervaloMs);
    window.addEventListener("focus", alVolver);
    document.addEventListener("visibilitychange", alVolver);

    return () => {
      cancelado = true;
      window.clearInterval(temporizador);
      window.removeEventListener("focus", alVolver);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [intervaloMs]);
}
