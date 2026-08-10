"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUp, CheckCircle2, Clock3, Link2, LoaderCircle, RotateCcw, Send, Sparkles, Trophy } from "lucide-react";
import { BENEFICIOS_CX_EX, CAUSAS_CX_EX, CONEXIONES_CX_EX, DURACION_JUEGO_CX_EX, SOLUCIONES_CX_EX, VIAJE_CX_EX } from "@/lib/juego-cx-ex";

type Equipo = { id: string; nombre: string };
type Clasificado = { equipoId: string; equipo: string; nombreEquipo: string | null; puntaje: number; segundos: number };
type Desglose = { viaje: number; conexiones: number; causas: number; solucion: number; beneficios: number };
type Resultado = { equipo: string; nombreEquipo: string | null; puntaje: number; segundos: number; desglose: Desglose };

function mezclar<T>(items: T[]) { return [...items].sort(() => Math.random() - 0.5); }
function reloj(segundos: number) { return `${Math.floor(segundos / 60).toString().padStart(2, "0")}:${(segundos % 60).toString().padStart(2, "0")}`; }

export function JuegoCxEx({ codigo, titulo, invitacion, cierre, equipos, equipoParticipanteId, clasificacionInicial, puntos }: {
  codigo: string;
  titulo: string;
  invitacion: string;
  cierre: string;
  equipos: Equipo[];
  equipoParticipanteId: string | null;
  clasificacionInicial: Clasificado[];
  puntos: number;
}) {
  const [pantalla, setPantalla] = useState<"inicio" | "viaje" | "conexiones" | "causas" | "solucion" | "beneficios" | "resultado">("inicio");
  const [equipoId, setEquipoId] = useState(equipoParticipanteId ?? "");
  const [nombreEquipo, setNombreEquipo] = useState("");
  const [tiempo, setTiempo] = useState(DURACION_JUEGO_CX_EX);
  const [iniciado, setIniciado] = useState(false);
  const [viaje, setViaje] = useState(() => mezclar(VIAJE_CX_EX.map((item) => item.id)));
  const [conexionCx, setConexionCx] = useState("");
  const [conexionEx, setConexionEx] = useState("");
  const [conexiones, setConexiones] = useState<{ cx: string; ex: string }[]>([]);
  const [causas, setCausas] = useState<string[]>([]);
  const [solucion, setSolucion] = useState("");
  const [beneficios, setBeneficios] = useState<string[]>([]);
  const [reflexion, setReflexion] = useState("");
  const [bloqueado, setBloqueado] = useState({ viaje: false, conexiones: false, causas: false, solucion: false });
  const [puntajes, setPuntajes] = useState<Desglose>({ viaje: 0, conexiones: 0, causas: 0, solucion: 0, beneficios: 0 });
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [clasificacion, setClasificacion] = useState(clasificacionInicial);
  const [verClasificacion, setVerClasificacion] = useState(false);
  const finalizando = useRef(false);
  const finalizadorTiempo = useRef<(porTiempo?: boolean) => Promise<void>>(finalizar);
  finalizadorTiempo.current = finalizar;

  const total = useMemo(() => Object.values(puntajes).reduce((suma, valor) => suma + valor, 0), [puntajes]);
  const progreso = ({ inicio: 0, viaje: 16, conexiones: 36, causas: 58, solucion: 78, beneficios: 92, resultado: 100 } as const)[pantalla];

  useEffect(() => {
    if (!iniciado || resultado) return;
    const intervalo = window.setInterval(() => setTiempo((actual) => Math.max(0, actual - 1)), 1000);
    return () => window.clearInterval(intervalo);
  }, [iniciado, resultado]);

  useEffect(() => { setClasificacion(clasificacionInicial); }, [clasificacionInicial]);

  useEffect(() => {
    if (tiempo === 0 && iniciado && !resultado && !finalizando.current) void finalizadorTiempo.current(true);
  }, [tiempo, iniciado, resultado]);

  function comenzar() {
    if (!equipoId) { setError("Selecciona un equipo para comenzar."); return; }
    if (clasificacion.some((item) => item.equipoId === equipoId)) { setError("Este equipo ya completó la ronda."); return; }
    setError(""); setIniciado(true); setPantalla("viaje");
  }

  function moverViaje(indice: number, direccion: -1 | 1) {
    if (bloqueado.viaje) return;
    const destino = indice + direccion;
    if (destino < 0 || destino >= viaje.length) return;
    setViaje((actual) => { const copia = [...actual]; [copia[indice], copia[destino]] = [copia[destino], copia[indice]]; return copia; });
  }

  function validarViaje() {
    const aciertos = VIAJE_CX_EX.filter((item, indice) => viaje[indice] === item.id).length;
    setPuntajes((actual) => ({ ...actual, viaje: Math.round(aciertos / 5 * 10) }));
    setBloqueado((actual) => ({ ...actual, viaje: true }));
    setMensaje(aciertos === 5 ? "¡Secuencia completa! La incertidumbre crece después del débito." : `Acertaron ${aciertos} de 5 posiciones. La secuencia es canal, débito, no aplicación, contacto y cobro posterior.`);
  }

  function seleccionarConexion(tipo: "cx" | "ex", id: string) {
    if (bloqueado.conexiones || conexiones.some((item) => item[tipo] === id)) return;
    const cx = tipo === "cx" ? id : conexionCx;
    const ex = tipo === "ex" ? id : conexionEx;
    if (tipo === "cx") setConexionCx(id); else setConexionEx(id);
    if (cx && ex) { setConexiones((actual) => [...actual, { cx, ex }]); setConexionCx(""); setConexionEx(""); }
  }

  function validarConexiones() {
    if (conexiones.length !== 4) { setError("Construyan las cuatro conexiones antes de validar."); return; }
    const aciertos = conexiones.filter((item) => item.cx === item.ex).length;
    setPuntajes((actual) => ({ ...actual, conexiones: Math.round(aciertos / 4 * 10) }));
    setBloqueado((actual) => ({ ...actual, conexiones: true })); setError("");
    setMensaje(aciertos === 4 ? "¡Conexión total! Cada fricción visible tiene una condición interna." : `Acertaron ${aciertos} de 4 conexiones. Relacionen el síntoma del cliente con la restricción operativa.`);
  }

  function validarCausas() {
    if (causas.length !== 4) { setError("Seleccionen exactamente cuatro causas."); return; }
    const correctas = causas.filter((id) => CAUSAS_CX_EX.find((item) => item.id === id)?.correcta).length;
    const valor = Math.max(0, Math.round(correctas * 3.75 - (4 - correctas) * 1.5));
    setPuntajes((actual) => ({ ...actual, causas: valor })); setBloqueado((actual) => ({ ...actual, causas: true })); setError("");
    setMensaje(correctas === 4 ? "¡Causa raíz identificada! La falla combina integración, conciliación, trazabilidad y gobierno." : `Identificaron ${correctas} de 4 causas estructurales.`);
  }

  function validarSolucion() {
    if (!solucion) { setError("Seleccionen una intervención."); return; }
    const correcta = SOLUCIONES_CX_EX.find((item) => item.id === solucion)?.correcta ?? false;
    setPuntajes((actual) => ({ ...actual, solucion: correcta ? 20 : 0 })); setBloqueado((actual) => ({ ...actual, solucion: true })); setError("");
    setMensaje(correcta ? "¡Doble impacto! La solución mejora la visibilidad del cliente y la capacidad de resolución del empleado." : "La opción elegida maneja el síntoma, pero deja intacta la causa operativa.");
  }

  async function finalizar(porTiempo = false) {
    if (finalizando.current) return;
    if (!porTiempo && beneficios.length !== 2) { setError("Seleccionen exactamente dos resultados."); return; }
    finalizando.current = true; setEnviando(true); setError("");
    const juego = {
      viaje: bloqueado.viaje ? viaje : [],
      conexiones: bloqueado.conexiones ? conexiones : [],
      causas: bloqueado.causas ? causas : [],
      solucion: bloqueado.solucion ? solucion : "",
      beneficios,
    };
    try {
      const respuesta = await fetch(`/api/actividades/${encodeURIComponent(codigo)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ equipoId, nombreEquipo, segundos: DURACION_JUEGO_CX_EX - tiempo, reflexion, juego }) });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok) throw new Error(cuerpo.error ?? "No pudimos guardar el resultado.");
      const nuevo = { equipoId, equipo: cuerpo.equipo, nombreEquipo: cuerpo.nombreEquipo, puntaje: cuerpo.puntaje, segundos: cuerpo.segundos };
      setResultado(cuerpo); setPuntajes(cuerpo.desglose); setClasificacion((actual) => [...actual.filter((item) => item.equipoId !== equipoId), nuevo].sort((a, b) => b.puntaje - a.puntaje || a.segundos - b.segundos)); setPantalla("resultado");
    } catch (e) { setError(e instanceof Error ? e.message : "No pudimos guardar el resultado."); }
    finally { setEnviando(false); finalizando.current = false; }
  }

  function reiniciarVista() {
    setPantalla("inicio"); setEquipoId(equipoParticipanteId ?? ""); setNombreEquipo(""); setTiempo(DURACION_JUEGO_CX_EX); setIniciado(false); setViaje(mezclar(VIAJE_CX_EX.map((item) => item.id))); setConexiones([]); setCausas([]); setSolucion(""); setBeneficios([]); setReflexion(""); setBloqueado({ viaje: false, conexiones: false, causas: false, solucion: false }); setPuntajes({ viaje: 0, conexiones: 0, causas: 0, solucion: 0, beneficios: 0 }); setMensaje(""); setError(""); setResultado(null);
  }

  const cabecera = pantalla !== "inicio" && <div className="sticky top-0 z-20 mb-4 overflow-hidden rounded-2xl bg-[var(--epm-azul-profundo)] text-white shadow-lg"><div className="flex items-center gap-4 px-4 py-3"><strong className="min-w-0 flex-1 truncate">Reto CX–EX</strong><span className={`inline-flex items-center gap-2 rounded-full px-3 py-2 font-extrabold ${tiempo <= 120 ? "bg-red-600" : "bg-white/15"}`}><Clock3 size={17} /> {reloj(tiempo)}</span><span className="font-extrabold text-[var(--epm-verde)]">{total}/60</span></div><div className="h-2 bg-white/10"><div className="h-full bg-[var(--epm-verde)] transition-all" style={{ width: `${progreso}%` }} /></div></div>;
  const feedback = mensaje && <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-900">{mensaje}</div>;
  const alerta = error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 font-bold text-red-700">{error}</p>;

  return <div>{cabecera}
    {pantalla === "inicio" && <section className="tarjeta overflow-hidden"><div className="marca-gradiente p-7 text-white sm:p-10"><Sparkles size={44} className="text-[var(--epm-verde)]" /><p className="mt-4 font-extrabold text-[var(--epm-verde)]">Estación Diseño de la Experiencia · 20 minutos</p><h1 className="mt-2 text-3xl font-extrabold sm:text-5xl">{titulo}</h1><p className="mt-4 max-w-4xl text-lg text-white/90">{invitacion}</p></div><div className="grid gap-5 p-5 lg:grid-cols-2 lg:p-8"><div className="rounded-3xl bg-sky-50 p-6"><span className="rounded-full bg-white px-3 py-1 text-sm font-extrabold text-[var(--epm-teal)]">Caso para todos los equipos</span><h2 className="mt-4 text-2xl font-extrabold text-[var(--epm-azul-profundo)]">Pago debitado, pero no aplicado</h2><blockquote className="mt-4 border-l-4 border-[var(--epm-verde-medio)] pl-4 text-lg italic text-slate-700">“El cliente realizó el pago digital. El dinero salió de su cuenta, pero la factura sigue pendiente y continúa recibiendo mensajes de cobro.”</blockquote><p className="mt-4 text-slate-600">Reconstruyan el viaje, abran la caja negra y elijan una solución que mejore simultáneamente CX y EX.</p></div><div><label><span className="etiqueta">Equipo</span><select className="campo" value={equipoId} onChange={(e) => setEquipoId(e.target.value)}><option value="">Seleccionar equipo</option>{equipos.map((item) => <option key={item.id} value={item.id} disabled={clasificacion.some((resultado) => resultado.equipoId === item.id)}>{item.nombre}{clasificacion.some((resultado) => resultado.equipoId === item.id) ? " · ya participó" : ""}</option>)}</select></label><label className="mt-4 block"><span className="etiqueta">Nombre creativo (opcional)</span><input className="campo" maxLength={40} value={nombreEquipo} onChange={(e) => setNombreEquipo(e.target.value)} placeholder="Ejemplo: Conexión total" /></label>{alerta}<div className="mt-5 flex flex-wrap gap-3"><button onClick={comenzar} className="boton-primario">Comenzar reto <ArrowRight size={18} /></button><button onClick={() => setVerClasificacion(true)} className="boton-secundario"><Trophy size={18} /> Ver clasificación</button></div><p className="mt-4 text-sm text-slate-500">Conversen antes de marcar. La persona frente al dispositivo registra la decisión colectiva.</p></div></div></section>}

    {pantalla === "viaje" && <Paso titulo="Reconstruyan el viaje del cliente" descripcion="Ordenen las tarjetas en la secuencia cronológica más lógica." puntos="10 puntos">{viaje.map((id, indice) => { const item = VIAJE_CX_EX.find((opcion) => opcion.id === id)!; return <div key={id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sky-50 font-extrabold text-[var(--epm-azul)]">{indice + 1}</span><span className="min-w-0 flex-1">{item.texto}</span><div className="flex gap-1"><button disabled={bloqueado.viaje || indice === 0} onClick={() => moverViaje(indice, -1)} className="grid h-10 w-10 place-items-center rounded-full border disabled:opacity-30" aria-label="Subir"><ArrowUp size={18} /></button><button disabled={bloqueado.viaje || indice === viaje.length - 1} onClick={() => moverViaje(indice, 1)} className="grid h-10 w-10 place-items-center rounded-full border disabled:opacity-30" aria-label="Bajar"><ArrowDown size={18} /></button></div></div>; })}{feedback}<BotonesPaso bloqueado={bloqueado.viaje} validar={validarViaje} continuar={() => { setMensaje(""); setPantalla("conexiones"); }} /></Paso>}

    {pantalla === "conexiones" && <Paso titulo="Conecten las dos experiencias" descripcion="Seleccionen una vivencia del cliente y la condición del empleado que mejor la explica." puntos="10 puntos"><div className="grid gap-4 lg:grid-cols-2"><Columna titulo="Lo que vive el cliente" items={CONEXIONES_CX_EX.map((i) => ({ id: i.id, texto: i.cx }))} seleccion={conexionCx} usados={conexiones.map((i) => i.cx)} onSelect={(id) => seleccionarConexion("cx", id)} /><Columna titulo="Lo que enfrenta el empleado" items={CONEXIONES_CX_EX.map((i) => ({ id: i.id, texto: i.ex }))} seleccion={conexionEx} usados={conexiones.map((i) => i.ex)} onSelect={(id) => seleccionarConexion("ex", id)} /></div>{conexiones.length > 0 && <div className="mt-4 rounded-2xl bg-sky-50 p-4"><h3 className="font-extrabold">Conexiones construidas</h3>{conexiones.map((par, indice) => <div key={`${par.cx}-${par.ex}`} className="mt-2 flex items-center gap-2 rounded-xl bg-white p-3 text-sm"><Link2 className="shrink-0 text-[var(--epm-teal)]" /><span className="flex-1">{CONEXIONES_CX_EX.find((i) => i.id === par.cx)?.cx}<br />{CONEXIONES_CX_EX.find((i) => i.id === par.ex)?.ex}</span>{!bloqueado.conexiones && <button onClick={() => setConexiones((actual) => actual.filter((_, i) => i !== indice))} className="font-bold text-red-700">Quitar</button>}</div>)}</div>}{feedback}{alerta}<BotonesPaso bloqueado={bloqueado.conexiones} validar={validarConexiones} continuar={() => { setMensaje(""); setPantalla("causas"); }} /></Paso>}

    {pantalla === "causas" && <Paso titulo="Abran la caja negra" descripcion="Seleccionen las cuatro causas internas que explican mejor por qué el pago no se refleja." puntos="15 puntos"><OpcionesMultiples items={CAUSAS_CX_EX} seleccion={causas} maximo={4} bloqueado={bloqueado.causas} onChange={setCausas} />{feedback}{alerta}<BotonesPaso bloqueado={bloqueado.causas} validar={validarCausas} continuar={() => { setMensaje(""); setPantalla("solucion"); }} /></Paso>}

    {pantalla === "solucion" && <Paso titulo="Elijan una solución de doble impacto" descripcion="Marquen la intervención que resolvería la causa de fondo y no solo el síntoma." puntos="20 puntos">{SOLUCIONES_CX_EX.map((item) => <label key={item.id} className={`mt-3 flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 ${solucion === item.id ? "border-[var(--epm-azul)] bg-sky-50" : "border-slate-200"}`}><input type="radio" disabled={bloqueado.solucion} checked={solucion === item.id} onChange={() => setSolucion(item.id)} /><strong className="text-[var(--epm-azul)]">{item.letra}.</strong><span>{item.texto}</span></label>)}{feedback}{alerta}<BotonesPaso bloqueado={bloqueado.solucion} validar={validarSolucion} continuar={() => { setMensaje(""); setPantalla("beneficios"); }} /></Paso>}

    {pantalla === "beneficios" && <Paso titulo="Comprueben el doble impacto" descripcion="Seleccionen los dos resultados que demuestran una mejora real para cliente y empleado." puntos="5 puntos"><OpcionesMultiples items={BENEFICIOS_CX_EX} seleccion={beneficios} maximo={2} bloqueado={false} onChange={setBeneficios} /><label className="mt-5 block"><span className="etiqueta">¿Qué aprendizaje se llevan?</span><textarea className="campo min-h-32" maxLength={240} value={reflexion} onChange={(e) => setReflexion(e.target.value)} placeholder="Escriban una frase de cierre" /></label>{alerta}<button disabled={enviando} onClick={() => void finalizar()} className="boton-primario mt-5 w-full">{enviando ? <LoaderCircle className="animate-spin" /> : <Send />} Finalizar reto</button></Paso>}

    {pantalla === "resultado" && resultado && <section className="tarjeta overflow-hidden"><div className="marca-gradiente p-8 text-center text-white"><CheckCircle2 className="mx-auto text-[var(--epm-verde)]" size={54} /><p className="mt-4 font-extrabold text-[var(--epm-verde)]">Misión completada</p><h1 className="mt-2 text-3xl font-extrabold">{resultado.equipo}{resultado.nombreEquipo ? ` · ${resultado.nombreEquipo}` : ""}</h1><strong className="mt-4 block text-7xl text-amber-200">{resultado.puntaje}</strong><span>puntos de 60 · {reloj(resultado.segundos)}</span><p className="mx-auto mt-5 max-w-3xl text-lg text-white/90">{cierre}</p>{puntos > 0 && <p className="mt-4 font-bold">Además obtuviste {puntos} puntos en la aplicación.</p>}</div><div className="grid gap-5 p-5 lg:grid-cols-2"><div className="rounded-2xl bg-sky-50 p-5"><h2 className="text-xl font-extrabold">Desglose del puntaje</h2>{Object.entries(resultado.desglose).map(([clave, valor]) => <div key={clave} className="mt-3 flex justify-between border-b pb-2"><span>{({ viaje: "Secuencia del viaje", conexiones: "Conexiones CX–EX", causas: "Causas internas", solucion: "Solución de doble impacto", beneficios: "Beneficios CX–EX" } as Record<string, string>)[clave]}</span><strong>{valor}</strong></div>)}</div><div className="rounded-2xl bg-emerald-50 p-5"><h2 className="text-xl font-extrabold">La idea clave</h2><p className="mt-3 leading-relaxed">Toda experiencia visible tiene una experiencia interna que la hace posible.</p>{reflexion && <p className="mt-4 rounded-xl bg-white p-4"><strong>Aprendizaje del equipo:</strong> {reflexion}</p>}<div className="mt-5 flex flex-wrap gap-2"><button onClick={() => setVerClasificacion(true)} className="boton-secundario"><Trophy size={18} /> Ver clasificación</button><button onClick={reiniciarVista} className="boton-secundario"><RotateCcw size={18} /> Otro equipo</button></div></div></div></section>}

    {verClasificacion && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4" onClick={() => setVerClasificacion(false)}><div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}><div className="flex items-center justify-between"><h2 className="text-2xl font-extrabold text-[var(--epm-azul-profundo)]">Clasificación de equipos</h2><button onClick={() => setVerClasificacion(false)} className="rounded-full px-4 py-2 font-bold">Cerrar</button></div>{clasificacion.length ? <div className="mt-5 space-y-2">{clasificacion.map((item, indice) => <div key={item.equipoId} className="grid grid-cols-[45px_1fr_auto_auto] items-center gap-3 rounded-2xl bg-slate-50 p-3"><strong className="text-xl text-[var(--epm-azul)]">{indice + 1}</strong><span><strong className="block">{item.equipo}</strong>{item.nombreEquipo && <small>{item.nombreEquipo}</small>}</span><strong>{item.puntaje}/60</strong><span className="text-sm text-slate-500">{reloj(item.segundos)}</span></div>)}</div> : <p className="mt-5 rounded-2xl bg-sky-50 p-5">Aún no hay resultados registrados.</p>}</div></div>}
  </div>;
}

function Paso({ titulo, descripcion, puntos, children }: { titulo: string; descripcion: string; puntos: string; children: React.ReactNode }) { return <section className="tarjeta p-5 sm:p-7"><div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><span className="font-extrabold text-[var(--epm-teal)]">{puntos}</span><h1 className="mt-1 text-2xl font-extrabold text-[var(--epm-azul-profundo)] sm:text-3xl">{titulo}</h1><p className="mt-2 text-slate-600">{descripcion}</p></div></div>{children}</section>; }
function BotonesPaso({ bloqueado, validar, continuar }: { bloqueado: boolean; validar: () => void; continuar: () => void }) { return <div className="mt-5 flex flex-wrap gap-3">{!bloqueado ? <button onClick={validar} className="boton-primario">Validar respuesta</button> : <button onClick={continuar} className="boton-primario">Continuar <ArrowRight size={18} /></button>}</div>; }
function Columna({ titulo, items, seleccion, usados, onSelect }: { titulo: string; items: { id: string; texto: string }[]; seleccion: string; usados: string[]; onSelect: (id: string) => void }) { return <div className="rounded-2xl bg-slate-50 p-4"><h3 className="mb-3 font-extrabold text-[var(--epm-azul-profundo)]">{titulo}</h3>{items.map((item) => <button key={item.id} disabled={usados.includes(item.id)} onClick={() => onSelect(item.id)} className={`mb-2 w-full rounded-xl border-2 p-3 text-left text-sm transition disabled:opacity-35 ${seleccion === item.id ? "border-[var(--epm-azul)] bg-sky-100" : "border-white bg-white"}`}>{item.texto}</button>)}</div>; }
function OpcionesMultiples({ items, seleccion, maximo, bloqueado, onChange }: { items: { id: string; texto: string }[]; seleccion: string[]; maximo: number; bloqueado: boolean; onChange: (ids: string[]) => void }) { return <div className="grid gap-3 md:grid-cols-2">{items.map((item) => { const activa = seleccion.includes(item.id); return <label key={item.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 ${activa ? "border-[var(--epm-azul)] bg-sky-50" : "border-slate-200"}`}><input type="checkbox" disabled={bloqueado || (!activa && seleccion.length >= maximo)} checked={activa} onChange={() => onChange(activa ? seleccion.filter((id) => id !== item.id) : [...seleccion, item.id])} /><span>{item.texto}</span></label>; })}</div>; }
