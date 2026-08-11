"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, Download, LoaderCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { comprimirImagenHasta } from "@/lib/imagen";
import { LogoBlanco } from "@/components/marca/Logo";
import { TexturaArcos } from "@/components/marca/TexturaArcos";

type Empresa = { id: string; nombre: string };

export function RegistroForm({
  empresas,
}: {
  empresas: Empresa[];
}) {
  const router = useRouter();
  const [foto, setFoto] = useState<Blob | null>(null);
  const [vista, setVista] = useState<string>();
  const [procesandoFoto, setProcesandoFoto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [registro, setRegistro] = useState<{ nombre: string; versionPasaporte: string }>();

  async function cambiarFoto(archivo?: File) {
    if (!archivo) return;
    setProcesandoFoto(true);
    setError("");
    try {
      const comprimida = await comprimirImagenHasta(archivo, 512, 450_000);
      setFoto(comprimida);
      setVista(URL.createObjectURL(comprimida));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos procesar la foto");
    } finally {
      setProcesandoFoto(false);
    }
  }

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!foto) return setError("Toma o selecciona una foto para continuar.");
    setEnviando(true);
    setError("");
    const datos = new FormData(evento.currentTarget);
    datos.set("foto", foto, "perfil.webp");
    const controlador = new AbortController();
    const timeout = setTimeout(() => controlador.abort(), 20_000);
    try {
      const respuesta = await fetch("/api/registro", {
        method: "POST",
        body: datos,
        signal: controlador.signal,
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok) throw new Error(cuerpo.error);
      setRegistro({
        nombre: cuerpo.participante.nombre,
        versionPasaporte: cuerpo.participante.versionPasaporte,
      });
    } catch (e) {
      setError(
        e instanceof DOMException && e.name === "AbortError"
          ? "La red tardó demasiado. Revisa tu conexión y vuelve a intentar."
          : e instanceof Error
            ? e.message
            : "No se pudo completar el registro.",
      );
    } finally {
      clearTimeout(timeout);
      setEnviando(false);
    }
  }

  if (registro) {
    return (
      <section data-registro-completado className="tarjeta entrada-suave overflow-hidden text-center" aria-live="polite">
        <div className="marca-gradiente relative overflow-hidden px-5 pb-6 pt-5 text-white">
          <TexturaArcos />
          <div className="relative z-10">
            <LogoBlanco className="mx-auto h-8 w-auto" />
            <span className="mx-auto mt-4 grid h-14 w-14 place-items-center rounded-full bg-[var(--epm-verde)] text-[var(--epm-azul-profundo)] shadow-lg"><Check size={30} /></span>
            <p className="mt-4 text-xs font-extrabold tracking-[.2em] text-[var(--epm-verde)]">Tu experiencia comienza ahora</p>
            <h2 className="mt-2 text-3xl font-extrabold leading-tight">Encuentro de experiencia y comunicaciones</h2>
            <p className="mx-auto mt-3 max-w-lg text-base font-bold leading-relaxed text-white/90">Te damos una cálida bienvenida.</p>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-white/80">Gracias por realizar tu registro y prepárate para vivir una gran experiencia.</p>
          </div>
        </div>
        <div className="p-5 md:p-6">
          <h3 className="text-xl font-extrabold text-[var(--epm-azul-profundo)]">¡{registro.nombre}, tu pasaporte está listo!</h3>
          <a href={`/api/pasaporte?v=${encodeURIComponent(registro.versionPasaporte)}#view=Fit`} target="_blank" rel="noopener noreferrer" className="boton-secundario mt-5 w-full"><Download size={19} /> Descargar Pasaporte</a>
          <button onClick={() => router.replace("/")} className="boton-primario mt-3 w-full">Entrar al encuentro</button>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={enviar} className="tarjeta space-y-5 p-5 md:p-7">
      <div>
        <label className="etiqueta" htmlFor="correo">Correo electrónico</label>
        <input className="campo" id="correo" name="correo" type="email" autoComplete="email" maxLength={254} required placeholder="tu.correo@empresa.com" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="etiqueta" htmlFor="nombres">Nombre</label>
          <input className="campo" id="nombres" name="nombres" autoComplete="given-name" minLength={2} maxLength={60} required placeholder="Tus nombres" />
        </div>
        <div>
          <label className="etiqueta" htmlFor="apellidos">Apellidos</label>
          <input className="campo" id="apellidos" name="apellidos" autoComplete="family-name" minLength={2} maxLength={60} required placeholder="Tus apellidos" />
        </div>
      </div>
      <div>
        <label className="etiqueta" htmlFor="empresaId">Empresa del Grupo</label>
        <select className="campo" id="empresaId" name="empresaId" required defaultValue="">
          <option value="" disabled>Selecciona tu empresa</option>
          {empresas.map((empresa) => <option value={empresa.id} key={empresa.id}>{empresa.nombre}</option>)}
        </select>
      </div>
      <div>
        <span className="etiqueta">Foto de perfil</span>
        <div className="flex items-center gap-4">
          {vista ? <img src={vista} alt="Vista previa de tu foto" className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-soft" /> : <span className="grid h-24 w-24 place-items-center rounded-full bg-sky-50 text-[var(--epm-azul)]"><Camera size={32} /></span>}
          <label className="boton-secundario cursor-pointer">
            {procesandoFoto ? <LoaderCircle className="animate-spin" size={19} /> : vista ? <RefreshCw size={19} /> : <Camera size={19} />}
            {vista ? "Repetir" : "Tomar foto"}
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => cambiarFoto(e.target.files?.[0])} />
          </label>
        </div>
      </div>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-sky-50 p-4 text-sm">
        <input type="checkbox" name="aceptaDatos" required className="mt-1 h-5 w-5 accent-[var(--epm-azul)]" />
        <span className="leading-relaxed">
          <strong className="flex items-start gap-1.5 text-[var(--epm-azul-profundo)]"><ShieldCheck className="mt-0.5 shrink-0" size={17} />Autorización de tratamiento de datos personales</strong>
          <span className="mt-2 block">Al registrarme, autorizo a Grupo EPM al tratamiento de mis datos personales. Estos datos serán utilizados como repositorio del evento y podrán ser publicados, total o parcialmente, en el micrositio de la Vicepresidencia Experiencia Usuario-Cliente y en piezas de comunicación interna relacionadas con este encuentro.</span>
        </span>
      </label>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
      <button disabled={enviando || procesandoFoto} className="boton-primario w-full disabled:opacity-60">
        {enviando && <LoaderCircle className="animate-spin" size={20} />}
        {enviando ? "Creando tu cuenta…" : "Crear mi cuenta"}
      </button>
    </form>
  );
}
