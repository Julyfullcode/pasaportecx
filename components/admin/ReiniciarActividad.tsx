"use client";

import { RotateCcw } from "lucide-react";
import { reiniciarActividad } from "@/app/admin/(privado)/actividades/actions";

export function ReiniciarActividad({ id }: { id: string }) {
  return <form action={reiniciarActividad} onSubmit={(evento) => { if (!window.confirm("Se eliminarán todas las respuestas y los puntos otorgados por esta actividad. La configuración se conservará. ¿Deseas continuar?")) evento.preventDefault(); }}><input type="hidden" name="id" value={id} /><button className="inline-flex items-center gap-2 font-extrabold text-red-700"><RotateCcw size={18} /> Reiniciar respuestas</button></form>;
}
