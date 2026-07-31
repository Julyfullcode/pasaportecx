"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, LoaderCircle } from "lucide-react";
import { comprimirImagen } from "@/lib/imagen";
import { FotoCircular } from "@/components/marca/FotoCircular";

export function FotoPerfilEditable({ src, nombre }: { src: string; nombre: string }) {
  const router = useRouter();
  const [fotoActual, setFotoActual] = useState(src);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");

  async function cambiarFoto(archivo?: File) {
    if (!archivo || procesando) return;
    setProcesando(true);
    setError("");
    try {
      const comprimida = await comprimirImagen(archivo, 512, 0.76);
      if (comprimida.size > 250_000) throw new Error("La fotografía sigue siendo muy pesada. Selecciona otra.");
      const datos = new FormData();
      datos.set("foto", comprimida, "perfil.webp");
      const respuesta = await fetch("/api/perfil/foto", { method: "POST", body: datos });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok) throw new Error(cuerpo.error ?? "No pudimos actualizar tu foto.");
      setFotoActual(cuerpo.urlFoto);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos actualizar tu foto.");
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div className="relative shrink-0">
      <label className={`group relative block cursor-pointer rounded-full ${procesando ? "pointer-events-none opacity-75" : ""}`} title="Cambiar mi foto de perfil">
        <FotoCircular src={fotoActual} alt={`Foto de ${nombre}`} className="h-24 w-24 sm:h-28 sm:w-28" />
        <span className="absolute bottom-0 right-0 grid h-9 w-9 place-items-center rounded-full border-2 border-white bg-[var(--epm-verde)] text-[var(--epm-azul-profundo)] shadow-lg transition-transform group-hover:scale-110">
          {procesando ? <LoaderCircle className="animate-spin" size={18} /> : <Camera size={18} />}
        </span>
        <span className="sr-only">Cambiar mi foto de perfil</span>
        <input
          type="file"
          accept="image/*"
          capture="user"
          className="sr-only"
          disabled={procesando}
          onChange={(evento) => {
            void cambiarFoto(evento.target.files?.[0]);
            evento.target.value = "";
          }}
        />
      </label>
      {error && <p role="alert" className="fixed left-1/2 top-4 z-[100] w-[min(90vw,360px)] -translate-x-1/2 rounded-xl bg-red-700 px-4 py-3 text-center text-xs font-bold text-white shadow-2xl">{error}</p>}
    </div>
  );
}
