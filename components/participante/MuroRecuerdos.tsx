"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, LoaderCircle, RotateCcw, Trash2, Flag, X } from "lucide-react";
import { comprimirImagen } from "@/lib/imagen";
import { FotoCircular } from "@/components/marca/FotoCircular";
import { usePollingVisible } from "@/lib/usePollingVisible";

type Recuerdo = {
  id: string;
  urlFoto: string;
  urlMiniatura: string;
  descripcion: string | null;
  participanteId: string;
  participante: {
    nombre: string;
    urlFoto: string;
    grupo: { nombre: string; colorHex: string };
    empresa: { nombre: string };
  };
};

type Carga = { archivo: File; estado: "pendiente" | "subiendo" | "listo" | "error"; error?: string; clave: string };

export function MuroRecuerdos({
  iniciales,
  participanteId,
  abrirSubida,
}: {
  iniciales: Recuerdo[];
  participanteId: string;
  abrirSubida: boolean;
}) {
  const [recuerdos, setRecuerdos] = useState(iniciales);
  const [mios, setMios] = useState(false);
  const [modalSubida, setModalSubida] = useState(abrirSubida);
  const [seleccionado, setSeleccionado] = useState<Recuerdo>();
  const [cargas, setCargas] = useState<Carga[]>([]);
  const [descripcion, setDescripcion] = useState("");
  const pagina = useRef(1);
  const cargarMasRef = useRef<HTMLButtonElement>(null);
  const cargandoMas = useRef(false);
  const [hayMas, setHayMas] = useState(iniciales.length === 18);

  async function recargar(propios: boolean) {
    const respuesta = await fetch(`/api/recuerdos?mios=${propios ? 1 : 0}`);
    if (!respuesta.ok) return;
    const cuerpo = await respuesta.json();
    setRecuerdos(cuerpo.recuerdos);
    pagina.current = 1;
    setHayMas(Boolean(cuerpo.siguiente));
  }

  async function subirUna(carga: Carga) {
    setCargas((actual) => actual.map((c) => c.clave === carga.clave ? { ...c, estado: "subiendo", error: undefined } : c));
    try {
      const [foto, miniatura] = await Promise.all([
        comprimirImagen(carga.archivo, 1200, 0.8),
        comprimirImagen(carga.archivo, 300, 0.78),
      ]);
      const datos = new FormData();
      datos.set("foto", foto, "recuerdo.jpg");
      datos.set("miniatura", miniatura, "miniatura.jpg");
      datos.set("descripcion", descripcion);
      const controlador = new AbortController();
      const timeout = setTimeout(() => controlador.abort(), 30_000);
      const respuesta = await fetch("/api/recuerdos", {
        method: "POST",
        body: datos,
        headers: { "Idempotency-Key": carga.clave },
        signal: controlador.signal,
      });
      clearTimeout(timeout);
      const cuerpo = await respuesta.json();
      if (!respuesta.ok) throw new Error(cuerpo.error);
      setCargas((actual) => actual.map((c) => c.clave === carga.clave ? { ...c, estado: "listo" } : c));
    } catch (e) {
      setCargas((actual) => actual.map((c) => c.clave === carga.clave ? { ...c, estado: "error", error: e instanceof Error ? e.message : "Error de red" } : c));
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

  async function accion(id: string, tipo: "reportar" | "eliminar") {
    const respuesta = await fetch("/api/recuerdos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, accion: tipo }),
    });
    if (respuesta.ok) {
      if (tipo === "eliminar") setRecuerdos((r) => r.filter((foto) => foto.id !== id));
      setSeleccionado(undefined);
    }
  }

  return (
    <>
      <div className="mt-5 flex gap-2">
        {[false, true].map((propios) => (
          <button key={String(propios)} onClick={() => { setMios(propios); void recargar(propios); }} className={`flex-1 rounded-full px-4 py-2 font-extrabold ${mios === propios ? "bg-[var(--epm-azul)] text-white" : "bg-white text-slate-600 shadow-soft"}`}>
            {propios ? "Mis recuerdos" : "Todos"}
          </button>
        ))}
      </div>
      <button onClick={() => setModalSubida(true)} className="boton-primario my-5 w-full"><Camera /> Subir recuerdo</button>
      <div className="columns-2 gap-3 md:columns-3 lg:columns-4">
        {recuerdos.map((recuerdo) => (
          <button key={recuerdo.id} onClick={() => setSeleccionado(recuerdo)} className="entrada-suave mb-3 block w-full break-inside-avoid overflow-hidden rounded-2xl bg-white text-left shadow-soft">
            <img src={recuerdo.urlMiniatura} alt={recuerdo.descripcion || `Recuerdo de ${recuerdo.participante.nombre}`} loading="lazy" className="h-auto w-full object-cover" />
            {recuerdo.descripcion && <p className="p-3 text-sm font-bold">{recuerdo.descripcion}</p>}
          </button>
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
              const respuesta = await fetch(`/api/recuerdos?pagina=${siguiente}&mios=${mios ? 1 : 0}`);
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
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-[var(--epm-azul-profundo)]/75 p-4 backdrop-blur-sm">
          <div className="tarjeta mx-auto mt-8 max-w-lg p-5">
            <button onClick={() => setModalSubida(false)} className="ml-auto grid h-11 w-11 place-items-center rounded-full bg-slate-100" aria-label="Cerrar"><X /></button>
            <h2 className="text-2xl font-extrabold">Subir recuerdos</h2>
            <p className="mt-1 text-sm text-slate-600">Elige hasta 5 fotos. Si una falla, podrás reintentar solo esa.</p>
            <label className="boton-secundario mt-4 w-full cursor-pointer"><Camera /> Elegir fotos<input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => setCargas(Array.from(e.target.files ?? []).slice(0, 5).map((archivo) => ({ archivo, estado: "pendiente", clave: crypto.randomUUID() })))} /></label>
            <div className="mt-3 space-y-2">
              {cargas.map((carga) => (
                <div key={carga.clave} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                  <span className="min-w-0 flex-1 truncate text-sm font-bold">{carga.archivo.name}</span>
                  {carga.estado === "subiendo" && <LoaderCircle className="animate-spin text-[var(--epm-azul)]" />}
                  {carga.estado === "listo" && <span className="font-extrabold text-[var(--epm-verde-medio)]">Listo</span>}
                  {carga.estado === "error" && <button onClick={() => void subirUna(carga)} className="flex items-center gap-1 text-sm font-extrabold text-red-700"><RotateCcw size={17} /> Reintentar</button>}
                </div>
              ))}
            </div>
            <label className="etiqueta mt-4" htmlFor="descripcion">Descripción opcional</label>
            <textarea id="descripcion" className="campo" maxLength={140} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
            <p className="mt-1 text-right text-xs text-slate-500">{descripcion.length}/140</p>
            <button disabled={!cargas.length || cargas.every((c) => c.estado === "listo")} onClick={() => void subirPendientes()} className="boton-primario mt-3 w-full">Subir fotos pendientes</button>
          </div>
        </div>
      )}
      {seleccionado && (
        <div className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-slate-950/85 p-4">
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white">
            <div className="flex items-center gap-3 p-4">
              <FotoCircular src={seleccionado.participante.urlFoto} alt={`Foto de ${seleccionado.participante.nombre}`} className="h-12 w-12" />
              <div className="min-w-0 flex-1"><strong>{seleccionado.participante.nombre}</strong><p className="text-xs text-slate-500">{seleccionado.participante.empresa.nombre} · {seleccionado.participante.grupo.nombre}</p></div>
              <button onClick={() => setSeleccionado(undefined)} aria-label="Cerrar" className="grid h-11 w-11 place-items-center rounded-full bg-slate-100"><X /></button>
            </div>
            <img src={seleccionado.urlFoto} alt={seleccionado.descripcion || "Recuerdo ampliado"} className="max-h-[65vh] w-full object-contain bg-slate-950" />
            <div className="flex items-center justify-between gap-3 p-4">
              <p className="text-sm">{seleccionado.descripcion}</p>
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
