"use client";

import { useState } from "react";
import { CheckCircle2, Plus, Save, Trash2 } from "lucide-react";
import type { ConfiguracionActividad, PreguntaActividad } from "@/lib/actividad";
import { idsRespuestasCorrectas } from "@/lib/actividad-cliente";
import { guardarActividad } from "@/app/admin/(privado)/actividades/actions";
import { TIPO_JUEGO_CX_EX } from "@/lib/juego-cx-ex";

type ActividadEditable = {
  id: string;
  tipo: string;
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

  function agregarPreguntaAbierta() {
    setPreguntas((actuales) => [...actuales, {
      id: `pregunta-${Date.now()}`,
      titulo: "Nueva pregunta abierta",
      contexto: "Escribe aquí la orientación para responder.",
      tipo: "RESPUESTA_ABIERTA",
      insight: "Gracias por compartir tu respuesta.",
    }]);
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
      {actividad.tipo === TIPO_JUEGO_CX_EX && <div className="rounded-3xl border border-sky-200 bg-sky-50 p-5"><h2 className="text-xl font-extrabold text-[var(--epm-azul-profundo)]">Dinámica fija del juego</h2><p className="mt-2 text-slate-600">Conserva los cinco momentos del archivo original: viaje, conexiones CX–EX, causas, solución y beneficios. Aquí puedes modificar los textos generales y decidir si la actividad entrega puntos en la aplicación.</p></div>}
      {actividad.tipo !== TIPO_JUEGO_CX_EX && <div className="space-y-4">
        {preguntas.map((pregunta, indice) => (
          <details key={pregunta.id} className="tarjeta overflow-hidden" open={indice === 0}>
            <summary className="cursor-pointer list-none bg-gradient-to-r from-sky-50 to-emerald-50 p-5 font-extrabold text-[var(--epm-azul-profundo)]">Pregunta {indice + 1}: {pregunta.titulo}</summary>
            <div className="space-y-4 p-5">
              {actividad.tipo === "EVALUACION_WHATSAPP" && preguntas.length > 1 && <button type="button" onClick={() => setPreguntas((actuales) => actuales.filter((_, posicion) => posicion !== indice))} className="inline-flex items-center gap-2 text-sm font-extrabold text-red-700"><Trash2 size={17} /> Eliminar pregunta</button>}
              <label><span className="etiqueta">Pregunta</span><input className="campo" value={pregunta.titulo} onChange={(e) => actualizarPregunta(indice, { titulo: e.target.value })} /></label>
              <label><span className="etiqueta">Descripción o contexto</span><textarea className="campo min-h-28" value={pregunta.contexto} onChange={(e) => actualizarPregunta(indice, { contexto: e.target.value })} /></label>
              {pregunta.tipo === "OPCION_UNICA" && (
                <div><span className="etiqueta">Opciones y respuestas correctas</span><p className="mb-3 text-sm text-slate-600">Marca una o varias opciones. Si marcas varias, el participante podrá seleccionarlas todas.</p><div className="space-y-2">{pregunta.opciones?.map((opcion, posicion) => { const correctas = idsRespuestasCorrectas(pregunta); const marcada = correctas.includes(opcion.id); return <div key={opcion.id} className={`grid items-center gap-2 rounded-xl border p-2 md:grid-cols-[42px_1fr_180px] ${marcada ? "border-emerald-300 bg-emerald-50" : "border-slate-200"}`}><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sky-50 font-extrabold text-[var(--epm-azul)]">{opcion.id.toUpperCase()}</span><input className="campo bg-white" value={opcion.texto} onChange={(e) => actualizarPregunta(indice, { opciones: pregunta.opciones?.map((actual, p) => p === posicion ? { ...actual, texto: e.target.value } : actual) })} /><label className="flex cursor-pointer items-center gap-2 rounded-lg bg-white p-3 text-sm font-extrabold text-emerald-800"><input type="checkbox" checked={marcada} onChange={(evento) => { const nuevas = evento.target.checked ? [...correctas, opcion.id] : correctas.filter((id) => id !== opcion.id); actualizarPregunta(indice, { respuestaCorrecta: nuevas.length === 1 ? nuevas[0] : nuevas }); }} /><CheckCircle2 size={17} /> Respuesta correcta</label></div>; })}</div></div>
              )}
              {pregunta.tipo === "VERDADERO_FALSO" && (
                <div><span className="etiqueta">Afirmaciones</span><div className="space-y-3">{pregunta.afirmaciones?.map((afirmacion, posicion) => <div key={afirmacion.id} className="grid gap-2 rounded-xl border p-3 md:grid-cols-[1fr_150px]"><textarea className="campo min-h-20" value={afirmacion.texto} onChange={(e) => actualizarPregunta(indice, { afirmaciones: pregunta.afirmaciones?.map((actual, p) => p === posicion ? { ...actual, texto: e.target.value } : actual) })} /><select className="campo" value={String(afirmacion.correcta)} onChange={(e) => actualizarPregunta(indice, { afirmaciones: pregunta.afirmaciones?.map((actual, p) => p === posicion ? { ...actual, correcta: e.target.value === "true" } : actual) })}><option value="true">Verdadera</option><option value="false">Falsa</option></select></div>)}</div></div>
              )}
              <label><span className="etiqueta">Insight que se muestra después de responder</span><textarea className="campo min-h-28" value={pregunta.insight} onChange={(e) => actualizarPregunta(indice, { insight: e.target.value })} /></label>
            </div>
          </details>
        ))}
      </div>}
      <button className="boton-primario"><Save size={19} /> Guardar configuración</button>
      {actividad.tipo === "EVALUACION_WHATSAPP" && <button type="button" onClick={agregarPreguntaAbierta} className="boton-secundario"><Plus size={18} /> Agregar pregunta abierta</button>}
    </form>
  );
}
