"use client";

import { useActionState, useState } from "react";
import QRCode from "qrcode";
import { Eye } from "lucide-react";
import type { Componente, Desafio, Ubicacion } from "@prisma/client";
import { guardarDesafio, type EstadoGuardarDesafio } from "@/app/admin/actions";
import { FORMATO_COSECHA, PREGUNTAS_COSECHA } from "@/lib/cosecha-config";
import { esConfiguracionPuntualidad } from "@/lib/puntualidad";
import {
  DURACION_MAXIMA_MINUTOS,
  DURACION_PREDETERMINADA_MINUTOS,
  fechaParaInputColombia,
} from "@/lib/duracion-desafio";

type Config = {
  opciones?: { texto: string; correcta: boolean }[];
  multiple?: boolean;
  puntajeParcial?: boolean;
  respuestasAceptadas?: string[];
  instruccion?: string;
  pregunta?: string;
  formato?: string;
  preguntas?: typeof PREGUNTAS_COSECHA;
  tipoEspecial?: string;
  fechaHoraObjetivo?: string;
  toleranciaMinutos?: number;
  publicarEnRecuerdos?: boolean;
};

const ESTADO_INICIAL_GUARDADO: EstadoGuardarDesafio = { tipo: "inicial", mensaje: "" };

export function FormularioDesafio({
  componentes,
  ubicaciones,
  desafio,
}: {
  componentes: Componente[];
  ubicaciones: Ubicacion[];
  desafio?: Desafio;
}) {
  const config = (desafio?.configuracion ?? {}) as Config;
  const puntualidad = esConfiguracionPuntualidad(config) ? config : null;
  const [tipo, setTipo] = useState<string>(puntualidad ? "PUNTUALIDAD" : (desafio?.tipo ?? "CHECK_IN"));
  const [dia, setDia] = useState(desafio?.dia ?? 1);
  const [formatoEncuesta, setFormatoEncuesta] = useState(config.formato ?? "texto");
  const [modoDuracion, setModoDuracion] = useState<"MINUTOS" | "FECHA_HORA">(
    desafio?.duracionMinutos === null ? "FECHA_HORA" : "MINUTOS",
  );
  const [qrVistaPrevia, setQrVistaPrevia] = useState<string | null>(null);
  const [resultadoGuardado, accionGuardar, guardando] = useActionState(guardarDesafio, ESTADO_INICIAL_GUARDADO);

  async function mostrarVistaPrevia(formulario: HTMLFormElement | null) {
    if (!formulario) return;
    const titulo = String(new FormData(formulario).get("titulo") ?? "Reto");
    const base = titulo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24);
    const codigo = desafio?.codigoQr ?? `${base || "reto"}-vista-previa`;
    const imagen = await QRCode.toDataURL(`${window.location.origin}/d/${codigo}`, {
      width: 520,
      margin: 2,
      color: { dark: "#0B3B60", light: "#FFFFFF" },
      errorCorrectionLevel: "H",
    });
    setQrVistaPrevia(imagen);
  }
  return (
    <form action={accionGuardar} className="grid gap-4 md:grid-cols-2">
      {desafio && <input type="hidden" name="id" value={desafio.id} />}
      <div className="md:col-span-2"><label className="etiqueta">Título</label><input className="campo" name="titulo" required minLength={3} maxLength={100} defaultValue={desafio?.titulo} /></div>
      <div className="md:col-span-2"><label className="etiqueta">Descripción</label><textarea className="campo min-h-24" name="descripcion" required maxLength={600} defaultValue={desafio?.descripcion} /></div>
      <div><label className="etiqueta">Tipo</label><select className="campo" name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}><option value="CHECK_IN">Check-in</option><option value="PUNTUALIDAD">Puntualidad</option><option value="OPCION_MULTIPLE">Opción múltiple</option><option value="RESPUESTA_ABIERTA">Respuesta abierta</option><option value="EVIDENCIA_FOTO">Evidencia en foto</option><option value="ENCUESTA">Encuesta</option></select></div>
      <div><label className="etiqueta">Puntos</label><input className="campo" name="puntos" type="number" min={0} max={10000} required defaultValue={desafio?.puntos ?? 100} /></div>
      <div><label className="etiqueta">Día</label><select className="campo" name="dia" value={dia} onChange={(e) => setDia(Number(e.target.value))}><option value={1}>Día 1</option><option value={2}>Día 2</option><option value={0}>Todo el tiempo</option></select></div>
      {dia === 2 ? (
        <div><label className="etiqueta">Componente</label><select className="campo" name="componenteId" required defaultValue={desafio?.componenteId ?? ""}><option value="" disabled>Selecciona</option>{componentes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select><input type="hidden" name="ubicacion" value="" /></div>
      ) : (
        <div><label className="etiqueta">Ubicación / momento</label><select className="campo" name="ubicacion" required defaultValue={desafio?.ubicacion ?? ""}><option value="" disabled>Selecciona</option>{ubicaciones.map((u) => <option key={u.id} value={u.nombre}>{u.nombre}</option>)}</select></div>
      )}
      {tipo === "OPCION_MULTIPLE" && (
        <div className="md:col-span-2 rounded-xl bg-sky-50 p-4">
          <label className="etiqueta">Opciones, una por línea. Anteponer * a las correctas.</label>
          <textarea name="opciones" className="campo min-h-32" required defaultValue={config.opciones?.map((o) => `${o.correcta ? "*" : ""}${o.texto}`).join("\n") ?? "*Opción correcta\nOpción incorrecta"} />
          <label className="mr-5 mt-3 inline-flex items-center gap-2"><input type="checkbox" name="multiple" defaultChecked={config.multiple} /> Varias correctas</label>
          <label className="mt-3 inline-flex items-center gap-2"><input type="checkbox" name="puntajeParcial" defaultChecked={config.puntajeParcial} /> Puntaje proporcional</label>
        </div>
      )}
      {tipo === "RESPUESTA_ABIERTA" && <div className="md:col-span-2"><label className="etiqueta">Respuestas aceptadas, separadas por coma</label><input className="campo" name="respuestasAceptadas" required defaultValue={config.respuestasAceptadas?.join(", ")} /></div>}
      {tipo === "PUNTUALIDAD" && (
        <div className="md:col-span-2 grid gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 md:grid-cols-2">
          <div>
            <label className="etiqueta">Fecha y hora de llegada</label>
            <input className="campo bg-white" type="datetime-local" name="fechaHoraObjetivo" required defaultValue={puntualidad?.fechaHoraObjetivo ?? ""} />
          </div>
          <div>
            <label className="etiqueta">Ventana antes y después (minutos)</label>
            <input className="campo bg-white" type="number" name="toleranciaMinutos" min={0} max={1440} step={1} required defaultValue={puntualidad?.toleranciaMinutos ?? 5} />
          </div>
          <p className="text-sm text-amber-900 md:col-span-2">La hora se interpreta en Colombia. Por ejemplo, con llegada a las 2:00 p. m. y 5 minutos de tolerancia, solo se permite registrar entre 1:55 p. m. y 2:05 p. m. Antes o después no se crea la completitud ni se entregan puntos.</p>
        </div>
      )}
      {tipo === "EVIDENCIA_FOTO" && (
        <div className="md:col-span-2 space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div>
            <label className="etiqueta">Instrucción para la foto</label>
            <input className="campo bg-white" name="instruccion" required defaultValue={config.instruccion} />
          </div>
          <label className="flex items-start gap-3 rounded-xl bg-white p-3 font-bold text-emerald-950">
            <input type="checkbox" name="publicarEnRecuerdos" defaultChecked={config.publicarEnRecuerdos ?? false} className="mt-1" />
            <span>
              <strong className="block">Publicar las fotos aprobadas en Recuerdos</strong>
              <small className="mt-1 block font-medium text-emerald-800">Al aprobar la evidencia aparecerá en el muro y podrá recibir corazones y risas.</small>
            </span>
          </label>
        </div>
      )}
      {tipo === "ENCUESTA" && (
        <>
          {formatoEncuesta !== FORMATO_COSECHA && <div><label className="etiqueta">Pregunta</label><input className="campo" name="pregunta" required defaultValue={config.pregunta} /></div>}
          <div className={formatoEncuesta === FORMATO_COSECHA ? "md:col-span-2" : ""}><label className="etiqueta">Formato</label><select className="campo" name="formato" value={formatoEncuesta} onChange={(e) => setFormatoEncuesta(e.target.value)}><option value="texto">Texto libre</option><option value="escala">Escala 1–5</option><option value={FORMATO_COSECHA}>Cosecha, gratitud y acción</option></select></div>
          {formatoEncuesta === FORMATO_COSECHA && (
            <div className="md:col-span-2 rounded-2xl bg-gradient-to-r from-emerald-50 to-sky-50 p-4">
              <p className="font-extrabold text-[var(--epm-azul-profundo)]">Esta tarjeta tendrá tres respuestas:</p>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {PREGUNTAS_COSECHA.map((pregunta) => <div key={pregunta.id} className="rounded-xl bg-white p-3 text-sm shadow-sm"><strong className="text-[var(--epm-teal)]">{pregunta.titulo}</strong><span className="mt-1 block text-slate-600">{pregunta.ayuda}</span></div>)}
              </div>
            </div>
          )}
        </>
      )}
      <div className="md:col-span-2 grid gap-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 md:grid-cols-2">
        <div>
          <label className="etiqueta">Duración del desafío</label>
          <select className="campo bg-white" name="modoDuracion" value={modoDuracion} onChange={(evento) => setModoDuracion(evento.target.value as "MINUTOS" | "FECHA_HORA")}>
            <option value="MINUTOS">Minutos desde su publicación</option>
            <option value="FECHA_HORA">Hasta una fecha y hora</option>
          </select>
        </div>
        {modoDuracion === "MINUTOS" ? (
          <div>
            <label className="etiqueta">Cantidad de minutos</label>
            <input className="campo bg-white" type="number" min={1} max={DURACION_MAXIMA_MINUTOS} step={1} name="duracionMinutos" required defaultValue={desafio?.duracionMinutos ?? DURACION_PREDETERMINADA_MINUTOS} />
          </div>
        ) : (
          <div>
            <label className="etiqueta">Fecha y hora de cierre</label>
            <input className="campo bg-white" type="datetime-local" name="fechaHoraCierre" required defaultValue={fechaParaInputColombia(desafio?.disponibleHasta ?? null)} />
          </div>
        )}
        <p className="text-xs text-sky-900 md:col-span-2">{modoDuracion === "MINUTOS" ? "El conteo empieza cada vez que publiques o vuelvas a publicar el desafío." : "La fecha y hora se interpretan en Colombia. Al llegar ese momento ya no se aceptarán respuestas."}</p>
      </div>
      <div><label className="etiqueta">Estado inicial</label><select className="campo" name="estado" defaultValue={desafio?.estado ?? "BORRADOR"}><option value="BORRADOR">Borrador</option><option value="PUBLICADO">Publicado</option><option value="CERRADO">Cerrado</option></select></div>
      <div><label className="etiqueta">Límite de completitudes (opcional)</label><input className="campo" type="number" min={1} name="limiteCompletitudes" defaultValue={desafio?.limiteCompletitudes ?? ""} /></div>
      <label className="md:col-span-2 flex items-center gap-2 rounded-xl bg-slate-50 p-3 font-bold"><input type="checkbox" name="esSecreto" defaultChecked={desafio?.esSecreto} /> Reto secreto: ocultar hasta escanear</label>
      {resultadoGuardado.tipo !== "inicial" && (
        <div role="status" className={`order-2 rounded-xl border p-3 text-sm font-bold md:col-span-2 ${resultadoGuardado.tipo === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
          {resultadoGuardado.mensaje}
        </div>
      )}
      <button disabled={guardando} className="boton-primario order-2 disabled:cursor-wait disabled:opacity-70 md:col-span-2">{guardando ? "Guardando…" : desafio ? "Guardar cambios" : "Crear desafío y generar QR"}</button>
      <button type="button" className="boton-secundario order-1 md:col-span-2" onClick={(evento) => void mostrarVistaPrevia(evento.currentTarget.form)}><Eye size={19} /> Vista previa del QR sin guardar</button>
      {qrVistaPrevia && <div className="order-3 md:col-span-2 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-center"><img src={qrVistaPrevia} alt="Vista previa del código QR" className="mx-auto h-56 w-56 rounded-xl bg-white p-2" /><p className="mt-2 text-xs font-bold text-slate-600">Vista previa visual. En un reto nuevo, el QR quedará activo únicamente después de guardarlo.</p></div>}
    </form>
  );
}
