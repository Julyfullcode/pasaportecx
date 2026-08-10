"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock3, LoaderCircle, RefreshCw, Sparkles } from "lucide-react";
import { comprimirImagenHasta } from "@/lib/imagen";
import { FORMATO_COSECHA, PREGUNTAS_COSECHA } from "@/lib/cosecha-config";
import { EncuestaMixta } from "@/components/participante/EncuestaMixta";
import { esConfiguracionEncuestaMixta, type PreguntaEncuestaMixta } from "@/lib/encuesta-mixta";
import {
  configuracionPuntualidadDesdeValor,
  fechaHoraPuntualidadLegible,
  type ResultadoPuntualidad,
} from "@/lib/puntualidad";
import { esConfiguracionMatricula, type ConfiguracionMatricula } from "@/lib/matricula";
import { SelectorEvidenciaFoto } from "@/components/participante/SelectorEvidenciaFoto";

type Configuracion = {
  opciones?: { id: string; texto: string; correcta: boolean }[];
  multiple?: boolean;
  instruccion?: string;
  pregunta?: string;
  formato?: "texto" | "escala" | "cosecha" | "mixta" | "matricula";
  preguntas?: PreguntaEncuestaMixta[];
  tipoEspecial?: string;
  fechaHoraObjetivo?: string;
  toleranciaMinutos?: number;
};

