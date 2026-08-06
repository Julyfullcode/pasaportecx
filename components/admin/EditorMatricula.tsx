"use client";

import { InputImagenOptimizada } from "@/components/admin/InputImagenOptimizada";
import type { ConfiguracionMatricula } from "@/lib/matricula";

export function EditorMatricula({ configuracion }: { configuracion: ConfiguracionMatricula | null }) {
  return (
    <div className="md:col-span-2 rounded-2xl border border-violet-200 bg-violet-50 p-4">
      <p className="font-extrabold text-[var(--epm-azul-profundo)]">Dos alternativas de matrícula</p>
      <p className="mt-1 text-sm text-slate-600">Cada alternativa debe tener texto e imagen. La persona podrá cambiar su elección mientras el desafío esté publicado.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {(["a", "b"] as const).map((id, indice) => {
          const actual = configuracion?.opciones[indice];
          return (
            <section key={id} className="rounded-2xl bg-white p-4 shadow-sm">
              <label className="etiqueta">Opción {indice + 1}</label>
              <input className="campo" name={`matriculaTexto${id.toUpperCase()}`} required maxLength={140} defaultValue={actual?.texto ?? ""} placeholder="Texto de la alternativa" />
              <input type="hidden" name={`matriculaImagenActual${id.toUpperCase()}`} value={actual?.urlImagen ?? ""} />
              {actual?.urlImagen && <img src={actual.urlImagen} alt={`Imagen actual de la opción ${indice + 1}`} className="mt-3 h-36 w-full rounded-xl bg-slate-50 object-contain p-2" />}
              <div className="mt-3">
                <InputImagenOptimizada
                  name={`matriculaImagen${id.toUpperCase()}`}
                  maximo={1000}
                  calidad={0.82}
                  maxBytes={600_000}
                  required={!actual?.urlImagen}
                />
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
