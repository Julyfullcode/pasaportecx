"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { Camera, Check, Download, LoaderCircle, RefreshCw, ScanLine, ShieldCheck, Sparkles, Trophy } from "lucide-react";
import { comprimirImagenHasta } from "@/lib/imagen";
import { Logo } from "@/components/marca/Logo";
import { TexturaArcos } from "@/components/marca/TexturaArcos";

type Empresa = { id: string; nombre: string };
type Grupo = { id: string; nombre: string; colorHex: string; integrantes: number };

export function RegistroForm({
  empresas,
  grupos,
  automatico,
  destino,
  nombreEvento,
}: {
  empresas: Empresa[];
  grupos: Grupo[];
  automatico: boolean;
  destino: string;
  nombreEvento: string;
}) {
  const router = useRouter();
  const [foto, setFoto] = useState<Blob | null>(null);
  const [vista, setVista] = useState<string>();
  const [procesandoFoto, setProcesandoFoto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [registro, setRegistro] = useState<{ nombre: string; codigoRecuperacion: string; grupo: string; qr: string }>();

  const menorCantidad = useMemo(
    () => Math.min(...grupos.map((grupo) => grupo.integrantes)),
    [grupos],
  );

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
      const qr = await QRCode.toDataURL(`${window.location.origin}/recuperar/${cuerpo.participante.codigoRecuperacion}`, {
        width: 420,
        margin: 2,
        color: { dark: "#0B3B60", light: "#FFFFFF" },
      });
      setRegistro({ ...cuerpo.participante, qr });
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
      <section className="tarjeta entrada-suave overflow-hidden text-center" aria-live="polite">
        <div className="marca-gradiente relative overflow-hidden px-5 pb-6 pt-5 text-white">
          <TexturaArcos />
          <div className="relative z-10">
            <span className="mx-auto inline-flex rounded-xl bg-white/95 px-4 py-2 shadow-lg"><Logo className="h-8 w-auto" /></span>
            <span className="mx-auto mt-4 grid h-14 w-14 place-items-center rounded-full bg-[var(--epm-verde)] text-[var(--epm-azul-profundo)] shadow-lg"><Check size={30} /></span>
            <p className="mt-4 text-xs font-extrabold uppercase tracking-[.2em] text-[var(--epm-verde)]">Tu experiencia comienza ahora</p>
            <h2 className="mt-2 text-3xl font-extrabold leading-tight">¡Te damos la bienvenida al Encuentro de Experiencia!</h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-white/85">En <strong className="text-white">{nombreEvento}</strong>, conecta con otras personas, escanea los retos, suma puntos y comparte los momentos que dejarán huella. Tu participación hace especial este encuentro.</p>
            <div className="mt-5 grid grid-cols-3 gap-2 text-[11px] font-extrabold">
              <span className="rounded-xl bg-white/10 p-2"><ScanLine className="mx-auto mb-1" size={20} />Escanea</span>
              <span className="rounded-xl bg-white/10 p-2"><Trophy className="mx-auto mb-1" size={20} />Participa</span>
              <span className="rounded-xl bg-white/10 p-2"><Sparkles className="mx-auto mb-1" size={20} />Deja huella</span>
            </div>
          </div>
        </div>
        <div className="p-5 md:p-6">
          <h3 className="text-xl font-extrabold text-[var(--epm-azul-profundo)]">¡Tu pasaporte está listo!</h3>
          <p className="mt-1 text-slate-600">{registro.nombre} · {registro.grupo}</p>
          <div className="my-5 rounded-2xl bg-[var(--epm-gris-fondo)] p-4">
            <p className="text-xs font-extrabold uppercase tracking-widest text-slate-500">Código de recuperación</p>
            <p className="mt-1 font-display text-4xl font-extrabold tracking-[.16em] text-[var(--epm-azul-profundo)]">{registro.codigoRecuperacion}</p>
            <img src={registro.qr} alt={`QR personal de recuperación ${registro.codigoRecuperacion}`} className="mx-auto mt-3 h-44 w-44 rounded-xl" />
            <p className="mt-2 text-sm text-slate-600">Guárdalo: te permitirá recuperar tu perfil en otro dispositivo.</p>
          </div>
          <a href={registro.qr} download="mi-pasaporte-cx.png" className="boton-secundario w-full"><Download size={19} /> Descargar QR personal</a>
          <button onClick={() => router.push(destino)} className="boton-primario mt-3 w-full">Entrar al encuentro</button>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={enviar} className="tarjeta space-y-5 p-5 md:p-7">
      <div>
        <label className="etiqueta" htmlFor="nombre">Nombre completo</label>
        <input className="campo" id="nombre" name="nombre" autoComplete="name" minLength={3} maxLength={100} required placeholder="Como quieres que aparezca en el ranking" />
      </div>
      <div>
        <label className="etiqueta" htmlFor="empresaId">Empresa del Grupo</label>
        <select className="campo" id="empresaId" name="empresaId" required defaultValue="">
          <option value="" disabled>Selecciona tu empresa</option>
          {empresas.map((empresa) => <option value={empresa.id} key={empresa.id}>{empresa.nombre}</option>)}
        </select>
      </div>
      {!automatico && (
        <fieldset>
          <legend className="etiqueta">Tu equipo</legend>
          <div className="grid grid-cols-2 gap-2">
            {grupos.map((grupo) => (
              <label key={grupo.id} className="flex min-h-14 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 has-[:checked]:border-[var(--epm-azul)] has-[:checked]:ring-2 has-[:checked]:ring-sky-100">
                <input type="radio" name="grupoId" value={grupo.id} required className="sr-only" />
                <span className="h-4 w-4 rounded-full" style={{ background: grupo.colorHex }} />
                <span className="text-sm font-extrabold">{grupo.nombre}<small className="block font-normal text-slate-500">{grupo.integrantes} integrantes{grupo.integrantes === menorCantidad ? " · recomendado" : ""}</small></span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
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
        <span><strong className="flex items-center gap-1 text-[var(--epm-azul-profundo)]"><ShieldCheck size={17} />Autorización de datos</strong> Acepto que mi nombre y foto se usen únicamente en la dinámica del evento y se eliminen al finalizar.</span>
      </label>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
      <button disabled={enviando || procesandoFoto} className="boton-primario w-full disabled:opacity-60">
        {enviando && <LoaderCircle className="animate-spin" size={20} />}
        {enviando ? "Creando tu pasaporte…" : "Crear mi pasaporte"}
      </button>
    </form>
  );
}
