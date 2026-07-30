import { AlertTriangle, ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import { guardarCatalogo } from "@/app/admin/actions";
import { sugerirRebalanceo } from "@/lib/equipos";
import { FotoCircular } from "@/components/marca/FotoCircular";

export const dynamic = "force-dynamic";

export default async function AdminGrupos() {
  const grupos = await db.grupo.findMany({
    orderBy: { orden: "asc" },
    include: { participantes: { where: { activo: true }, orderBy: { nombre: "asc" } } },
  });
  const sugerencias = sugerirRebalanceo(
    grupos.map((grupo) => ({
      id: grupo.id,
      nombre: grupo.nombre,
      integrantes: grupo.participantes,
    })),
  );
  return (
    <div className="p-4 md:p-7">
      <div>
        <p className="font-extrabold text-[var(--epm-verde-medio)]">Composición transversal</p>
        <h1 className="text-3xl font-extrabold text-[var(--epm-azul-profundo)]">Equipos</h1>
        <p className="mt-1 text-sm text-slate-600">Cambia aquí el nombre, color u orden de cada equipo. El nuevo nombre aparecerá de inmediato para participantes y pantallas.</p>
      </div>
      {sugerencias.length > 0 && (
        <details className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <summary className="flex cursor-pointer list-none items-center gap-2 font-extrabold text-amber-900"><AlertTriangle /> Rebalancear sugerencia ({sugerencias.length} movimientos)</summary>
          <p className="mt-2 text-sm text-amber-800">Esta propuesta no aplica cambios automáticamente. Haz cada movimiento desde Participantes.</p>
          <div className="mt-3 space-y-1">{sugerencias.map((s) => <p key={s.participanteId} className="flex items-center gap-2 text-sm"><strong>{s.nombre}</strong> {s.desde} <ArrowRight size={15} /> {s.hacia}</p>)}</div>
        </details>
      )}
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {grupos.map((grupo) => (
          <section key={grupo.id} className="tarjeta overflow-hidden">
            <div className="h-2" style={{ background: grupo.colorHex }} />
            <form action={guardarCatalogo} className="grid gap-3 p-4 sm:grid-cols-[1fr_82px_76px_auto] sm:items-end">
              <input type="hidden" name="tipo" value="grupo" /><input type="hidden" name="id" value={grupo.id} />
              <div><label className="etiqueta text-xs" htmlFor={`nombre-${grupo.id}`}>Nombre del equipo</label><input id={`nombre-${grupo.id}`} className="campo font-extrabold" name="nombre" defaultValue={grupo.nombre} required /></div>
              <div><label className="etiqueta text-xs" htmlFor={`color-${grupo.id}`}>Color</label><input id={`color-${grupo.id}`} className="campo !p-1" type="color" name="colorHex" defaultValue={grupo.colorHex} /></div>
              <div><label className="etiqueta text-xs" htmlFor={`orden-${grupo.id}`}>Orden</label><input id={`orden-${grupo.id}`} className="campo" type="number" name="orden" defaultValue={grupo.orden} /></div>
              <button className="boton-secundario whitespace-nowrap">Guardar cambios</button>
            </form>
            <div className="border-t p-4"><p className="mb-3 text-sm font-extrabold text-slate-500">{grupo.participantes.length} integrantes</p><div className="flex flex-wrap gap-2">{grupo.participantes.map((p) => <div key={p.id} className="flex items-center gap-2 rounded-full bg-slate-50 py-1 pl-1 pr-3 text-xs font-bold"><FotoCircular src={p.urlFoto} alt={`Foto de ${p.nombre}`} className="h-8 w-8 !border-2" />{p.nombre}</div>)}</div></div>
          </section>
        ))}
      </div>
      <form action={guardarCatalogo} className="tarjeta mt-5 grid gap-3 p-4 md:grid-cols-[1fr_90px_90px_auto] md:items-end">
        <input type="hidden" name="tipo" value="grupo" />
        <div><label className="etiqueta text-xs">Nombre del nuevo equipo</label><input className="campo" name="nombre" placeholder="Ejemplo: Equipo Innovación" required /></div>
        <div><label className="etiqueta text-xs">Color</label><input className="campo !p-1" type="color" name="colorHex" defaultValue="#0079C2" /></div>
        <div><label className="etiqueta text-xs">Orden</label><input className="campo" type="number" name="orden" defaultValue={grupos.length + 1} /></div>
        <button className="boton-primario">Agregar equipo</button>
      </form>
    </div>
  );
}
