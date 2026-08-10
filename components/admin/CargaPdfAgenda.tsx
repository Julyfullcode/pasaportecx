"use client";

import { useActionState } from "react";
import { Eye, FileUp, Undo2 } from "lucide-react";
import { guardarPdfAgenda, quitarPdfAgenda, type EstadoPdfAgenda } from "@/app/admin/actions";

const estadoInicial: EstadoPdfAgenda = { tipo: "inicial", mensaje: "" };

export function CargaPdfAgenda({ urlActual }: { urlActual: string | null }) {
  const [estado, accion, pendiente] = useActionState(guardarPdfAgenda, estadoInicial);
  return (
    <div className="rounded-[1.75rem] border border-emerald-200 bg-gradient-to-r from-emerald-50 to-sky-50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-extrabold text-[var(--epm-azul-profundo)]"><FileUp size={20} className="text-[var(--epm-teal)]" /> Usar un PDF existente</h3>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">Carga una agenda que ya tengas preparada (máximo 4 MB). Mientras esté activa, este será el PDF que descarguen los participantes; la agenda editable se conserva.</p>
        </div>
        {urlActual && <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-800">PDF personalizado activo</span>}
      </div>
      <form action={accion} className="mt-4 flex flex-wrap items-center gap-3">
        <input className="campo min-w-[240px] flex-1 bg-white" type="file" name="agendaPdf" accept="application/pdf,.pdf" required />
        <button className="boton-primario whitespace-nowrap" disabled={pendiente}><FileUp size={18} /> {pendiente ? "Cargando..." : urlActual ? "Reemplazar PDF" : "Cargar PDF"}</button>
      </form>
      {estado.mensaje && <p className={`mt-3 rounded-xl px-4 py-3 text-sm font-bold ${estado.tipo === "error" ? "bg-red-50 text-red-700" : "bg-emerald-100 text-emerald-800"}`}>{estado.mensaje}</p>}
      {urlActual && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-emerald-200 pt-4">
          <a href="/api/agenda" target="_blank" rel="noreferrer" className="boton-secundario"><Eye size={17} /> Ver PDF actual</a>
          <form action={quitarPdfAgenda}>
            <input type="hidden" name="confirmacion" value="QUITAR" />
            <button className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-extrabold text-slate-700" onClick={(evento) => { if (!window.confirm("¿Volver a usar la agenda generada por la aplicación?")) evento.preventDefault(); }}><Undo2 size={17} /> Volver a la agenda generada</button>
          </form>
        </div>
      )}
    </div>
  );
}
