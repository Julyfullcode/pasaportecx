import { ArrowDown, ArrowUp, Clock3, Copy, Download, FileDown, MonitorPlay, Pencil, Plus, Sprout, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { cambiarEstadoDesafio, crearDesafioCierre, duplicarDesafio, eliminarDesafio, moverDesafio } from "@/app/admin/actions";
import { FormularioDesafio } from "@/components/admin/FormularioDesafio";
import { ReiniciarDesafio } from "@/components/admin/ReiniciarDesafio";
import { CODIGO_DESAFIO_CIERRE, TITULO_DESAFIO_CIERRE } from "@/lib/cosecha-config";
import { etiquetaDiaDesafio } from "@/lib/dia-desafio";
import { esDesafioPuntualidad } from "@/lib/puntualidad";
import { descripcionDuracionDesafio, estadoTemporalDesafio } from "@/lib/duracion-desafio";

export const dynamic = "force-dynamic";

export default async function AdminDesafios() {
  let datos;
  try {
    datos = await cargarDatosDesafios();
  } catch (primerError) {
    console.error("[admin/desafios] Primer intento de carga fallido", primerError);
    await new Promise((resolver) => setTimeout(resolver, 250));
    try {
      datos = await cargarDatosDesafios();
    } catch (error) {
      console.error("[admin/desafios] La carga falló después del reintento", error);
      return (
        <div className="p-4 md:p-7">
          <div className="tarjeta mx-auto max-w-2xl p-7 text-center">
            <h1 className="text-2xl font-extrabold text-[var(--epm-azul-profundo)]">No pudimos cargar los desafíos</h1>
            <p className="mt-3 text-slate-600">No se modificó ni se eliminó ningún dato. Intenta cargar nuevamente.</p>
            <a href="/admin/desafios" className="boton-primario mt-5">Reintentar</a>
          </div>
        </div>
      );
    }
  }
  const desafios = datos;
  const desafioCierre = desafios.find((desafio) => desafio.codigoQr === CODIGO_DESAFIO_CIERRE);
  return (
    <div className="p-4 md:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-extrabold text-[var(--epm-azul-profundo)]">Desafíos</h1>
        <a href="/api/qr/todos?formato=pdf" target="_blank" rel="noopener noreferrer" className="boton-secundario"><FileDown size={19} /> Ver PDF con todos los QR</a>
      </div>
      {!desafioCierre && (
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
        <div className="mt-5 border-t pt-5"><FormularioDesafio /></div>
      </details>
      <details className="tarjeta mt-4 p-4">
        <summary className="cursor-pointer list-none font-extrabold text-[var(--epm-azul-profundo)]">Descarga masiva con filtros</summary>
        <form action="/api/qr/todos" method="get" target="_blank" className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <input type="hidden" name="formato" value="pdf" />
          <select className="campo" name="dia" defaultValue=""><option value="">Todos los desafíos</option><option value="1">Día 1</option><option value="2">Día 2</option><option value="0">Permanentes</option></select>
          <button className="boton-primario"><FileDown size={18} /> Ver PDF</button>
        </form>
      </details>
      <div className="mt-6 space-y-3">
        {desafios.map((desafio) => {
          const esPuntualidad = esDesafioPuntualidad(desafio);
          return (
          <article id={desafio.codigoQr === CODIGO_DESAFIO_CIERRE ? CODIGO_DESAFIO_CIERRE : undefined} key={desafio.id} className="tarjeta scroll-mt-5 overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 p-4">
              <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${desafio.estado === "PUBLICADO" ? "bg-emerald-50 text-emerald-700" : desafio.estado === "CERRADO" ? "bg-slate-200 text-slate-700" : "bg-amber-50 text-amber-700"}`}>{desafio.estado}</span>
              <div className="min-w-[200px] flex-1"><h2 className="font-extrabold text-[var(--epm-azul-profundo)]">{desafio.titulo}</h2><p className="text-xs text-slate-500">{etiquetaDiaDesafio(desafio.dia)}{esPuntualidad ? " · Puntualidad" : ""} · {desafio.puntos} pts · {desafio._count.completitudes} completitudes</p></div>
              {esPuntualidad ? (
                <a href={`/admin/proyeccion/puntualidad/${desafio.id}`} target="_blank" rel="noopener noreferrer" className="boton-primario !min-h-10 !px-3 text-sm"><MonitorPlay size={17} /> Proyectar QR dinámico</a>
              ) : (
                <>
                  <a href={`/api/qr/${desafio.id}`} className="boton-secundario !min-h-10 !px-3 text-sm"><Download size={17} /> PNG</a>
                  <a href={`/api/qr/${desafio.id}?formato=pdf`} target="_blank" rel="noopener noreferrer" className="boton-secundario !min-h-10 !px-3 text-sm"><FileDown size={17} /> Ver PDF</a>
                </>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t bg-slate-50 p-3">
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1" aria-label={`Ordenar ${desafio.titulo}`}>
                <form action={moverDesafio}><input type="hidden" name="id" value={desafio.id} /><input type="hidden" name="direccion" value="SUBIR" /><button title="Subir desafío" aria-label={`Subir ${desafio.titulo}`} className="grid h-7 w-7 place-items-center rounded-full text-slate-600 hover:bg-sky-50 hover:text-[var(--epm-azul)]"><ArrowUp size={16} /></button></form>
                <form action={moverDesafio}><input type="hidden" name="id" value={desafio.id} /><input type="hidden" name="direccion" value="BAJAR" /><button title="Bajar desafío" aria-label={`Bajar ${desafio.titulo}`} className="grid h-7 w-7 place-items-center rounded-full text-slate-600 hover:bg-sky-50 hover:text-[var(--epm-azul)]"><ArrowDown size={16} /></button></form>
              </span>
              <a href={esPuntualidad ? `/admin/proyeccion/puntualidad/${desafio.id}` : `/admin/proyeccion/desafios/${desafio.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-6 items-center gap-1 text-sm font-extrabold text-[var(--epm-teal)]"><MonitorPlay size={16} /> {esPuntualidad ? "Ver avance y QR" : "Ver avance"}</a>
              <span className="text-slate-300">·</span>
              {desafio.codigoQr === CODIGO_DESAFIO_CIERRE && (
                <>
                  <a href="/admin/proyeccion/cierre" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm font-extrabold text-[var(--epm-teal)]"><MonitorPlay size={16} /> Proyectar tarjetas</a>
                  <span className="text-slate-300">·</span>
                </>
              )}
              <form action={cambiarEstadoDesafio}><input type="hidden" name="id" value={desafio.id} /><input type="hidden" name="estado" value={desafio.estado === "PUBLICADO" ? "BORRADOR" : "PUBLICADO"} /><button className="text-sm font-extrabold text-[var(--epm-azul)]">{desafio.estado === "PUBLICADO" ? "Despublicar" : "Publicar"}</button></form>
              <span className="text-slate-300">·</span>
              <form action={cambiarEstadoDesafio}><input type="hidden" name="id" value={desafio.id} /><input type="hidden" name="estado" value="CERRADO" /><button className="text-sm font-extrabold text-slate-600">Cerrar</button></form>
              <span className="text-slate-300">·</span>
              <form action={duplicarDesafio}><input type="hidden" name="id" value={desafio.id} /><button className="flex items-center gap-1 text-sm font-extrabold text-slate-600"><Copy size={15} /> Duplicar</button></form>
              <span className="text-slate-300">·</span>
              <ReiniciarDesafio id={desafio.id} respuestas={desafio._count.completitudes} />
              <span className="text-slate-300">·</span>
              <details className="group self-center">
                <summary className="relative -top-[10px] inline-flex h-6 cursor-pointer list-none items-center gap-1 align-middle text-sm font-extrabold leading-none text-slate-600"><Pencil size={15} /> Editar</summary>
                <div className="mt-4 rounded-xl bg-white p-4"><FormularioDesafio desafio={desafio} /></div>
              </details>
              <span className="text-slate-300">·</span>
              <form action={eliminarDesafio}><input type="hidden" name="id" value={desafio.id} /><button className="flex items-center gap-1 text-sm font-extrabold text-red-700"><Trash2 size={15} /> {desafio._count.completitudes ? "Cerrar (tiene datos)" : "Eliminar"}</button></form>
            </div>
            {!esPuntualidad && <div className="flex items-center gap-2 border-t border-sky-100 bg-sky-50/70 px-4 py-2 text-xs font-bold text-sky-900">
              <Clock3 size={15} />
              <span>{descripcionDuracionDesafio(desafio)}</span>
              {desafio.estado === "PUBLICADO" && estadoTemporalDesafio(desafio) === "FINALIZADO" && <span className="ml-auto rounded-full bg-amber-100 px-2 py-1 text-amber-800">Tiempo finalizado</span>}
            </div>}
          </article>
          );
        })}
      </div>
    </div>
  );
}

function cargarDatosDesafios() {
  return db.desafio.findMany({
    orderBy: [{ dia: "asc" }, { orden: "asc" }, { creadoEn: "desc" }],
    include: {
      _count: { select: { completitudes: true } },
      completitudes: { orderBy: { completadoEn: "desc" }, take: 5, select: { respuesta: true } },
    },
  });
}
