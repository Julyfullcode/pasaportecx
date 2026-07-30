"use client";

import { useState } from "react";
import { Medal, Users } from "lucide-react";
import { FotoCircular } from "@/components/marca/FotoCircular";
import { usePollingVisible } from "@/lib/usePollingVisible";

type Datos = {
  configuracion: {
    tamanoPodioIndividual: number;
    tamanoPodioEquipos: number;
    metodoPuntajeEquipo: "PROMEDIO" | "SUMA";
  };
  individual: {
    id: string;
    nombre: string;
    urlFoto: string;
    puntosTotales: number;
    empresa: { nombre: string };
    grupo: { nombre: string; colorHex: string };
  }[];
  equipos: {
    id: string;
    nombre: string;
    colorHex: string;
    integrantes: number;
    puntaje: number;
  }[];
};

export function RankingTiempoReal({
  inicial,
  participanteId,
}: {
  inicial: Datos;
  participanteId: string;
}) {
  const [datos, setDatos] = useState(inicial);
  const [pestana, setPestana] = useState<"individual" | "equipos">("individual");
  usePollingVisible(async () => {
    const respuesta = await fetch("/api/ranking", { cache: "no-store" });
    if (respuesta.ok) setDatos(await respuesta.json());
  }, 10_000);
  return (
    <>
      <div className="mt-5 grid grid-cols-2 rounded-full bg-white p-1 shadow-soft">
        <button onClick={() => setPestana("individual")} className={`rounded-full font-extrabold ${pestana === "individual" ? "bg-[var(--epm-azul)] text-white" : "text-slate-500"}`}>Individual</button>
        <button onClick={() => setPestana("equipos")} className={`rounded-full font-extrabold ${pestana === "equipos" ? "bg-[var(--epm-azul)] text-white" : "text-slate-500"}`}>Equipos</button>
      </div>
      {pestana === "individual" ? (
        <div className="mt-5 space-y-2">
          {datos.individual.map((persona, indice) => (
            <div key={persona.id} className={`tarjeta flex items-center gap-3 p-3 ${persona.id === participanteId ? "ring-2 ring-[var(--epm-azul)]" : ""}`}>
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-display font-extrabold ${indice < 3 ? "bg-[var(--epm-azul-profundo)] text-[var(--epm-verde)]" : "bg-slate-100 text-slate-500"}`}>{indice + 1}</span>
              <FotoCircular src={persona.urlFoto} alt={`Foto de ${persona.nombre}`} className="h-12 w-12" />
              <div className="min-w-0 flex-1">
                <strong className="block truncate text-[var(--epm-azul-profundo)]">{persona.nombre}{persona.id === participanteId ? " · Tú" : ""}</strong>
                <p className="truncate text-xs text-slate-500">{persona.empresa.nombre} · <span style={{ color: persona.grupo.colorHex }}>{persona.grupo.nombre}</span></p>
              </div>
              <strong className="text-lg text-[var(--epm-azul-profundo)]">{persona.puntosTotales.toLocaleString("es-CO")}</strong>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-5">
          <div className="mb-4 rounded-2xl bg-[var(--epm-azul-profundo)] p-4 text-sm text-white">
            <strong className="block">Criterio vigente: {datos.configuracion.metodoPuntajeEquipo === "PROMEDIO" ? "promedio por integrante activo" : "suma total"}</strong>
            <span className="text-white/75">{datos.configuracion.metodoPuntajeEquipo === "PROMEDIO" ? "El total del equipo se divide por sus integrantes activos." : "Se suman todos los puntos de sus integrantes activos."}</span>
          </div>
          <div className="space-y-3">
            {datos.equipos.map((equipo, indice) => (
              <div key={equipo.id} className="tarjeta overflow-hidden">
                <div className="flex items-center gap-3 p-4">
                  <span className="grid h-11 w-11 place-items-center rounded-full text-white" style={{ background: equipo.colorHex }}>{indice < 3 ? <Medal /> : indice + 1}</span>
                  <div className="flex-1"><strong className="text-lg text-[var(--epm-azul-profundo)]">{equipo.nombre}</strong><p className="flex items-center gap-1 text-xs text-slate-500"><Users size={14} /> {equipo.integrantes} integrantes</p></div>
                  <strong className="font-display text-2xl text-[var(--epm-azul-profundo)]">{equipo.puntaje.toLocaleString("es-CO")}</strong>
                </div>
                <div className="h-1.5" style={{ background: equipo.colorHex }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
