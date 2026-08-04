import { CheckCircle2, Copy, Download, FileDown, Pencil, Plus, Sprout, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { cambiarEstadoDesafio, crearDesafioCierre, duplicarDesafio, eliminarDesafio } from "@/app/admin/actions";
import { FormularioDesafio } from "@/components/admin/FormularioDesafio";
import { CODIGO_DESAFIO_CIERRE, TITULO_DESAFIO_CIERRE } from "@/lib/cosecha-config";
import { esConfiguracionPuntualidad } from "@/lib/puntualidad";

export const dynamic = "force-dynamic";

export default async function AdminDesafios() {
  const [desafios, componentes, ubicaciones] = await Promise.all([
    db.desafio.findMany({ orderBy: [{ dia: "asc" }, { creadoEn: "desc" }], include: { componente: true, _count: { select: { completitudes: true } } } }),
    db.componente.findMany({ where: { activo: true }, orderBy: { orden: "asc" } }),
    db.ubicacion.findMany({ where: { activa: true }, orderBy: { orden: "asc" } }),
  ]);
  const desafioCierre = desafios.find((desafio) => desafio.codigoQr === CODIGO_DESAFIO_CIERRE);
  return (
    <div className="p-4 md:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="font-extrabold text-[var(--epm-verde-medio)]">Gestión en caliente</p><h1 className="text-3xl font-extrabold text-[var(--epm-azul-profundo)]">Desafíos</h1></div>
        <a href="/api/qr/todos?formato=pdf" target="_blank" rel="noopener noreferrer" className="boton-secundario"><FileDown size={19} /> Ver PDF con todos los QR</a>
      </div>
      {desafioCierre ? (
        <a href={`#${CODIGO_DESAFIO_CIERRE}`} className="mt-5 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-sky-50 p-4 text-[var(--epm-azul-profundo)] shadow-soft">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-100 text-[var(--epm-teal)]"><CheckCircle2 /></span>
          <span className="min-w-0 flex-1"><strong className="block">El desafío de cierre ya está creado</strong><small className="text-slate-600">{desafioCierre.estado === "BORRADOR" ? "Está en borrador. Toca aquí para localizarlo y publicarlo cuando quieras." : `Estado actual: ${desafioCierre.estado}.`}</small></span>
        </a>
      ) : (
        <section className="mt-5 flex flex-wrap items-center gap-4 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-sky-50 p-5 shadow-soft">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--epm-verde)] text-[var(--epm-azul-profundo)]"><Sprout /></span>
          <div className="min-w-[220px] flex-1">
            <h2 className="font-display text-lg font-extrabold text-[var(--epm-azul-profundo)]">{TITULO_DESAFIO_CIERRE}</h2>
            <p className="mt-1 text-sm text-slate-600">Crea en Supabase el desafío con las preguntas Me llevo, Agradezco y Activo. Quedará como borrador con 150 puntos.</p>
          </div>
          <form action={crearDesafioCierre}><button className="boton-primario"><Plus size={18} /> Crear borrador de cierre</button></form>
        </section>
      )}
      <details className="tarjeta mt-6 p-5">
        <summary className="flex cursor-pointer list-none items-center gap-2 font-display text-lg font-extrabold text-[var(--epm-azul)]"><Plus /> Crear desafío ahora</summary>
        <div className="mt-5 border-t pt-5"><FormularioDesafio componentes={componentes} ubicaciones={ubicaciones} /></div>
      </details>
      <details className="tarjeta mt-4 p-4">
        <summary className="cursor-pointer list-none font-extrabold text-[var(--epm-azul-profundo)]">Descarga masiva con filtros</summary>
        <form action="/api/qr/todos" method="get" target="_blank" className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <input type="hidden" name="formato" value="pdf" />
          <select className="campo" name="dia" defaultValue=""><option value="">Todos los días</option><option value="1">Día 1</option><option value="2">Día 2</option></select>
          <select className="campo" name="componenteId" defaultValue=""><option value="">Todos los componentes</option>{componentes.map((componente) => <option key={componente.id} value={componente.id}>{componente.nombre}</option>)}</select>
          <button className="boton-primario"><FileDown size={18} /> Ver PDF</button>
        </form>
      </details>
      <div className="mt-6 space-y-3">
        {desafios.map((desafio) => (
          <article id={desafio.codigoQr === CODIGO_DESAFIO_CIERRE ? CODIGO_DESAFIO_CIERRE : undefined} key={desafio.id} className="tarjeta scroll-mt-5 overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 p-4">
              <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${desafio.estado === "PUBLICADO" ? "bg-emerald-50 text-emerald-700" : desafio.estado === "CERRADO" ? "bg-slate-200 text-slate-700" : "bg-amber-50 text-amber-700"}`}>{desafio.estado}</span>
              <div className="min-w-[200px] flex-1"><h2 className="font-extrabold text-[var(--epm-azul-profundo)]">{desafio.titulo}</h2><p className="text-xs text-slate-500">Día {desafio.dia} · {desafio.componente?.nombre || desafio.ubicacion}{esConfiguracionPuntualidad(desafio.configuracion) ? " · Puntualidad" : ""} · {desafio.puntos} pts · {desafio._count.completitudes} completitudes</p></div>
              <a href={`/api/qr/${desafio.id}`} className="boton-secundario !min-h-10 !px-3 text-sm"><Download size={17} /> PNG</a>
              <a href={`/api/qr/${desafio.id}?formato=pdf`} target="_blank" rel="noopener noreferrer" className="boton-secundario !min-h-10 !px-3 text-sm"><FileDown size={17} /> Ver PDF</a>
            </div>
            <div className="flex flex-wrap gap-2 border-t bg-slate-50 p-3">
              <form action={cambiarEstadoDesafio}><input type="hidden" name="id" value={desafio.id} /><input type="hidden" name="estado" value={desafio.estado === "PUBLICADO" ? "BORRADOR" : "PUBLICADO"} /><button className="text-sm font-extrabold text-[var(--epm-azul)]">{desafio.estado === "PUBLICADO" ? "Despublicar" : "Publicar"}</button></form>
              <span className="text-slate-300">·</span>
              <form action={cambiarEstadoDesafio}><input type="hidden" name="id" value={desafio.id} /><input type="hidden" name="estado" value="CERRADO" /><button className="text-sm font-extrabold text-slate-600">Cerrar</button></form>
              <span className="text-slate-300">·</span>
              <form action={duplicarDesafio}><input type="hidden" name="id" value={desafio.id} /><button className="flex items-center gap-1 text-sm font-extrabold text-slate-600"><Copy size={15} /> Duplicar</button></form>
              <span className="text-slate-300">·</span>
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center gap-1 text-sm font-extrabold text-slate-600"><Pencil size={15} /> Editar</summary>
                <div className="mt-4 rounded-xl bg-white p-4"><FormularioDesafio componentes={componentes} ubicaciones={ubicaciones} desafio={desafio} /></div>
              </details>
              <span className="text-slate-300">·</span>
              <form action={eliminarDesafio}><input type="hidden" name="id" value={desafio.id} /><button className="flex items-center gap-1 text-sm font-extrabold text-red-700"><Trash2 size={15} /> {desafio._count.completitudes ? "Cerrar (tiene datos)" : "Eliminar"}</button></form>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
