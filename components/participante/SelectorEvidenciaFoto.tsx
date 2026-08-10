"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Check, ImagePlus, LoaderCircle, X } from "lucide-react";

export function SelectorEvidenciaFoto({ alSeleccionar }: { alSeleccionar: (foto: File) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const flujo = useRef<MediaStream | null>(null);
  const [camaraActiva, setCamaraActiva] = useState(false);
  const [abriendo, setAbriendo] = useState(false);
  const [errorCamara, setErrorCamara] = useState("");
  const [seleccion, setSeleccion] = useState<"camara" | "galeria" | null>(null);

  function cerrarCamara() {
    flujo.current?.getTracks().forEach((pista) => pista.stop());
    flujo.current = null;
    if (video.current) video.current.srcObject = null;
    setCamaraActiva(false);
  }

  useEffect(() => () => {
    flujo.current?.getTracks().forEach((pista) => pista.stop());
    flujo.current = null;
  }, []);

  useEffect(() => {
    if (camaraActiva && video.current && flujo.current) {
      video.current.srcObject = flujo.current;
      void video.current.play().catch(() => undefined);
    }
  }, [camaraActiva]);

  async function abrirCamara() {
    setAbriendo(true);
    setErrorCamara("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("CAMARA_NO_DISPONIBLE");
      flujo.current = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1600 }, height: { ideal: 1200 } },
      });
      setCamaraActiva(true);
    } catch {
      cerrarCamara();
      setErrorCamara("No pudimos abrir la cámara desde el navegador. Revisa el permiso o usa la opción alternativa.");
    } finally {
      setAbriendo(false);
    }
  }

  function capturar() {
    const elemento = video.current;
    if (!elemento?.videoWidth || !elemento.videoHeight) return;
    const lienzo = document.createElement("canvas");
    lienzo.width = elemento.videoWidth;
    lienzo.height = elemento.videoHeight;
    lienzo.getContext("2d")?.drawImage(elemento, 0, 0);
    lienzo.toBlob((blob) => {
      if (!blob) return;
      const foto = new File([blob], `foto-${Date.now()}.jpg`, { type: "image/jpeg" });
      alSeleccionar(foto);
      setSeleccion("camara");
      cerrarCamara();
    }, "image/jpeg", 0.9);
  }

  function seleccionarArchivo(archivo: File | undefined, origen: "camara" | "galeria") {
    if (!archivo) return;
    alSeleccionar(archivo);
    setSeleccion(origen);
    setErrorCamara("");
  }

  return (
    <fieldset>
      <legend className="etiqueta">Foto de evidencia</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className={`rounded-2xl border-2 p-4 transition ${seleccion === "camara" ? "border-[var(--epm-azul)] bg-sky-50" : "border-slate-200 bg-white"}`}>
          <span className="flex items-center gap-2 font-extrabold text-[var(--epm-azul-profundo)]"><Camera className="text-[var(--epm-azul)]" /> Tomar foto</span>
          <p className="mt-1 text-xs text-slate-500">Abre la cámara del celular o la cámara web del computador.</p>
          <button type="button" onClick={() => void abrirCamara()} disabled={abriendo || camaraActiva} className="boton-secundario mt-3 w-full !min-h-10 !px-3 text-sm disabled:opacity-60">
            {abriendo ? <LoaderCircle className="animate-spin" size={18} /> : <Camera size={18} />} {abriendo ? "Abriendo…" : "Abrir cámara"}
          </button>
          {seleccion === "camara" && <p className="mt-2 flex items-center gap-1 text-xs font-bold text-emerald-700"><Check size={15} /> Foto tomada</p>}
        </div>
        <label className={`cursor-pointer rounded-2xl border-2 p-4 transition ${seleccion === "galeria" ? "border-[var(--epm-teal)] bg-emerald-50" : "border-slate-200 bg-white"}`}>
          <span className="flex items-center gap-2 font-extrabold text-[var(--epm-azul-profundo)]"><ImagePlus className="text-[var(--epm-teal)]" /> Elegir de la galería</span>
          <span className="mt-1 block text-xs text-slate-500">Selecciona una foto del celular o un archivo del computador.</span>
          <input className="mt-3 block w-full text-xs file:mr-2 file:rounded-full file:border-0 file:bg-white file:px-3 file:py-2 file:font-bold file:text-[var(--epm-teal)]" type="file" accept="image/*" onChange={(evento) => seleccionarArchivo(evento.currentTarget.files?.[0], "galeria")} />
          {seleccion === "galeria" && <span className="mt-2 flex items-center gap-1 text-xs font-bold text-emerald-700"><Check size={15} /> Foto seleccionada</span>}
        </label>
      </div>

      {camaraActiva && (
        <div className="mt-4 overflow-hidden rounded-2xl bg-slate-950 p-3">
          <video ref={video} autoPlay muted playsInline className="max-h-[62vh] w-full rounded-xl object-contain" />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={capturar} className="boton-primario"><Camera size={18} /> Capturar foto</button>
            <button type="button" onClick={cerrarCamara} className="boton-secundario !border-white/30 !text-white"><X size={18} /> Cancelar</button>
          </div>
        </div>
      )}

      {errorCamara && (
        <div role="alert" className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          <p className="flex items-start gap-2 font-bold"><CameraOff className="mt-0.5 shrink-0" size={18} /> {errorCamara}</p>
          <label className="mt-3 block cursor-pointer rounded-xl bg-white p-3 font-bold text-[var(--epm-azul)]">
            Usar la cámara del dispositivo
            <input className="mt-2 block w-full text-xs" type="file" accept="image/*" capture="environment" onChange={(evento) => seleccionarArchivo(evento.currentTarget.files?.[0], "camara")} />
          </label>
        </div>
      )}
      <p className="mt-2 text-xs text-slate-500">Puedes usar la foto original; Pasaporte la comprime y optimiza automáticamente.</p>
    </fieldset>
  );
}
