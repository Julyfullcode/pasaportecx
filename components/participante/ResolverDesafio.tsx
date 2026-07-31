"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock3, LoaderCircle, RefreshCw, Sparkles } from "lucide-react";
import { comprimirImagen } from "@/lib/imagen";

type Configuracion = {
  opciones?: { id: string; texto: string; correcta: boolean }[];
  multiple?: boolean;
  instruccion?: string;
  pregunta?: string;
  formato?: "texto" | "escala";
};

export function ResolverDesafio({
  codigo,
  tipo,
  puntos,
  configuracion,
}: {
  codigo: string;
  tipo: string;
  puntos: number;
  configuracion: Configuracion;
}) {
  const [cargando, setCargando] = useState(tipo === "CHECK_IN");
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState<{ estado: string; puntosGanados: number; nuevoTotal: number; yaCompletado?: boolean }>();
  const enviado = useRef(false);

  async function completar(formulario = new FormData()) {
    if (enviado.current) return;
    enviado.current = true;
    setCargando(true);
    setError("");
    const controlador = new AbortController();
    const timeout = setTimeout(() => controlador.abort(), 20_000);
    try {
      const foto = formulario.get("evidencia");
      if (foto instanceof File && foto.size) {
        formulario.set("evidencia", await comprimirImagen(foto, 1200, 0.72), "evidencia.webp");
      }
      const respuesta = await fetch(`/api/desafios/${codigo}/completar`, {
        method: "POST",
        body: formulario,
        signal: controlador.signal,
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok) throw new Error(cuerpo.error);
      setResultado(cuerpo);
    } catch (e) {
      enviado.current = false;
      setError(
        e instanceof DOMException && e.name === "AbortError"
          ? "La red tardó demasiado. Tu respuesta sigue aquí; toca Reintentar."
          : e instanceof Error ? e.message : "No pudimos guardar tu respuesta.",
      );
    } finally {
      clearTimeout(timeout);
      setCargando(false);
    }
  }

  useEffect(() => {
    if (tipo === "CHECK_IN") void completar();
    // Solo una vez: evita doble puntaje incluso en Strict Mode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo]);

  if (resultado) {
    const pendiente = resultado.estado === "PENDIENTE";
    return (
      <div className="tarjeta entrada-suave p-6 text-center">
        <span className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${pendiente ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-[var(--epm-verde-medio)]"}`}>
          {pendiente ? <Clock3 size={34} /> : <CheckCircle2 size={34} />}
        </span>
        <h2 className="mt-4 text-2xl font-extrabold text-[var(--epm-azul-profundo)]">
          {resultado.yaCompletado ? "Ya habías completado este reto" : pendiente ? "¡Evidencia enviada!" : "¡Desafío completado!"}
        </h2>
        {pendiente ? (
          <p className="mt-2 text-slate-600">La organización revisará tu foto. Los {puntos} puntos se sumarán al aprobarla.</p>
        ) : (
          <>
            <p className="puntos-animados mt-4 font-display text-5xl font-extrabold text-[var(--epm-verde-medio)]">+{resultado.puntosGanados}</p>
            <p className="mt-2 text-slate-600">Nuevo total: <strong>{resultado.nuevoTotal} puntos</strong></p>
            <div aria-hidden="true" className="mt-3 flex justify-center gap-2 text-[var(--epm-verde)]"><Sparkles /><Sparkles /><Sparkles /></div>
          </>
        )}
      </div>
    );
  }

  return (
    <form
      className="tarjeta space-y-4 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        void completar(new FormData(e.currentTarget));
      }}
    >
      {tipo === "CHECK_IN" && <p className="text-center font-bold text-slate-600">Registrando tu check-in…</p>}
      {tipo === "OPCION_MULTIPLE" && (
        <fieldset className="space-y-2">
          <legend className="etiqueta">Selecciona {configuracion.multiple ? "una o varias respuestas" : "una respuesta"}</legend>
          {configuracion.opciones?.map((opcion) => (
            <label key={opcion.id} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 has-[:checked]:border-[var(--epm-azul)] has-[:checked]:bg-sky-50">
              <input type={configuracion.multiple ? "checkbox" : "radio"} name="opcion" value={opcion.id} required={!configuracion.multiple} className="h-5 w-5 accent-[var(--epm-azul)]" />
              <span className="font-bold">{opcion.texto}</span>
            </label>
          ))}
        </fieldset>
      )}
      {tipo === "RESPUESTA_ABIERTA" && (
        <div><label className="etiqueta" htmlFor="respuesta">Tu respuesta</label><input className="campo" id="respuesta" name="respuesta" maxLength={180} required autoComplete="off" /></div>
      )}
      {tipo === "EVIDENCIA_FOTO" && (
        <div>
          <p className="mb-3 rounded-xl bg-sky-50 p-3 text-sm font-bold text-[var(--epm-azul-profundo)]">{configuracion.instruccion}</p>
          <label className="etiqueta" htmlFor="evidencia">Foto de evidencia</label>
          <input className="campo file:mr-3 file:rounded-full file:border-0 file:bg-sky-50 file:px-3 file:py-2 file:font-bold file:text-[var(--epm-azul)]" id="evidencia" name="evidencia" type="file" accept="image/*" capture="environment" required />
        </div>
      )}
      {tipo === "ENCUESTA" && (
        <div>
          <label className="etiqueta" htmlFor="respuesta">{configuracion.pregunta}</label>
          {configuracion.formato === "escala" ? (
            <div className="grid grid-cols-5 gap-2">{[1, 2, 3, 4, 5].map((n) => <label key={n} className="grid min-h-14 cursor-pointer place-items-center rounded-xl border bg-white font-extrabold has-[:checked]:border-[var(--epm-azul)] has-[:checked]:bg-sky-50"><input type="radio" name="respuesta" value={n} required className="sr-only" />{n}</label>)}</div>
          ) : <textarea className="campo min-h-28" id="respuesta" name="respuesta" maxLength={500} required />}
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">
          {error}
          <button type="submit" className="mt-2 flex items-center gap-1 underline"><RefreshCw size={16} /> Reintentar</button>
        </div>
      )}
      {tipo !== "CHECK_IN" && <button disabled={cargando} className="boton-primario w-full">{cargando && <LoaderCircle className="animate-spin" />} {cargando ? "Guardando…" : "Enviar respuesta"}</button>}
    </form>
  );
}
