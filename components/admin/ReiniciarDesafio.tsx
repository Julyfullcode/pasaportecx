"use client";

import { RotateCcw } from "lucide-react";
import { reiniciarDesafio } from "@/app/admin/actions";

export function ReiniciarDesafio({ id, respuestas }: { id: string; respuestas: number }) {
  return (
    <form
      action={reiniciarDesafio}
      onSubmit={(evento) => {
        const detalle = respuestas
          ? `Se eliminarán ${respuestas} respuesta${respuestas === 1 ? "" : "s"}, los puntos otorgados y las evidencias asociadas.`
          : "Este desafío todavía no tiene respuestas.";
        if (!window.confirm(`${detalle} La configuración y el estado del desafío se conservarán. ¿Deseas continuar?`)) {
          evento.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className="flex items-center gap-1 text-sm font-extrabold text-amber-700">
        <RotateCcw size={15} /> Reiniciar respuestas
      </button>
    </form>
  );
}
