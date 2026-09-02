"use client";

import { RotateCcw } from "lucide-react";
import { reiniciarActividad } from "@/app/admin/(privado)/actividades/actions";

export function ReiniciarActividad({ id, etiqueta = "Reiniciar respuestas", totalRespuestas, destacado = false }: { id: string; etiqueta?: string; totalRespuestas?: number; destacado?: boolean }) {
  const sinRespuestas = totalRespuestas === 0;
  const confirmacion = totalRespuestas === undefined
    ? "Se eliminarán todas las respuestas y los puntos otorgados por esta actividad. La configuración se conservará. ¿Deseas continuar?"
    : `Se eliminarán ${totalRespuestas} ${totalRespuestas === 1 ? "respuesta" : "respuestas"}, los avances y los puntos otorgados por esta actividad. La configuración se conservará y la actividad quedará en borrador. ¿Deseas continuar?`;
  return <form action={reiniciarActividad} onSubmit={(evento) => { if (!window.confirm(confirmacion)) evento.preventDefault(); }}><input type="hidden" name="id" value={id} /><button type="submit" disabled={sinRespuestas} className={destacado ? "inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-5 py-3 font-extrabold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-45" : "inline-flex items-center gap-2 font-extrabold text-red-700 disabled:cursor-not-allowed disabled:opacity-45"}><RotateCcw size={18} /> {sinRespuestas ? "No hay respuestas para borrar" : etiqueta}</button></form>;
}
