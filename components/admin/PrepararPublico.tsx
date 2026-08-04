"use client";

import { useActionState, useState } from "react";
import { LoaderCircle, ShieldAlert, Trash2 } from "lucide-react";
import {
  prepararAplicacionPublico,
  type EstadoPreparacionPublico,
} from "@/app/admin/actions";

const FRASE = "PREPARAR PARA PUBLICO REAL";
const INICIAL: EstadoPreparacionPublico = { tipo: "inicial", mensaje: "" };

type Resumen = {
  participantes: number;
  completitudes: number;
  recuerdos: number;
  puntos: number;
};

export function PrepararPublico({ resumen }: { resumen: Resumen }) {
  const [primera, setPrimera] = useState("");
  const [segunda, setSegunda] = useState("");
  const [estado, accion, pendiente] = useActionState(prepararAplicacionPublico, INICIAL);
  const valido = primera === FRASE && segunda === FRASE;

  return (
    <div className="mt-4 space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Dato etiqueta="Participantes" valor={resumen.participantes} />
        <Dato etiqueta="Respuestas" valor={resumen.completitudes} />
        <Dato etiqueta="Recuerdos" valor={resumen.recuerdos} />
        <Dato etiqueta="Puntos acumulados" valor={resumen.puntos} />
      </div>
      <div className="rounded-2xl border border-red-200 bg-white/75 p-4 text-sm text-red-950">
        <p className="flex items-start gap-2 font-extrabold"><ShieldAlert className="mt-0.5 shrink-0" size={20} /> Esta acción es irreversible.</p>
        <p className="mt-2">Elimina participantes, sesiones, respuestas, puntos y ajustes, recuerdos, reacciones, fotos y evidencias.</p>
        <p className="mt-2 font-bold text-emerald-800">Conserva desafíos, agenda, equipos, empresas, componentes, ubicaciones, configuración del evento y administradores.</p>
      </div>
      <form action={accion} className="space-y-3">
        <p className="text-sm text-red-800">Para confirmar, escribe <strong>{FRASE}</strong> en los dos campos.</p>
        <input className="campo" name="confirmacionUno" value={primera} onChange={(evento) => setPrimera(evento.target.value)} autoComplete="off" placeholder="Primera confirmación" />
        <input className="campo" name="confirmacionDos" value={segunda} onChange={(evento) => setSegunda(evento.target.value)} autoComplete="off" placeholder="Segunda confirmación" />
        <button disabled={!valido || pendiente} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-red-700 px-4 font-extrabold text-white disabled:opacity-40">
          {pendiente ? <LoaderCircle className="animate-spin" size={20} /> : <Trash2 size={20} />}
          {pendiente ? "Eliminando datos de prueba…" : "Preparar para público real"}
        </button>
      </form>
      {estado.tipo !== "inicial" && (
        <div role="status" className={`rounded-2xl p-4 text-sm font-bold ${estado.tipo === "exito" ? "bg-emerald-50 text-emerald-900" : "bg-red-100 text-red-900"}`}>
          <p>{estado.mensaje}</p>
          {estado.eliminados && (
            <p className="mt-2 font-medium">Se eliminaron {estado.eliminados.participantes} participantes, {estado.eliminados.completitudes} respuestas, {estado.eliminados.recuerdos} recuerdos y {estado.eliminados.archivos} archivos.</p>
          )}
        </div>
      )}
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return <div className="rounded-xl bg-white p-3 text-center shadow-sm"><strong className="block text-2xl text-red-900">{valor.toLocaleString("es-CO")}</strong><span className="text-xs font-bold text-slate-500">{etiqueta}</span></div>;
}
