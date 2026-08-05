"use client";

import { useActionState } from "react";
import { LoaderCircle, MailPlus } from "lucide-react";
import { agregarCorreosAutorizados, type EstadoCorreosAutorizados } from "@/app/admin/actions";

const ESTADO_INICIAL: EstadoCorreosAutorizados = { tipo: "inicial", mensaje: "" };

export function GestionCorreosAutorizados() {
  const [resultado, accion, pendiente] = useActionState(agregarCorreosAutorizados, ESTADO_INICIAL);
  return (
    <section className="tarjeta mt-5 p-4 md:p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sky-50 text-[var(--epm-azul)]"><MailPlus /></span>
        <div>
          <h2 className="font-display text-lg font-extrabold text-[var(--epm-azul-profundo)]">Autorizar correos para el registro</h2>
          <p className="mt-1 text-sm text-slate-600">Pega uno o varios correos separados por espacios, comas, punto y coma o líneas. Esta lista se conserva al preparar la aplicación para público real.</p>
        </div>
      </div>
      <form action={accion} className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
        <textarea name="correos" required className="campo min-h-28 md:min-h-24" placeholder={"persona1@empresa.com\npersona2@empresa.com"} />
        <button disabled={pendiente} className="boton-primario self-end disabled:cursor-wait disabled:opacity-70">
          {pendiente ? <LoaderCircle className="animate-spin" size={19} /> : <MailPlus size={19} />}
          {pendiente ? "Guardando…" : "Autorizar correos"}
        </button>
      </form>
      {resultado.tipo !== "inicial" && (
        <p role="status" className={`mt-3 rounded-xl border p-3 text-sm font-bold ${resultado.tipo === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{resultado.mensaje}</p>
      )}
    </section>
  );
}
