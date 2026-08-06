"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import type { ConfiguracionActividad, PreguntaActividad } from "@/lib/actividad";
import { guardarActividad } from "@/app/admin/(privado)/actividades/actions";

type ActividadEditable = {
  id: string;
  titulo: string;
  invitacion: string;
  cierre: string;
  puntosHabilitados: boolean;
  puntos: number;
  configuracion: ConfiguracionActividad;
};

export function EditorActividad({ actividad }: { actividad: ActividadEditable }) {
  const [preguntas, setPreguntas] = useState(actividad.configuracion.preguntas);
  const [puntosActivos, setPuntosActivos] = useState(actividad.puntosHabilitados);

  function actualizarPregunta(indice: number, cambios: Partial<PreguntaActividad>) {
    setPreguntas((actuales) => actuales.map((pregunta, posicion) => posicion === indice ? { ...pregunta, ...cambios } : pregunta));
  }

  return (
    <form action={guardarActividad} className="space-y-5">
      <input type="hidden" name="id" value={actividad.id} />
      <input type="hidden" name="configuracion" value={JSON.stringify({ preguntas })} />
      <section className="tarjeta grid gap-4 p-5 md:grid-cols-2">
        <label className="md:col-span-2"><span className="etiqueta">Nombre de la actividad</span><input className="campo" name="titulo" defaultValue={actividad.titulo} required /></label>
        <label className="md:col-span-2"><span className="etiqueta">Texto de invitación inicial</span><textarea className="campo min-h-32" name="invitacion" defaultValue={actividad.invitacion} required /></label>
        <label className="md:col-span-2"><span className="etiqueta">Mensaje de cierre</span><textarea className="campo min-h-28" name="cierre" defaultValue={actividad.cierre} required /></label>
        <label className="flex items-center gap-3 rounded-2xl bg-sky-50 p-4 font-extrabold text-[var(--epm-azul-profundo)]"><input type="checkbox" name="puntosHabilitados" checked={puntosActivos} onChange={(evento) => setPuntosActivos(evento.target.checked)} className="h-5 w-5 accent-[var(--epm-azul)]" /> Dar puntos por completar</label>
        <label className={!puntosActivos ? "opacity-55" : ""}><span className="etiqueta">Cantidad de puntos</span><input className="campo" type="number" name="puntos" min="0" max="10000" defaultValue={actividad.puntos} readOnly={!puntosActivos} /></label>
      </section>
      <div className="space-y-4">
        {preguntas.map((pregunta, indice) => (
          <details key={pregunta.id} className="tarjeta overflow-hidden" open={indice === 0}>
            <summary className="cursor-pointer list-none bg-gradient-to-r from-sky-50 to-emerald-50 p-5 font-extrabold text-[var(--epm-azul-profundo)]">Pregunta {indice + 1}: {pregunta.titulo}</summary>
            <div className="space-y-4 p-5">
              <label><span className="etiqueta">Pregunta</span><input className="campo" value={pregunta.titulo} onChange={(e) => actualizarPregunta(indice, { titulo: e.target.value })} /></label>
              <label><span className="etiqueta">Descripción o contexto</span><textarea className="campo min-h-28" value={pregunta.contexto} onChange={(e) => actualizarPregunta(indice, { contexto: e.target.value })} /></label>
              {pregunta.tipo === "OPCION_UNICA" && (
                <div><span className="etiqueta">Opciones</span><div className="space-y-2">{pregunta.opciones?.map((opcion, posicion) => <div key={opcion.id} className="flex items-center gap-2"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sky-50 font-extrabold text-[var(--epm-azul)]">{opcion.id.toUpperCase()}</span><input className="campo" value={opcion.texto} onChange={(e) => actualizarPregunta(indice, { opciones: pregunta.opciones?.map((actual, p) => p === posicion ? { ...actual, texto: e.target.value } : actual) })} /></div>)}</div></div>
              )}
              {pregunta.tipo === "VERDADERO_FALSO" && (
                <div><span className="etiqueta">Afirmaciones</span><div className="space-y-3">{pregunta.afirmaciones?.map((afirmacion, posicion) => <div key={afirmacion.id} className="grid gap-2 rounded-xl border p-3 md:grid-cols-[1fr_150px]"><textarea className="campo min-h-20" value={afirmacion.texto} onChange={(e) => actualizarPregunta(indice, { afirmaciones: pregunta.afirmaciones?.map((actual, p) => p === posicion ? { ...actual, texto: e.target.value } : actual) })} /><select className="campo" value={String(afirmacion.correcta)} onChange={(e) => actualizarPregunta(indice, { afirmaciones: pregunta.afirmaciones?.map((actual, p) => p === posicion ? { ...actual, correcta: e.target.value === "true" } : actual) })}><option value="true">Verdadera</option><option value="false">Falsa</option></select></div>)}</div></div>
              )}
              <label><span className="etiqueta">Insight que se muestra después de responder</span><textarea className="campo min-h-28" value={pregunta.insight} onChange={(e) => actualizarPregunta(indice, { insight: e.target.value })} /></label>
            </div>
          </details>
        ))}
      </div>
      <button className="boton-primario"><Save size={19} /> Guardar configuración</button>
    </form>
  );
}
