"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { comprimirImagen } from "@/lib/imagen";
import { extensionImagen } from "@/lib/archivos";

export function InputImagenOptimizada({
  name,
  maximo,
  calidad,
  maxBytes,
  multiple = false,
  maxArchivos = 1,
  required = false,
  className = "",
}: {
  name: string;
  maximo: number;
  calidad: number;
  maxBytes: number;
  multiple?: boolean;
  maxArchivos?: number;
  required?: boolean;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const formulario = inputRef.current?.form;
    if (!formulario) return;
    const comprobar = (evento: SubmitEvent) => {
      if (!procesando) return;
      evento.preventDefault();
      window.alert("Espera un momento: todavía estamos optimizando las imágenes.");
    };
    formulario.addEventListener("submit", comprobar);
    return () => formulario.removeEventListener("submit", comprobar);
  }, [procesando]);

  async function optimizar(archivos: File[]) {
    const transferencia = new DataTransfer();
    let original = 0;
    let optimizado = 0;
    for (const archivo of archivos.slice(0, maxArchivos)) {
      original += archivo.size;
      let calidadActual = calidad;
      let blob = await comprimirImagen(archivo, maximo, calidadActual);
      while (blob.size > maxBytes && calidadActual > 0.48) {
        calidadActual -= 0.08;
        blob = await comprimirImagen(archivo, maximo, calidadActual);
      }
      if (blob.size > maxBytes) {
        throw new Error(`No pudimos reducir ${archivo.name} al tamaño permitido.`);
      }
      optimizado += blob.size;
      const nombreBase = archivo.name.replace(/\.[^.]+$/, "").slice(0, 80) || "imagen";
      const extension = extensionImagen(blob.type) ?? "webp";
      transferencia.items.add(new File([blob], `${nombreBase}.${extension}`, { type: blob.type }));
    }
    if (inputRef.current) inputRef.current.files = transferencia.files;
    const ahorro = original > 0 ? Math.max(0, Math.round((1 - optimizado / original) * 100)) : 0;
    setMensaje(`${transferencia.files.length} imagen${transferencia.files.length === 1 ? "" : "es"} lista${transferencia.files.length === 1 ? "" : "s"} · ${ahorro}% menos espacio`);
  }

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept="image/jpeg,image/png,image/webp"
        multiple={multiple}
        required={required}
        disabled={procesando}
        className="min-h-0 w-full text-xs"
        onChange={async (evento) => {
          const archivos = Array.from(evento.currentTarget.files ?? []);
          if (!archivos.length) return;
          setProcesando(true);
          setMensaje("");
          setError("");
          try {
            await optimizar(archivos);
          } catch (e) {
            evento.currentTarget.value = "";
            setError(e instanceof Error ? e.message : "No pudimos optimizar la imagen.");
          } finally {
            setProcesando(false);
          }
        }}
      />
      {procesando && <p className="mt-1 flex items-center gap-1 text-[11px] font-bold text-sky-700"><LoaderCircle size={13} className="animate-spin" /> Optimizando antes de guardar…</p>}
      {mensaje && <p className="mt-1 text-[11px] font-bold text-emerald-700">{mensaje}</p>}
      {error && <p role="alert" className="mt-1 text-[11px] font-bold text-red-700">{error}</p>}
    </div>
  );
}
