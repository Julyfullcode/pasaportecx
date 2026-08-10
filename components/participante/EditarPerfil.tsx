"use client";

import { useState } from "react";
import { CheckCircle2, LoaderCircle, Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";

type Empresa = { id: string; nombre: string };

export function EditarPerfil({
  nombres,
  apellidos,
  empresaId,
  empresas,
}: {
  nombres: string;
  apellidos: string;
  empresaId: string;
  empresas: Empresa[];
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState(false);

  async function guardar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setGuardando(true);
    setError("");
    setExito(false);
    try {
      const respuesta = await fetch("/api/perfil", { method: "POST", body: new FormData(evento.currentTarget) });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok) throw new Error(cuerpo.error);
      setExito(true);
      router.refresh();
      window.setTimeout(() => setAbierto(false), 900);
    } catch (errorGuardado) {
      setError(errorGuardado instanceof Error ? errorGuardado.message : "No pudimos guardar tus datos.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="tarjeta overflow-hidden">
      <button type="button" onClick={() => { setAbierto((actual) => !actual); setError(""); setExito(false); }} className="flex w-full items-center gap-3 p-4 text-left">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sky-50 text-[var(--epm-azul)]"><Pencil size={19} /></span>
        <span className="min-w-0 flex-1"><strong className="block text-[var(--epm-azul-profundo)]">Editar mis datos</strong><small className="text-slate-500">Nombre, apellidos y empresa</small></span>
        {abierto ? <X size={20} /> : <Pencil size={18} />}
      </button>
      {abierto && (
        <form onSubmit={guardar} className="grid gap-4 border-t border-slate-100 p-4 sm:grid-cols-2">
          <div><label className="etiqueta" htmlFor="perfil-nombres">Nombre</label><input className="campo" id="perfil-nombres" name="nombres" minLength={2} maxLength={60} required defaultValue={nombres} autoComplete="given-name" /></div>
          <div><label className="etiqueta" htmlFor="perfil-apellidos">Apellidos</label><input className="campo" id="perfil-apellidos" name="apellidos" minLength={2} maxLength={60} required defaultValue={apellidos} autoComplete="family-name" /></div>
          <div className="sm:col-span-2"><label className="etiqueta" htmlFor="perfil-empresa">Empresa del Grupo</label><select className="campo" id="perfil-empresa" name="empresaId" required defaultValue={empresaId}>{empresas.map((empresa) => <option key={empresa.id} value={empresa.id}>{empresa.nombre}</option>)}</select></div>
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700 sm:col-span-2">{error}</p>}
          {exito && <p role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700 sm:col-span-2"><CheckCircle2 size={18} /> Tus datos quedaron actualizados.</p>}
          <button disabled={guardando} className="boton-primario sm:col-span-2 disabled:opacity-60">{guardando && <LoaderCircle className="animate-spin" size={19} />}{guardando ? "Guardando…" : "Guardar mis datos"}</button>
        </form>
      )}
    </section>
  );
}
