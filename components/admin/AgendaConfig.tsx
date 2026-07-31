"use client";

import { CalendarDays, Camera, Clock3, Plus, Save, Trash2, UserRound } from "lucide-react";
import { eliminarDiaAgenda, eliminarMomentoAgenda, guardarDiaAgenda, guardarMomentoAgenda } from "@/app/admin/actions";

type DiaAgenda = {
  id: string;
  nombre: string;
  orden: number;
  momentos: {
    id: string;
    horaInicio: string;
    horaFin: string;
    nombre: string;
    descripcion: string;
    urlFotoExpositor: string | null;
  }[];
};

export function AgendaConfig({ dias }: { dias: DiaAgenda[] }) {
  return (
    <section className="tarjeta mt-6 overflow-hidden">
      <div className="marca-gradiente relative overflow-hidden p-5 text-white md:p-6">
        <div className="relative z-10 flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--epm-verde)] text-[var(--epm-azul-profundo)]"><CalendarDays /></span>
          <div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[var(--epm-verde)]">Programa descargable</p><h2 className="text-2xl font-extrabold">Agenda del encuentro</h2><p className="mt-1 max-w-3xl text-sm text-white/80">Crea los días y agrega sus momentos. El PDF se actualizará automáticamente para todos los participantes.</p></div>
        </div>
      </div>

      <div className="space-y-4 p-4 md:p-6">
        {dias.length === 0 && <div className="rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">Aún no hay días configurados. Crea el primero al final de esta sección.</div>}
        {dias.map((dia) => (
          <details key={dia.id} open className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            <summary className="flex cursor-pointer items-center justify-between gap-3 bg-white px-4 py-3 font-extrabold text-[var(--epm-azul-profundo)]"><span className="flex items-center gap-2"><CalendarDays size={19} className="text-[var(--epm-teal)]" />{dia.nombre}</span><span className="text-xs text-slate-400">{dia.momentos.length} momentos</span></summary>
            <div className="space-y-4 border-t p-4">
              <form action={guardarDiaAgenda} className="grid gap-3 rounded-xl bg-white p-3 md:grid-cols-[1fr_100px_auto_auto] md:items-end">
                <input type="hidden" name="id" value={dia.id} />
                <div><label className="etiqueta text-xs" htmlFor={`dia-nombre-${dia.id}`}>Nombre del día</label><input id={`dia-nombre-${dia.id}`} className="campo" name="nombre" defaultValue={dia.nombre} maxLength={100} required /></div>
                <div><label className="etiqueta text-xs" htmlFor={`dia-orden-${dia.id}`}>Orden</label><input id={`dia-orden-${dia.id}`} className="campo" name="orden" type="number" min={1} defaultValue={dia.orden} required /></div>
                <button className="boton-secundario whitespace-nowrap"><Save size={17} /> Guardar día</button>
                <button formAction={eliminarDiaAgenda} onClick={(evento) => { if (!window.confirm("¿Eliminar este día y todos sus momentos?")) evento.preventDefault(); }} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-full px-3 text-xs font-extrabold text-red-700"><Trash2 size={16} /> Eliminar día</button>
              </form>

              <div className="space-y-3">
                {dia.momentos.map((momento) => (
                  <form key={momento.id} action={guardarMomentoAgenda} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-2 xl:grid-cols-[125px_125px_1fr_auto]">
                    <input type="hidden" name="id" value={momento.id} /><input type="hidden" name="diaId" value={dia.id} />
                    <div><label className="etiqueta text-xs">Hora inicio</label><input className="campo" name="horaInicio" type="time" defaultValue={momento.horaInicio} required /></div>
                    <div><label className="etiqueta text-xs">Hora fin</label><input className="campo" name="horaFin" type="time" defaultValue={momento.horaFin} required /></div>
                    <div><label className="etiqueta text-xs">Nombre</label><input className="campo" name="nombre" defaultValue={momento.nombre} maxLength={120} required /></div>
                    <div className="flex items-end gap-2 md:col-span-2 xl:col-span-1"><button className="boton-secundario"><Save size={17} /> Guardar</button><button formAction={eliminarMomentoAgenda} onClick={(evento) => { if (!window.confirm("¿Eliminar este momento de la agenda?")) evento.preventDefault(); }} className="grid h-11 w-11 place-items-center rounded-full text-red-700" title="Eliminar momento"><Trash2 size={18} /></button></div>
                    <div className="md:col-span-2 xl:col-span-4"><label className="etiqueta text-xs">Descripción</label><textarea className="campo min-h-20 resize-y" name="descripcion" defaultValue={momento.descripcion} maxLength={800} required /></div>
                    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-3 md:col-span-2 xl:col-span-4">
                      <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border-4 border-white bg-sky-100 shadow-sm">
                        {momento.urlFotoExpositor ? <img src={momento.urlFotoExpositor} alt={`Foto del expositor de ${momento.nombre}`} className="h-full w-full object-cover" /> : <UserRound size={28} className="text-sky-700" />}
                      </div>
                      <div className="min-w-[220px] flex-1"><label className="etiqueta flex items-center gap-1 text-xs"><Camera size={15} /> Foto del expositor (opcional)</label><input type="file" name="fotoExpositor" accept="image/jpeg,image/png" className="mt-1 w-full text-xs" /><p className="mt-1 text-[11px] text-slate-500">JPG o PNG, máximo 2 MB. Una nueva foto reemplaza la anterior.</p></div>
                      {momento.urlFotoExpositor && <label className="flex items-center gap-2 text-xs font-bold text-red-700"><input type="checkbox" name="quitarFotoExpositor" /> Quitar foto actual</label>}
                    </div>
                  </form>
                ))}
              </div>

              <form action={guardarMomentoAgenda} className="grid gap-3 rounded-xl border-2 border-dashed border-sky-200 bg-sky-50/60 p-4 md:grid-cols-2 xl:grid-cols-[125px_125px_1fr_auto]">
                <input type="hidden" name="diaId" value={dia.id} />
                <div><label className="etiqueta text-xs">Hora inicio</label><input className="campo" name="horaInicio" type="time" required /></div>
                <div><label className="etiqueta text-xs">Hora fin</label><input className="campo" name="horaFin" type="time" required /></div>
                <div><label className="etiqueta text-xs">Nombre del momento</label><input className="campo" name="nombre" placeholder="Ejemplo: Apertura del encuentro" maxLength={120} required /></div>
                <button className="boton-primario self-end"><Plus size={18} /> Agregar</button>
                <div className="md:col-span-2 xl:col-span-4"><label className="etiqueta text-xs">Descripción</label><textarea className="campo min-h-20 resize-y" name="descripcion" placeholder="Describe qué sucederá durante este momento" maxLength={800} required /></div>
                <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white/80 p-3 md:col-span-2 xl:col-span-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-sky-100 text-sky-700"><UserRound size={24} /></span><div className="min-w-[220px] flex-1"><label className="etiqueta flex items-center gap-1 text-xs"><Camera size={15} /> Foto del expositor (opcional)</label><input type="file" name="fotoExpositor" accept="image/jpeg,image/png" className="mt-1 w-full text-xs" /><p className="mt-1 text-[11px] text-slate-500">Se mostrará recortada en un círculo al lado del tema en la agenda PDF.</p></div></div>
              </form>
            </div>
          </details>
        ))}

        <form action={guardarDiaAgenda} className="grid gap-3 rounded-2xl bg-emerald-50 p-4 md:grid-cols-[1fr_100px_auto] md:items-end">
          <div><label className="etiqueta text-xs">Nombre del nuevo día</label><input className="campo" name="nombre" placeholder="Ejemplo: Día 1 · Conectar" maxLength={100} required /></div>
          <div><label className="etiqueta text-xs">Orden</label><input className="campo" name="orden" type="number" min={1} defaultValue={dias.length + 1} required /></div>
          <button className="boton-primario"><Plus size={18} /> Crear día</button>
        </form>
        <p className="flex items-center gap-2 text-xs text-slate-500"><Clock3 size={15} /> Los momentos se mostrarán automáticamente ordenados por su hora de inicio.</p>
      </div>
    </section>
  );
}
