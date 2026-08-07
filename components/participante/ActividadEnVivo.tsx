"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Lightbulb, LoaderCircle, Send, Sparkles } from "lucide-react";
import { usePollingVisible } from "@/lib/usePollingVisible";

type PreguntaVisible = {
  id: string;
  titulo: string;
  contexto: string;
  tipo: "OPCION_UNICA" | "VERDADERO_FALSO" | "RESPUESTA_ABIERTA";
  opciones?: { id: string; texto: string }[];
  afirmaciones?: { id: string; texto: string }[];
};

type DatosActividad = {
  actividad: {
    id: string;
    titulo: string;
    invitacion: string;
    cierre: string;
    estado: string;
    etapa: "INVITACION" | "PREGUNTA" | "CIERRE";
    pasoActual: number;
    totalPreguntas: number;
    puntosHabilitados: boolean;
    puntos: number;
    requiereEmpresa: boolean;
  };
  empresas: { id: string; nombre: string; urlLogo: string | null }[];
  empresaEvaluadaId: string | null;
  pregunta: PreguntaVisible | null;
  respondida: boolean;
  respuesta: unknown;
  insight: string | null;
};

export function ActividadEnVivo({ codigo }: { codigo: string }) {
  const [datos, setDatos] = useState<DatosActividad | null>(null);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [opcion, setOpcion] = useState("");
  const [afirmaciones, setAfirmaciones] = useState<Record<string, boolean>>({});
  const [respuestaAbierta, setRespuestaAbierta] = useState("");
  const [empresaEvaluadaId, setEmpresaEvaluadaId] = useState("");

  const cargar = useCallback(async () => {
    const respuesta = await fetch(`/api/actividades/${encodeURIComponent(codigo)}`, { cache: "no-store" });
    const cuerpo = await respuesta.json();
    if (!respuesta.ok) throw new Error(cuerpo.error ?? "No pudimos cargar la actividad.");
    setDatos(cuerpo);
    if (cuerpo.empresaEvaluadaId) setEmpresaEvaluadaId(cuerpo.empresaEvaluadaId);
  }, [codigo]);

  useEffect(() => { void cargar().catch((e) => setError(e instanceof Error ? e.message : "No pudimos cargar la actividad.")); }, [cargar]);
  useEffect(() => { setOpcion(""); setAfirmaciones({}); setRespuestaAbierta(""); setError(""); }, [datos?.pregunta?.id]);
  usePollingVisible(cargar, 2000);

  const completa = useMemo(() => {
    if (!datos?.pregunta) return false;
    if (datos.pregunta.tipo === "OPCION_UNICA") return Boolean(opcion);
    if (datos.pregunta.tipo === "RESPUESTA_ABIERTA") return respuestaAbierta.trim().length >= 2 && (!datos.actividad.requiereEmpresa || Boolean(empresaEvaluadaId));
    return Boolean(datos.pregunta.afirmaciones?.every((item) => typeof afirmaciones[item.id] === "boolean"));
  }, [datos?.pregunta, datos?.actividad.requiereEmpresa, opcion, afirmaciones, respuestaAbierta, empresaEvaluadaId]);

  async function responder() {
    if (!datos?.pregunta || !completa || enviando) return;
    setEnviando(true);
    setError("");
    const respuestaElegida = datos.pregunta.tipo === "OPCION_UNICA" ? opcion : datos.pregunta.tipo === "RESPUESTA_ABIERTA" ? respuestaAbierta.trim() : afirmaciones;
    try {
      const respuesta = await fetch(`/api/actividades/${encodeURIComponent(codigo)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preguntaId: datos.pregunta.id, respuesta: respuestaElegida, empresaEvaluadaId }),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok) throw new Error(cuerpo.error ?? "No pudimos guardar tu respuesta.");
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos guardar tu respuesta.");
    } finally {
      setEnviando(false);
    }
  }

  if (!datos && !error) return <div className="tarjeta grid min-h-72 place-items-center p-8"><LoaderCircle className="animate-spin text-[var(--epm-azul)]" size={36} /></div>;
  if (!datos) return <div className="tarjeta p-7 text-center text-red-700"><p className="font-extrabold">{error}</p><button onClick={() => void cargar()} className="boton-secundario mt-4">Intentar de nuevo</button></div>;

  const { actividad, pregunta } = datos;
  if (actividad.etapa === "INVITACION") {
    return (
      <section className="tarjeta entrada-suave overflow-hidden">
        <div className="marca-gradiente p-7 text-white sm:p-10">
          <Sparkles className="text-[var(--epm-verde)]" size={42} />
          <h1 className="mt-5 text-3xl font-extrabold sm:text-4xl">{actividad.titulo}</h1>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-white/90">{actividad.invitacion}</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-6 text-[var(--epm-azul-profundo)]">
          <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full bg-sky-50"><Clock3 /><span className="absolute inset-0 animate-ping rounded-full border border-sky-300 opacity-40" /></span>
          <div><p className="font-extrabold">Espera la indicación del moderador</p><p className="text-sm text-slate-600">Esta pantalla avanzará automáticamente cuando comience la primera pregunta.</p></div>
        </div>
      </section>
    );
  }

  if (actividad.etapa === "CIERRE") {
    return (
      <section className="tarjeta entrada-suave overflow-hidden text-center">
        <div className="marca-gradiente p-8 text-white sm:p-12">
          <CheckCircle2 className="mx-auto text-[var(--epm-verde)]" size={58} />
          <h1 className="mt-5 text-3xl font-extrabold">Gracias por participar</h1>
          <p className="mx-auto mt-5 max-w-3xl text-xl leading-relaxed text-white/90">{actividad.cierre}</p>
          {actividad.puntosHabilitados && actividad.puntos > 0 && <p className="mt-6 inline-flex rounded-full bg-white/15 px-5 py-2 font-extrabold">Puedes obtener {actividad.puntos} puntos al completar todas las respuestas.</p>}
        </div>
      </section>
    );
  }

  if (!pregunta) return null;
  return (
    <section className="tarjeta entrada-suave overflow-hidden">
      <div className="border-b bg-gradient-to-r from-sky-50 to-emerald-50 p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-extrabold text-[var(--epm-azul)]">
          <span>Pregunta {actividad.pasoActual} de {actividad.totalPreguntas}</span>
          {actividad.puntosHabilitados && actividad.puntos > 0 && <span className="rounded-full bg-white px-3 py-1 shadow-sm">{actividad.puntos} puntos al completar</span>}
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-[var(--epm-verde-medio)] transition-all" style={{ width: `${actividad.pasoActual / actividad.totalPreguntas * 100}%` }} /></div>
        <h1 className="mt-5 text-2xl font-extrabold text-[var(--epm-azul-profundo)] sm:text-3xl">{pregunta.titulo}</h1>
        <p className="mt-3 whitespace-pre-line leading-relaxed text-slate-700">{pregunta.contexto}</p>
      </div>
      {datos.respondida ? (
        <div className="p-5 sm:p-7">
          <div className="rounded-2xl border border-lime-200 bg-lime-50 p-5">
            <div className="flex items-center gap-2 font-extrabold text-[var(--epm-azul-profundo)]"><Lightbulb className="text-[var(--epm-verde-medio)]" /> Insight</div>
            <p className="mt-3 text-lg leading-relaxed text-slate-700">{datos.insight}</p>
          </div>
          <div className="mt-5 flex items-center gap-3 text-sm text-slate-600"><CheckCircle2 className="text-emerald-600" /><span><strong>Respuesta guardada.</strong> Espera a que el moderador avance.</span></div>
        </div>
      ) : (
        <div className="space-y-4 p-5 sm:p-7">
          {pregunta.tipo === "OPCION_UNICA" && pregunta.opciones?.map((item) => (
            <label key={item.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition ${opcion === item.id ? "border-[var(--epm-azul)] bg-sky-50" : "border-slate-200 bg-white"}`}>
              <input className="mt-1 h-5 w-5 accent-[var(--epm-azul)]" type="radio" name="opcion" value={item.id} checked={opcion === item.id} onChange={() => setOpcion(item.id)} />
              <span className="leading-relaxed"><strong className="mr-2 text-[var(--epm-azul)]">{item.id.toUpperCase()}.</strong>{item.texto}</span>
            </label>
          ))}
          {pregunta.tipo === "VERDADERO_FALSO" && pregunta.afirmaciones?.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
              <p className="leading-relaxed text-slate-700">{item.texto}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[true, false].map((valor) => <button key={String(valor)} type="button" onClick={() => setAfirmaciones((actual) => ({ ...actual, [item.id]: valor }))} className={`rounded-xl border-2 px-3 py-2 font-extrabold ${afirmaciones[item.id] === valor ? "border-[var(--epm-azul)] bg-sky-50 text-[var(--epm-azul-profundo)]" : "border-slate-200 text-slate-600"}`}>{valor ? "Verdadero" : "Falso"}</button>)}
              </div>
            </div>
          ))}
          {pregunta.tipo === "RESPUESTA_ABIERTA" && <>
            {actividad.requiereEmpresa && <label><span className="etiqueta">Empresa que estás evaluando</span><select className="campo" value={empresaEvaluadaId} onChange={(evento) => setEmpresaEvaluadaId(evento.target.value)} disabled={Boolean(datos.empresaEvaluadaId)}><option value="">Selecciona una empresa</option>{datos.empresas.map((empresa) => <option key={empresa.id} value={empresa.id}>{empresa.nombre}</option>)}</select>{datos.empresaEvaluadaId && <small className="mt-1 block text-slate-500">La empresa se conserva para todas tus respuestas.</small>}</label>}
            <label><span className="etiqueta">Tu respuesta</span><textarea className="campo min-h-40" maxLength={4000} value={respuestaAbierta} onChange={(evento) => setRespuestaAbierta(evento.target.value)} placeholder="Escribe aquí tus hallazgos..." /></label>
          </>}
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
          <button type="button" disabled={!completa || enviando} onClick={() => void responder()} className="boton-primario w-full disabled:cursor-not-allowed disabled:opacity-50">{enviando ? <LoaderCircle className="animate-spin" /> : <Send />} Guardar respuesta</button>
        </div>
      )}
    </section>
  );
}