export function ResolverDesafio({
  codigo,
  tipo,
  puntos,
  configuracion,
  respuestaInicial,
  tokenLlegada,
}: {
  codigo: string;
  tipo: string;
  puntos: number;
  configuracion: Configuracion;
  respuestaInicial?: string | null;
  tokenLlegada?: string;
}) {
  const completarAutomaticamente = tipo === "CHECK_IN" || (tipo === "PUNTUALIDAD" && Boolean(tokenLlegada));
  const [cargando, setCargando] = useState(completarAutomaticamente);
  const [error, setError] = useState("");
  const [fotoEvidencia, setFotoEvidencia] = useState<File | null>(null);
  const [resultado, setResultado] = useState<{ estado: string; puntosGanados: number; nuevoTotal: number; completitudId?: string; yaCompletado?: boolean; noRegistrado?: boolean; puntualidad?: ResultadoPuntualidad | null; mensaje?: string }>();
  const enviado = useRef(false);
  const puntualidad = configuracionPuntualidadDesdeValor(configuracion);
  const matricula = esConfiguracionMatricula(configuracion) ? configuracion as ConfiguracionMatricula : null;

  async function completar(formulario = new FormData()) {
    if (enviado.current) return;
    enviado.current = true;
    setCargando(true);
    setError("");
    const controlador = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      if (tokenLlegada) formulario.set("tokenLlegada", tokenLlegada);
      const foto = fotoEvidencia ?? formulario.get("evidencia");
      if (tipo === "EVIDENCIA_FOTO" && (!(foto instanceof File) || !foto.size)) {
        enviado.current = false;
        setCargando(false);
        setError("Toma una foto o elige una imagen de la galería para continuar.");
        return;
      }
      if (foto instanceof File && foto.size) {
        formulario.set("evidencia", foto, foto.name || "evidencia");
        try {
          formulario.set("evidencia", await comprimirImagenHasta(foto, 1600, 650_000, 0.78), "evidencia.webp");
        } catch {
          // El servidor hace una segunda normalización y puede procesar formatos
          // que el navegador no logra convertir localmente.
        }
      }
      timeout = setTimeout(() => controlador.abort(), 60_000);
      const respuesta = await fetch(`/api/desafios/${codigo}/completar`, {
        method: "POST",
        body: formulario,
        signal: controlador.signal,
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok && cuerpo.noRegistrado) {
        setResultado(cuerpo);
        return;
      }
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
      if (timeout) clearTimeout(timeout);
      setCargando(false);
    }
  }

  useEffect(() => {
    if (completarAutomaticamente) void completar();
    // Solo una vez: evita doble puntaje incluso en Strict Mode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, completarAutomaticamente]);

  if (resultado) {
    const pendiente = resultado.estado === "PENDIENTE";
    const antesDeVentana = resultado.puntualidad?.estadoVentana === "ANTES";
    const llegadaTarde = resultado.puntualidad?.estadoVentana === "DESPUES";
    const fueraDeVentana = Boolean(resultado.noRegistrado && (antesDeVentana || llegadaTarde));
    return (
      <div className="tarjeta entrada-suave p-6 text-center">
        <span className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${pendiente || antesDeVentana || llegadaTarde ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-[var(--epm-verde-medio)]"}`}>
          {pendiente || antesDeVentana || llegadaTarde ? <Clock3 size={34} /> : <CheckCircle2 size={34} />}
        </span>
        <h2 className="mt-4 text-2xl font-extrabold text-[var(--epm-azul-profundo)]">
          {matricula ? "¡Elección guardada!" : resultado.yaCompletado ? "Ya habías completado este reto" : pendiente ? "¡Evidencia enviada!" : antesDeVentana ? "El desafío aún no está disponible" : llegadaTarde ? "El tiempo para registrarte terminó" : puntualidad ? "¡Puntualidad registrada!" : "¡Desafío completado!"}
        </h2>
        {pendiente ? (
          <p className="mt-2 text-slate-600">La organización revisará tu foto. Los {puntos} puntos se sumarán al aprobarla.</p>
        ) : fueraDeVentana ? (
          <>
            <p className="mt-3 text-slate-600">{resultado.mensaje}</p>
            <p className="mt-3 font-bold text-slate-600">No se registró ninguna completitud.</p>
            {antesDeVentana && <button type="button" onClick={() => window.location.reload()} className="boton-secundario mt-5 w-full">Comprobar nuevamente</button>}
          </>
        ) : llegadaTarde ? (
          <>
            <p className="mt-3 text-slate-600">{resultado.mensaje}</p>
            <p className="mt-3 text-slate-600">Tu total permanece en <strong>{resultado.nuevoTotal} puntos</strong>.</p>
          </>
        ) : (
          <>
            {matricula && resultado.yaCompletado ? <p className="mt-4 font-bold text-[var(--epm-teal)]">Puedes volver y modificarla mientras el desafío siga publicado.</p> : <p className="puntos-animados mt-4 font-display text-5xl font-extrabold text-[var(--epm-verde-medio)]">+{resultado.puntosGanados}</p>}
            {resultado.mensaje && <p className="mt-2 font-bold text-[var(--epm-teal)]">{resultado.mensaje}</p>}
            <p className="mt-2 text-slate-600">Nuevo total: <strong>{resultado.nuevoTotal} puntos</strong></p>
            <div aria-hidden="true" className="mt-3 flex justify-center gap-2 text-[var(--epm-verde)]"><Sparkles /><Sparkles /><Sparkles /></div>
          </>
        )}
        {configuracion.formato === FORMATO_COSECHA && resultado.completitudId && <a href={`/api/cosecha?v=${encodeURIComponent(resultado.completitudId)}#view=Fit`} target="_blank" rel="noopener noreferrer" className="boton-secundario mt-5 w-full">Ver mi tarjeta de cierre</a>}
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
      {tipo === "PUNTUALIDAD" && puntualidad && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center">
          <Clock3 className="mx-auto text-amber-600" size={34} />
          <p className="mt-3 text-sm font-bold uppercase tracking-wider text-amber-800">Hora de llegada</p>
          <p className="mt-1 text-lg font-extrabold text-[var(--epm-azul-profundo)]">{fechaHoraPuntualidadLegible(puntualidad)}</p>
          <p className="mt-2 text-sm text-slate-600">Solo puedes registrarte desde {puntualidad.toleranciaMinutos} minutos antes hasta {puntualidad.toleranciaMinutos} minutos después. La hora se validará en el servidor.</p>
        </div>
      )}
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
        <div className="space-y-4">
          <p className="mb-3 rounded-xl bg-sky-50 p-3 text-sm font-bold text-[var(--epm-azul-profundo)]">{configuracion.instruccion}</p>
          <SelectorEvidenciaFoto alSeleccionar={setFotoEvidencia} />
          <div><label className="etiqueta" htmlFor="comentario">Comentario (opcional)</label><textarea className="campo min-h-24" id="comentario" name="comentario" maxLength={140} placeholder="Cuéntanos algo sobre esta foto" /></div>
        </div>
      )}
      {tipo === "ENCUESTA" && (
        <div>
          {matricula ? (
            <fieldset className="grid gap-4 md:grid-cols-2">
              <legend className="etiqueta mb-2">Elige una alternativa</legend>
              {matricula.opciones.map((opcion) => (
                <label key={opcion.id} className="cursor-pointer overflow-hidden rounded-2xl border-2 border-transparent bg-white shadow-sm transition has-[:checked]:border-[var(--epm-azul)] has-[:checked]:bg-sky-50">
                  <img src={opcion.urlImagen} alt="" className="h-48 w-full bg-slate-50 object-contain p-3" />
                  <span className="flex min-h-16 items-center gap-3 p-4 font-extrabold text-[var(--epm-azul-profundo)]">
                    <input type="radio" name="matricula" value={opcion.id} required defaultChecked={respuestaInicial === opcion.id} className="h-5 w-5 accent-[var(--epm-azul)]" />
                    {opcion.texto}
                  </span>
                </label>
              ))}
              <p className="text-sm text-slate-600 md:col-span-2">Puedes modificar esta elección mientras el desafío permanezca publicado.</p>
            </fieldset>
          ) : esConfiguracionEncuestaMixta(configuracion) ? (
            <EncuestaMixta preguntas={configuracion.preguntas} />
          ) : configuracion.formato === FORMATO_COSECHA ? (
            <div className="space-y-4">
              {PREGUNTAS_COSECHA.map((pregunta) => (
                <label key={pregunta.id} className="block rounded-2xl bg-gradient-to-r from-emerald-50 to-sky-50 p-4">
                  <span className="block font-display text-lg font-extrabold text-[var(--epm-azul-profundo)]">{pregunta.titulo}</span>
                  <span className="mb-3 mt-1 block text-sm text-slate-600">{pregunta.ayuda}</span>
                  <textarea className="campo min-h-24 bg-white" name={pregunta.id} maxLength={600} required />
                </label>
              ))}
            </div>
          ) : configuracion.formato === "escala" ? (
            <>
              <label className="etiqueta" htmlFor="respuesta">{configuracion.pregunta}</label>
            <div className="grid grid-cols-5 gap-2">{[1, 2, 3, 4, 5].map((n) => <label key={n} className="grid min-h-14 cursor-pointer place-items-center rounded-xl border bg-white font-extrabold has-[:checked]:border-[var(--epm-azul)] has-[:checked]:bg-sky-50"><input type="radio" name="respuesta" value={n} required className="sr-only" />{n}</label>)}</div>
            </>
          ) : <><label className="etiqueta" htmlFor="respuesta">{configuracion.pregunta}</label><textarea className="campo min-h-28" id="respuesta" name="respuesta" maxLength={500} required /></>}
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">
          {error}
          <button type="submit" className="mt-2 flex items-center gap-1 underline"><RefreshCw size={16} /> Reintentar</button>
        </div>
      )}
      {!completarAutomaticamente && <button disabled={cargando} className="boton-primario w-full">{cargando && <LoaderCircle className="animate-spin" />} {cargando ? "Registrando…" : tipo === "PUNTUALIDAD" ? "Registrar mi puntualidad" : matricula ? "Guardar mi elección" : "Enviar respuesta"}</button>}
    </form>
  );
}
