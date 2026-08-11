"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Clock3, Flag, Flame, Heart, LoaderCircle, RotateCcw, Trash2, X } from "lucide-react";
import { comprimirImagenHasta } from "@/lib/imagen";
import { FotoCircular } from "@/components/marca/FotoCircular";
import { usePollingVisible } from "@/lib/usePollingVisible";
import type { TipoReaccionRecuerdo } from "@/lib/recuerdos";

type ResumenReacciones = {
  corazon: number;
  risa: number;
  total: number;
  mias: TipoReaccionRecuerdo[];
};

type Recuerdo = {
  id: string;
  urlFoto: string;
  urlMiniatura: string;
  descripcion: string | null;
  participanteId: string;
  reacciones: ResumenReacciones;
  participante: {
    nombre: string;
    urlFoto: string;
    empresa: { nombre: string };
  };
};

type Carga = { archivo: File; estado: "pendiente" | "subiendo" | "listo" | "error"; error?: string; clave: string };
type Orden = "recientes" | "populares";
type Cupo = { limite: number; usados: number; restantes: number };

function BotonesReaccion({
  recuerdo,
  reaccionando,
  reaccionar,
}: {
  recuerdo: Recuerdo;
  reaccionando: string | null;
  reaccionar: (recuerdo: Recuerdo, tipo: TipoReaccionRecuerdo) => void;
}) {
  const corazonActivo = recuerdo.reacciones.mias.includes("CORAZON");
  const risaActiva = recuerdo.reacciones.mias.includes("RISA");
  return (
    <div className="flex items-center gap-2" aria-label="Reacciones del recuerdo">
      <button
        type="button"
        aria-label={`${corazonActivo ? "Quitar" : "Dar"} corazón. ${recuerdo.reacciones.corazon} reacciones`}
        aria-pressed={corazonActivo}
        disabled={reaccionando === `${recuerdo.id}:CORAZON`}
        onClick={() => reaccionar(recuerdo, "CORAZON")}
        className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-sm font-extrabold transition ${corazonActivo ? "border-rose-200 bg-rose-50 text-rose-600" : "border-slate-200 bg-slate-50 text-slate-600"}`}
      >
        <Heart size={19} className={corazonActivo ? "fill-current" : ""} />
        {recuerdo.reacciones.corazon}
      </button>
      <button
        type="button"
        aria-label={`${risaActiva ? "Quitar" : "Dar"} reacción de risa. ${recuerdo.reacciones.risa} reacciones`}
        aria-pressed={risaActiva}
        disabled={reaccionando === `${recuerdo.id}:RISA`}
        onClick={() => reaccionar(recuerdo, "RISA")}
        className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-sm font-extrabold transition ${risaActiva ? "border-amber-200 bg-amber-50 text-amber-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}
      >
        <span aria-hidden="true" className="text-lg leading-none">😂</span>
        {recuerdo.reacciones.risa}
      </button>
    </div>
  );
}

export function MuroRecuerdos({
  iniciales,
  participanteId,
  abrirSubida,
  cupoInicial,
}: {
  iniciales: Recuerdo[];
  participanteId: string;
  abrirSubida: boolean;
  cupoInicial: Cupo;
}) {
  const [recuerdos, setRecuerdos] = useState(iniciales);
  const [mios, setMios] = useState(false);
  const [orden, setOrden] = useState<Orden>("recientes");
  const [modalSubida, setModalSubida] = useState(abrirSubida);
  const [seleccionado, setSeleccionado] = useState<Recuerdo>();
  const [cargas, setCargas] = useState<Carga[]>([]);
  const [descripcion, setDescripcion] = useState("");
  const [reaccionando, setReaccionando] = useState<string | null>(null);
  const [errorReaccion, setErrorReaccion] = useState("");
  const [cupo, setCupo] = useState(cupoInicial);
  const pagina = useRef(1);
  const cargarMasRef = useRef<HTMLButtonElement>(null);
  const cargandoMas = useRef(false);
  const [hayMas, setHayMas] = useState(iniciales.length === 18);

  async function recargar(propios: boolean, nuevoOrden: Orden = orden) {
    const respuesta = await fetch(`/api/recuerdos?mios=${propios ? 1 : 0}&orden=${nuevoOrden}`);
    if (!respuesta.ok) return;
    const cuerpo = await respuesta.json();
    setRecuerdos(cuerpo.recuerdos);
    if (cuerpo.cupo) setCupo(cuerpo.cupo);
    pagina.current = 1;
    setHayMas(Boolean(cuerpo.siguiente));
  }

  async function reaccionar(recuerdo: Recuerdo, tipo: TipoReaccionRecuerdo) {
    const clave = `${recuerdo.id}:${tipo}`;
    if (reaccionando) return;
    setReaccionando(clave);
    setErrorReaccion("");
    try {
      const respuesta = await fetch(`/api/recuerdos/${recuerdo.id}/reaccion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo }),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok) throw new Error(cuerpo.error || "No pudimos guardar tu reacción.");
      const actualizar = (item: Recuerdo) => item.id === recuerdo.id ? { ...item, reacciones: cuerpo.reacciones } : item;
      setRecuerdos((actuales) => actuales.map(actualizar));
      setSeleccionado((actual) => actual ? actualizar(actual) : actual);
    } catch (error) {
      setErrorReaccion(error instanceof Error ? error.message : "No pudimos guardar tu reacción.");
    } finally {
      setReaccionando(null);
    }
  }

  async function subirUna(carga: Carga) {
    setCargas((actual) => actual.map((c) => c.clave === carga.clave ? { ...c, estado: "subiendo", error: undefined } : c));
    try {
      // Procesarlas una por una evita mantener dos copias gigantes de la foto en memoria,
      // algo especialmente importante en iPhone y Android con cámaras de alta resolución.
      const foto = await comprimirImagenHasta(carga.archivo, 1600, 650_000, 0.78);
      const miniatura = await comprimirImagenHasta(carga.archivo, 480, 90_000, 0.72);
      const datos = new FormData();
      datos.set("foto", foto, "recuerdo.webp");
      datos.set("miniatura", miniatura, "miniatura.webp");
      datos.set("descripcion", descripcion);
      const controlador = new AbortController();
      const timeout = setTimeout(() => controlador.abort(), 60_000);
      const respuesta = await fetch("/api/recuerdos", {
        method: "POST",
        body: datos,
        headers: { "Idempotency-Key": carga.clave },
        signal: controlador.signal,
      }).finally(() => clearTimeout(timeout));
      const cuerpo = await respuesta.json();
      if (!respuesta.ok) throw new Error(cuerpo.error);
      setCargas((actual) => actual.map((c) => c.clave === carga.clave ? { ...c, estado: "listo" } : c));
    } catch (error) {
      setCargas((actual) => actual.map((c) => c.clave === carga.clave ? { ...c, estado: "error", error: error instanceof Error ? error.message : "Error de red" } : c));
    }
  }

  async function subirPendientes() {
    const pendientes = cargas.filter((c) => c.estado === "pendiente" || c.estado === "error");
    for (let inicio = 0; inicio < pendientes.length; inicio += 2) {
      await Promise.all(pendientes.slice(inicio, inicio + 2).map(subirUna));
    }
    await recargar(mios);
  }

  usePollingVisible(() => recargar(mios), 30_000);

  useEffect(() => {
    const boton = cargarMasRef.current;
    if (!boton || !hayMas) return;
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) boton.click();
      },
      { rootMargin: "300px" },
    );
    observador.observe(boton);
    return () => observador.disconnect();
  }, [hayMas, recuerdos.length]);

  useEffect(() => {
    if (!seleccionado && !modalSubida) return;
    const cerrar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        setSeleccionado(undefined);
        setModalSubida(false);
      }
    };
    document.addEventListener("keydown", cerrar);
    return () => document.removeEventListener("keydown", cerrar);
  }, [seleccionado, modalSubida]);

  async function accion(id: string, tipo: "reportar" | "eliminar") {
    const respuesta = await fetch("/api/recuerdos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, accion: tipo }),
    });
    if (respuesta.ok) {
      if (tipo === "eliminar") setRecuerdos((actuales) => actuales.filter((foto) => foto.id !== id));
      setSeleccionado(undefined);
    }
  }

  return (
    <>
      <div className="mt-5 grid gap-2 rounded-[1.4rem] bg-white p-2 shadow-soft sm:grid-cols-2">
        <div className="grid grid-cols-2 gap-1 rounded-full bg-slate-100 p-1">
          {[false, true].map((propios) => (
            <button key={String(propios)} onClick={() => { setMios(propios); void recargar(propios); }} className={`rounded-full px-3 py-2 text-sm font-extrabold ${mios === propios ? "bg-[var(--epm-azul)] text-white shadow" : "text-slate-600"}`}>
              {propios ? "Mis recuerdos" : "Todos"}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1 rounded-full bg-slate-100 p-1">
          <button onClick={() => { setOrden("recientes"); void recargar(mios, "recientes"); }} className={`inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-extrabold ${orden === "recientes" ? "bg-white text-[var(--epm-azul-profundo)] shadow" : "text-slate-600"}`}><Clock3 size={17} /> Recientes</button>
          <button onClick={() => { setOrden("populares"); void recargar(mios, "populares"); }} className={`inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-extrabold ${orden === "populares" ? "bg-gradient-to-r from-rose-500 to-amber-400 text-white shadow" : "text-slate-600"}`}><Flame size={17} /> Populares</button>
        </div>
      </div>
      <div className="my-5 rounded-2xl bg-white p-3 shadow-soft">
        <button disabled={cupo.restantes === 0} onClick={() => setModalSubida(true)} className="boton-primario w-full disabled:cursor-not-allowed disabled:opacity-50"><Camera /> {cupo.restantes > 0 ? "Subir recuerdo" : "Cupo de recuerdos completo"}</button>
        <p className="mt-2 text-center text-xs font-bold text-slate-500">Has usado {cupo.usados} de {cupo.limite} recuerdos · {cupo.restantes} disponibles</p>
      </div>
      {errorReaccion && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-center text-sm font-bold text-red-700">{errorReaccion}</p>}
      <div className="columns-2 gap-3 md:columns-3 lg:columns-4">
        {recuerdos.map((recuerdo) => (
          <article key={recuerdo.id} className="entrada-suave mb-3 break-inside-avoid overflow-hidden rounded-2xl bg-white shadow-soft">
            <button type="button" onClick={() => setSeleccionado(recuerdo)} className="group relative block min-h-0 w-full overflow-hidden" aria-label={`Ampliar recuerdo de ${recuerdo.participante.nombre}`}>
              <img src={recuerdo.urlMiniatura} alt={recuerdo.descripcion || `Recuerdo de ${recuerdo.participante.nombre}`} loading="lazy" className="h-auto w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
              {recuerdo.reacciones.total > 0 && <span className="absolute right-2 top-2 rounded-full bg-slate-950/70 px-2 py-1 text-[11px] font-extrabold text-white backdrop-blur">{recuerdo.reacciones.total} reacciones</span>}
            </button>
            {recuerdo.descripcion && <p className="px-3 pt-3 text-sm font-bold leading-snug">{recuerdo.descripcion}</p>}
            <div className="space-y-2 p-3">
              <BotonesReaccion recuerdo={recuerdo} reaccionando={reaccionando} reaccionar={(item, tipo) => void reaccionar(item, tipo)} />
              <div className="flex items-center gap-2 border-t border-slate-100 pt-2">
                <FotoCircular src={recuerdo.participante.urlFoto} alt={`Foto de ${recuerdo.participante.nombre}`} className="h-8 w-8 border-2" />
                <div className="min-w-0"><p className="truncate text-xs font-extrabold text-[var(--epm-azul-profundo)]">{recuerdo.participante.nombre}</p><p className="truncate text-[10px] text-slate-500">{recuerdo.participante.empresa.nombre}</p></div>
              </div>
            </div>
          </article>
        ))}
      </div>
      {hayMas && (
        <button
          ref={cargarMasRef}
          className="boton-secundario mx-auto mt-4 flex"
          onClick={async () => {
            if (cargandoMas.current) return;
            cargandoMas.current = true;
            const siguiente = pagina.current + 1;
            try {
              const respuesta = await fetch(`/api/recuerdos?pagina=${siguiente}&mios=${mios ? 1 : 0}&orden=${orden}`);
              const cuerpo = await respuesta.json();
              setRecuerdos((actual) => [...actual, ...cuerpo.recuerdos]);
              pagina.current = siguiente;
              setHayMas(Boolean(cuerpo.siguiente));
            } finally {
              cargandoMas.current = false;
            }
          }}
        >
          Cargar más
        </button>
      )}
      {modalSubida && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-[var(--epm-azul-profundo)]/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="titulo-subir-recuerdos">
          <div className="tarjeta mx-auto mt-8 max-w-lg p-5">
            <button onClick={() => setModalSubida(false)} className="ml-auto grid h-11 w-11 place-items-center rounded-full bg-slate-100" aria-label="Cerrar"><X /></button>
            <h2 id="titulo-subir-recuerdos" className="text-2xl font-extrabold">Subir recuerdos</h2>
            <p className="mt-1 text-sm text-slate-600">Elige hasta 5 fotos. Si una falla, podrás reintentar solo esa.</p>
            <label className="boton-secundario mt-4 w-full cursor-pointer"><Camera /> Elegir fotos<input type="file" accept="image/*" multiple className="sr-only" onChange={(evento) => setCargas(Array.from(evento.target.files ?? []).slice(0, Math.min(5, cupo.restantes)).map((archivo) => ({ archivo, estado: "pendiente", clave: crypto.randomUUID() })))} /></label>
            <p className="mt-2 text-center text-xs text-slate-500">Puedes elegir hasta {Math.min(5, cupo.restantes)} en esta carga.</p>
            <div className="mt-3 space-y-2">
              {cargas.map((carga) => (
                <div key={carga.clave} className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-3">
                  <span className="min-w-0 flex-1 truncate text-sm font-bold">{carga.archivo.name}</span>
                  {carga.estado === "subiendo" && <LoaderCircle className="animate-spin text-[var(--epm-azul)]" />}
                  {carga.estado === "listo" && <span className="font-extrabold text-[var(--epm-verde-medio)]">Listo</span>}
                  {carga.estado === "error" && <button onClick={() => void subirUna(carga)} className="flex items-center gap-1 text-sm font-extrabold text-red-700"><RotateCcw size={17} /> Reintentar</button>}
                  {carga.estado === "error" && carga.error && <p role="alert" className="basis-full text-xs font-bold text-red-700">{carga.error}</p>}
                </div>
              ))}
            </div>
            <label className="etiqueta mt-4" htmlFor="descripcion">Descripción opcional</label>
            <textarea id="descripcion" className="campo" maxLength={140} value={descripcion} onChange={(evento) => setDescripcion(evento.target.value)} />
            <p className="mt-1 text-right text-xs text-slate-500">{descripcion.length}/140</p>
            <button disabled={!cargas.length || cargas.every((carga) => carga.estado === "listo")} onClick={() => void subirPendientes()} className="boton-primario mt-3 w-full">Subir fotos pendientes</button>
          </div>
        </div>
      )}
      {seleccionado && (
        <div className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-slate-950/90 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="autor-recuerdo">
          <div className="w-full max-w-4xl overflow-hidden rounded-[1.75rem] bg-white shadow-2xl">
            <div className="flex items-center gap-3 p-4">
              <FotoCircular src={seleccionado.participante.urlFoto} alt={`Foto de ${seleccionado.participante.nombre}`} className="h-12 w-12" />
              <div className="min-w-0 flex-1"><strong id="autor-recuerdo">{seleccionado.participante.nombre}</strong><p className="text-xs text-slate-500">{seleccionado.participante.empresa.nombre}</p></div>
              <button onClick={() => setSeleccionado(undefined)} aria-label="Cerrar foto ampliada" className="grid h-11 w-11 place-items-center rounded-full bg-slate-100"><X /></button>
            </div>
            <img src={seleccionado.urlFoto} alt={seleccionado.descripcion || "Recuerdo ampliado"} className="max-h-[68vh] w-full bg-slate-950 object-contain" />
            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1"><p className="text-sm">{seleccionado.descripcion}</p><BotonesReaccion recuerdo={seleccionado} reaccionando={reaccionando} reaccionar={(item, tipo) => void reaccionar(item, tipo)} /></div>
              {seleccionado.participanteId === participanteId ? (
                <button onClick={() => void accion(seleccionado.id, "eliminar")} className="flex items-center gap-1 text-sm font-extrabold text-red-700"><Trash2 size={17} /> Eliminar</button>
              ) : (
                <button onClick={() => void accion(seleccionado.id, "reportar")} className="flex items-center gap-1 text-sm font-bold text-slate-500"><Flag size={16} /> Reportar</button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
