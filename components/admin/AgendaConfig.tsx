"use client";

import { CalendarDays, Camera, Clock3, ImagePlus, Plus, Save, Trash2, UserRound } from "lucide-react";
import { agregarFotosDiaAgenda, eliminarDiaAgenda, eliminarFotoDiaAgenda, eliminarMomentoAgenda, guardarDiaAgenda, guardarMomentoAgenda } from "@/app/admin/actions";

type DiaAgenda = {
  id: string;
  nombre: string;
  fecha: string | null;
  orden: number;
  fotos: { id: string; urlFoto: string; orden: number }[];
  momentos: {
    id: string;
    horaInicio: string;
    horaFin: string;
    nombre: string;
    descripcion: string;
    urlFotoExpositor: string | null;
  }[];
};

const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
function fechaLegible(fecha: string | null) {
  if (!fecha) return "Sin fecha";
  const [ano, mes, dia] = fecha.split("-").map(Number);
  return `${dia} de ${meses[mes - 1]} de ${ano}`;
}

export function AgendaConfig({ dias }: { dias: DiaAgenda[] }) {
  return (
    <section className="tarjeta mt-6 overflow-hidden">
      <div className="marca-gradiente relative overflow-hidden p-5 text-white md:p-6">
        <div className="relative z-10 flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--epm-verde)] text-[var(--epm-azul-profundo)]"><CalendarDays /></span>
          <div><p className="text-sm font-extrabold text-[var(--epm-verde)]">Programa descargable</p><h2 className="text-2xl font-extrabold">Agenda del encuentro</h2><p className="mt-1 max-w-3xl text-sm text-white/80">Crea los días y agrega sus momentos. El PDF se actualizará automáticamente para todos los participantes.</p></div>
        </div>
      </div>

      <div className="space-y-4 p-4 md:p-6">
        {dias.length === 0 && <div className="rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">Aún no hay días configurados. Crea el primero al final de esta sección.</div>}
        {dias.map((dia) => (
          <details key={dia.id} open className="overflow-hidden rounded-[1.75rem] border border-sky-100 bg-gradient-to-br from-sky-50 to-emerald-50/60 shadow-sm">
            <summary className="flex cursor-pointer items-center justify-between gap-3 bg-white/90 px-5 py-4 font-extrabold text-[var(--epm-azul-profundo)]"><span className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-100 text-[var(--epm-teal)]"><CalendarDays size={20} /></span><span>{dia.nombre}<small className="mt-0.5 block font-semibold text-slate-500">{fechaLegible(dia.fecha)}</small></span></span><span className="rounded-full bg-sky-50 px-3 py-1 text-xs text-sky-700">{dia.momentos.length} momentos</span></summary>
            <div className="space-y-4 border-t p-4">
              <form action={guardarDiaAgenda} className="grid gap-3 rounded-2xl bg-white p-4 md:grid-cols-[1fr_180px_90px] md:items-end">
                <input type="hidden" name="id" value={dia.id} />
                <div><label className="etiqueta text-xs" htmlFor={`dia-nombre-${dia.id}`}>Nombre del día</label><input id={`dia-nombre-${dia.id}`} className="campo" name="nombre" defaultValue={dia.nombre} maxLength={100} required /></div>
                <div><label className="etiqueta text-xs" htmlFor={`dia-fecha-${dia.id}`}>Fecha</label><input id={`dia-fecha-${dia.id}`} className="campo" name="fecha" type="date" defaultValue={dia.fecha ?? ""} /></div>
                <div><label className="etiqueta text-xs" htmlFor={`dia-orden-${dia.id}`}>Orden</label><input id={`dia-orden-${dia.id}`} className="campo" name="orden" type="number" min={1} defaultValue={dia.orden} required /></div>
                <div className="flex flex-wrap gap-2 md:col-span-3"><button className="boton-secundario whitespace-nowrap"><Save size={17} /> Guardar día</button><button formAction={eliminarDiaAgenda} onClick={(evento) => { if (!window.confirm("¿Eliminar este día, sus fotos y todos sus momentos?")) evento.preventDefault(); }} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-full px-3 text-xs font-extrabold text-red-700"><Trash2 size={16} /> Eliminar día</button></div>
              </form>

              <div className="rounded-2xl bg-white/80 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="flex items-center gap-2 font-extrabold text-[var(--epm-azul-profundo)]"><ImagePlus size={18} className="text-[var(--epm-teal)]" /> Fotos del día</h3><p className="text-xs text-slate-500">Puedes cargar hasta 6; agrega máximo 2 por vez, JPG o PNG de hasta 2 MB.</p></div><form action={agregarFotosDiaAgenda} className="flex flex-wrap items-center gap-2"><input type="hidden" name="diaId" value={dia.id} /><input type="file" name="fotosDia" accept="image/jpeg,image/png" multiple required onChange={(evento) => { if ((evento.currentTarget.files?.length ?? 0) > 2) { window.alert("Selecciona máximo 2 fotos por carga. Luego podrás agregar más."); evento.currentTarget.value = ""; } }} className="max-w-[260px] text-xs" /><button className="boton-secundario !min-h-9 !px-3 text-xs"><ImagePlus size={16} /> Agregar fotos</button></form></div>
                {dia.fotos.length > 0 && <div className="mt-4 flex flex-wrap gap-3">{dia.fotos.map((foto) => <div key={foto.id} className="group relative h-20 w-20 overflow-hidden rounded-[1.4rem] border-4 border-white shadow-md"><img src={foto.urlFoto} alt={`Foto de ${dia.nombre}`} className="h-full w-full object-cover" /><form action={eliminarFotoDiaAgenda} className="absolute right-1 top-1"><input type="hidden" name="id" value={foto.id} /><button className="grid h-7 w-7 place-items-center rounded-full bg-white/95 text-red-700 shadow" title="Eliminar foto"><Trash2 size={14} /></button></form></div>)}</div>}
              </div>

              <div className="space-y-3">
                {dia.momentos.map((momento) => (
                  <form key={momento.id} action={guardarMomentoAgenda} className="grid gap-3 rounded-[1.5rem] bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-[125px_125px_1fr_auto]">
                    <input type="hidden" name="id" value={momento.id} /><input type="hidden" name="diaId" value={dia.id} />
                    <div><label className="etiqueta text-xs">Hora inicio</label><input className="campo" name="horaInicio" type="time" defaultValue={momento.horaInicio} required /></div>
                    <div><label className="etiqueta text-xs">Hora fin</label><input className="campo" name="horaFin" type="time" defaultValue={momento.horaFin} required /></div>
                    <div><label className="etiqueta text-xs">Nombre</label><input className="campo" name="nombre" defaultValue={momento.nombre} maxLength={120} required /></div>
                    <div className="flex items-end gap-2 md:col-span-2 xl:col-span-1"><button className="boton-secundario"><Save size={17} /> Guardar</button><button formAction={eliminarMomentoAgenda} onClick={(evento) => { if (!window.confirm("¿Eliminar este momento de la agenda?")) evento.preventDefault(); }} className="grid h-11 w-11 place-items-center rounded-full text-red-700" title="Eliminar momento"><Trash2 size={18} /></button></div>
                    <div className="md:col-span-2 xl:col-span-4"><label className="etiqueta text-xs">Descripción (opcional)</label><textarea className="campo min-h-20 resize-y" name="descripcion" defaultValue={momento.descripcion} maxLength={800} /></div>
                    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-3 md:col-span-2 xl:col-span-4">
                      <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border-4 border-white bg-sky-100 shadow-sm">
                        {momento.urlFotoExpositor ? <img src={momento.urlFotoExpositor} alt={`Foto del expositor de ${momento.nombre}`} className="h-full w-full object-cover" /> : <UserRound size={28} className="text-sky-700" />}
                      </div>
                      <div className="min-w-[220px] flex-1"><label className="etiqueta flex items-center gap-1 text-xs"><Camera size={15} /> Foto del expositor (opcional)</label><input type="file" name="fotoExpositor" accept="image/jpeg,image/png" className="mt-1 w-full text-xs" /><p className="mt-1 text-[11px] text-slate-500">JPG o PNG, máximo 2 MB. Una nueva foto reemplaza la anterior.</p><button className="boton-secundario mt-2 !min-h-9 !px-3 text-xs"><Save size={15} /> Guardar cambios y foto</button></div>
                      {momento.urlFotoExpositor && <label className="flex items-center gap-2 text-xs font-bold text-red-700"><input type="checkbox" name="quitarFotoExpositor" /> Quitar foto actual</label>}
                    </div>
                  </form>
                ))}
              </div>

              <form action={guardarMomentoAgenda} className="grid gap-3 rounded-[1.5rem] border-2 border-dashed border-sky-200 bg-sky-50/60 p-4 md:grid-cols-2 xl:grid-cols-[125px_125px_1fr_auto]">
                <input type="hidden" name="diaId" value={dia.id} />
                <div><label className="etiqueta text-xs">Hora inicio</label><input className="campo" name="horaInicio" type="time" required /></div>
                <div><label className="etiqueta text-xs">Hora fin</label><input className="campo" name="horaFin" type="time" required /></div>
                <div><label className="etiqueta text-xs">Nombre del momento</label><input className="campo" name="nombre" placeholder="Ejemplo: Apertura del encuentro" maxLength={120} required /></div>
                <button className="boton-primario self-end"><Plus size={18} /> Agregar</button>
                <div className="md:col-span-2 xl:col-span-4"><label className="etiqueta text-xs">Descripción (opcional)</label><textarea className="campo min-h-20 resize-y" name="descripcion" placeholder="Si lo deseas, describe qué sucederá durante este momento" maxLength={800} /></div>
                <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white/80 p-3 md:col-span-2 xl:col-span-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-sky-100 text-sky-700"><UserRound size={24} /></span><div className="min-w-[220px] flex-1"><label className="etiqueta flex items-center gap-1 text-xs"><Camera size={15} /> Foto del expositor (opcional)</label><input type="file" name="fotoExpositor" accept="image/jpeg,image/png" className="mt-1 w-full text-xs" /><p className="mt-1 text-[11px] text-slate-500">Se mostrará recortada en un círculo al lado del tema en la agenda PDF.</p></div></div>
              </form>
            </div>
          </details>
        ))}

        <form action={guardarDiaAgenda} className="grid gap-3 rounded-[1.75rem] bg-gradient-to-r from-emerald-50 to-sky-50 p-5 md:grid-cols-[1fr_180px_90px_auto] md:items-end">
          <div><label className="etiqueta text-xs">Nombre del nuevo día</label><input className="campo" name="nombre" placeholder="Ejemplo: Día 1 · Conectar" maxLength={100} required /></div>
          <div><label className="etiqueta text-xs">Fecha</label><input className="campo" name="fecha" type="date" /></div>
          <div><label className="etiqueta text-xs">Orden</label><input className="campo" name="orden" type="number" min={1} defaultValue={dias.length + 1} required /></div>
          <button className="boton-primario"><Plus size={18} /> Crear día</button>
        </form>
        <p className="flex items-center gap-2 text-xs text-slate-500"><Clock3 size={15} /> Los momentos se mostrarán automáticamente ordenados por su hora de inicio.</p>
      </div>
    </section>
  );
}
