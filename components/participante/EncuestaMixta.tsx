import type { PreguntaEncuestaMixta } from "@/lib/encuesta-mixta";

function Escala({ nombre, etiqueta }: { nombre: string; etiqueta: string }) {
  return (
    <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-11">
      {Array.from({ length: 11 }, (_, valor) => (
        <label key={valor} className="grid min-h-11 cursor-pointer place-items-center rounded-xl border border-slate-200 bg-white font-extrabold text-[var(--epm-azul-profundo)] transition has-[:checked]:border-[var(--epm-azul)] has-[:checked]:bg-[var(--epm-azul)] has-[:checked]:text-white">
          <input className="sr-only" type="radio" name={nombre} value={valor} required aria-label={`${etiqueta}: ${valor}`} />
          {valor}
        </label>
      ))}
    </div>
  );
}

export function EncuestaMixta({ preguntas }: { preguntas: PreguntaEncuestaMixta[] }) {
  return (
    <div className="space-y-5">
      {preguntas.map((pregunta, indice) => (
        <section key={pregunta.id} className="rounded-2xl border border-sky-100 bg-gradient-to-br from-white to-sky-50 p-4 shadow-sm">
          <p className="text-xs font-extrabold tracking-wider text-[var(--epm-teal)]">Pregunta {indice + 1}</p>
          <h2 className="mt-1 font-display text-lg font-extrabold leading-snug text-[var(--epm-azul-profundo)]">{pregunta.titulo}</h2>
          {pregunta.descripcion && <p className="mb-4 mt-2 text-sm text-slate-600">{pregunta.descripcion}</p>}
          {pregunta.tipo === "ESCALA_0_10" && (
            <div className={pregunta.descripcion ? "" : "mt-4"}>
              <Escala nombre={`mixta:${pregunta.id}`} etiqueta={pregunta.titulo} />
              <div className="mt-1 flex justify-between text-[10px] font-bold text-slate-500"><span>0</span><span>10</span></div>
            </div>
          )}
          {pregunta.tipo === "MATRIZ_0_10" && (
            <div className="space-y-4">
              {pregunta.elementos.map((elemento) => (
                <fieldset key={elemento.id} className="rounded-xl border border-slate-100 bg-white/80 p-3">
                  <legend className="mb-2 px-1 text-sm font-extrabold text-slate-700">{elemento.texto}</legend>
                  <Escala nombre={`mixta:${pregunta.id}:${elemento.id}`} etiqueta={`${pregunta.titulo}: ${elemento.texto}`} />
                </fieldset>
              ))}
            </div>
          )}
          {pregunta.tipo === "ABIERTA" && (
            <textarea
              className="campo mt-4 min-h-32 bg-white"
              name={`mixta:${pregunta.id}`}
              aria-label={pregunta.titulo}
              maxLength={1200}
              required
              placeholder="Escribe tu respuesta"
            />
          )}
        </section>
      ))}
    </div>
  );
}
