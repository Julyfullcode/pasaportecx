"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { PreguntaEncuestaMixta, TipoPreguntaEncuestaMixta } from "@/lib/encuesta-mixta";

function idNuevo(prefijo: string) {
  return `${prefijo}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function nuevaPregunta(tipo: TipoPreguntaEncuestaMixta): PreguntaEncuestaMixta {
  return {
    id: idNuevo("pregunta"),
    tipo,
    titulo: "",
    descripcion: "",
    elementos: tipo === "MATRIZ_0_10" ? [{ id: idNuevo("elemento"), texto: "" }] : [],
  };
}

export function EditorEncuestaMixta({
  preguntas,
  alCambiar,
}: {
  preguntas: PreguntaEncuestaMixta[];
  alCambiar: (preguntas: PreguntaEncuestaMixta[]) => void;
}) {
  function actualizar(indice: number, cambios: Partial<PreguntaEncuestaMixta>) {
    alCambiar(preguntas.map((pregunta, posicion) => posicion === indice ? { ...pregunta, ...cambios } : pregunta));
  }

  function cambiarTipo(indice: number, tipo: TipoPreguntaEncuestaMixta) {
    actualizar(indice, {
      tipo,
      elementos: tipo === "MATRIZ_0_10"
        ? preguntas[indice].elementos.length ? preguntas[indice].elementos : [{ id: idNuevo("elemento"), texto: "" }]
        : [],
    });
  }

  function mover(indice: number, desplazamiento: -1 | 1) {
    const destino = indice + desplazamiento;
    if (destino < 0 || destino >= preguntas.length) return;
    const copia = [...preguntas];
    [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
    alCambiar(copia);
  }

  return (
    <section className="md:col-span-2 rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-sky-50 p-4">
      <input type="hidden" name="preguntasMixtas" value={JSON.stringify(preguntas)} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-extrabold text-[var(--epm-azul-profundo)]">Preguntas de la encuesta mixta</h3>
          <p className="mt-1 text-sm text-slate-600">Combina escalas, matrices y respuestas abiertas. Todas las preguntas serán obligatorias.</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-sm font-extrabold text-violet-700">{preguntas.length} preguntas</span>
      </div>

      <div className="mt-4 space-y-4">
        {preguntas.map((pregunta, indice) => (
          <article key={pregunta.id} className="rounded-2xl border border-white bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-violet-100 text-sm font-extrabold text-violet-700">{indice + 1}</span>
              <select
                className="campo !min-h-10 min-w-[220px] flex-1"
                aria-label={`Tipo de la pregunta ${indice + 1}`}
                value={pregunta.tipo}
                onChange={(evento) => cambiarTipo(indice, evento.target.value as TipoPreguntaEncuestaMixta)}
              >
                <option value="ESCALA_0_10">Escala de 0 a 10</option>
                <option value="MATRIZ_0_10">Escala 0 a 10 por cada elemento</option>
                <option value="ABIERTA">Respuesta abierta</option>
              </select>
              <button type="button" onClick={() => mover(indice, -1)} disabled={indice === 0} className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-600 disabled:opacity-30" aria-label={`Subir pregunta ${indice + 1}`}><ArrowUp size={17} /></button>
              <button type="button" onClick={() => mover(indice, 1)} disabled={indice === preguntas.length - 1} className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-600 disabled:opacity-30" aria-label={`Bajar pregunta ${indice + 1}`}><ArrowDown size={17} /></button>
              <button type="button" onClick={() => alCambiar(preguntas.filter((_, posicion) => posicion !== indice))} className="grid h-10 w-10 place-items-center rounded-full bg-red-50 text-red-700" aria-label={`Eliminar pregunta ${indice + 1}`}><Trash2 size={17} /></button>
            </div>
            <div className="mt-3 grid gap-3">
              <div><label className="etiqueta" htmlFor={`pregunta-mixta-${pregunta.id}`}>Pregunta</label><input id={`pregunta-mixta-${pregunta.id}`} className="campo" required maxLength={240} value={pregunta.titulo} onChange={(evento) => actualizar(indice, { titulo: evento.target.value })} /></div>
              <div><label className="etiqueta" htmlFor={`descripcion-mixta-${pregunta.id}`}>Descripción o ayuda (opcional)</label><textarea id={`descripcion-mixta-${pregunta.id}`} className="campo min-h-20" maxLength={600} value={pregunta.descripcion} onChange={(evento) => actualizar(indice, { descripcion: evento.target.value })} /></div>
              {pregunta.tipo === "MATRIZ_0_10" && (
                <div>
                  <label className="etiqueta" htmlFor={`elementos-mixta-${pregunta.id}`}>Elementos a calificar, uno por línea</label>
                  <textarea
                    id={`elementos-mixta-${pregunta.id}`}
                    className="campo min-h-36"
                    required
                    value={pregunta.elementos.map((elemento) => elemento.texto).join("\n")}
                    onChange={(evento) => actualizar(indice, {
                      elementos: evento.target.value.split("\n").map((texto, posicion) => ({
                        id: pregunta.elementos[posicion]?.id ?? idNuevo("elemento"),
                        texto,
                      })),
                    })}
                  />
                </div>
              )}
              {pregunta.tipo !== "MATRIZ_0_10" && <p className="rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-600">{pregunta.tipo === "ABIERTA" ? "La persona encontrará un campo amplio para escribir su respuesta." : "La persona podrá seleccionar un valor entero entre 0 y 10."}</p>}
            </div>
          </article>
        ))}
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-3">
        <button type="button" className="boton-secundario !min-h-11 !px-3 text-sm" onClick={() => alCambiar([...preguntas, nuevaPregunta("ESCALA_0_10")])}><Plus size={17} /> Agregar escala 0–10</button>
        <button type="button" className="boton-secundario !min-h-11 !px-3 text-sm" onClick={() => alCambiar([...preguntas, nuevaPregunta("MATRIZ_0_10")])}><Plus size={17} /> Agregar matriz 0–10</button>
        <button type="button" className="boton-secundario !min-h-11 !px-3 text-sm" onClick={() => alCambiar([...preguntas, nuevaPregunta("ABIERTA")])}><Plus size={17} /> Agregar respuesta abierta</button>
      </div>
    </section>
  );
}
