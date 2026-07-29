"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function ActualizacionEnVivo() {
  const router = useRouter();
  useEffect(() => {
    let intervalo: ReturnType<typeof setInterval> | undefined;
    const fuente = new EventSource("/api/stream");
    fuente.onmessage = (evento) => {
      const datos = JSON.parse(evento.data) as { tipo: string };
      if (datos.tipo !== "conectado") router.refresh();
    };
    fuente.onerror = () => {
      fuente.close();
      intervalo = setInterval(() => router.refresh(), 5_000);
    };
    return () => {
      fuente.close();
      if (intervalo) clearInterval(intervalo);
    };
  }, [router]);
  return <span className="inline-flex items-center gap-2 text-xs font-bold text-slate-500"><span className="h-2 w-2 animate-pulse rounded-full bg-[var(--epm-verde-medio)]" /> En vivo</span>;
}
