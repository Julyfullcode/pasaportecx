"use client";

import { useEffect, useMemo, useState } from "react";

const rutas: Record<string, string> = {
  asistentes: "/admin/proyeccion/asistentes",
  recuerdos: "/admin/proyeccion/recuerdos",
  podio: "/admin/proyeccion/podio",
  cierre: "/admin/proyeccion/cierre",
};

export function Mixto({ ciclo }: { ciclo: string }) {
  const pasos = useMemo(
    () =>
      ciclo
        .split(",")
        .map((parte) => {
          const [nombre, segundos] = parte.trim().split(":");
          return { nombre, segundos: Math.max(5, Number(segundos) || 30) };
        })
        .filter((paso) => rutas[paso.nombre]),
    [ciclo],
  );
  const [actual, setActual] = useState(0);
  useEffect(() => {
    if (!pasos.length) return;
    const temporizador = setTimeout(() => setActual((valor) => (valor + 1) % pasos.length), pasos[actual]?.segundos * 1000);
    return () => clearTimeout(temporizador);
  }, [actual, pasos]);
  const paso = pasos[actual] ?? { nombre: "asistentes", segundos: 60 };
  return <iframe key={`${paso.nombre}-${actual}`} src={rutas[paso.nombre]} title={`Proyección ${paso.nombre}`} className="fixed inset-0 h-screen w-screen border-0 bg-[var(--epm-azul-profundo)]" />;
}
