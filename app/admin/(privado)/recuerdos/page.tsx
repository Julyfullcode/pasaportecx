import { Download, Eye, EyeOff, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { moderarRecuerdo } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function AdminRecuerdos({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string }>;
}) {
  const { filtro = "todos" } = await searchParams;
  const recuerdos = await db.recuerdo.findMany({
    where: filtro === "reportados" ? { reportado: true } : filtro === "pendientes" ? { pendiente: true } : {},
    orderBy: { creadoEn: "desc" },
    include: { participante: { include: { grupo: true } } },
  });
  return (
    <div className="p-4 md:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="font-extrabold text-[var(--epm-verde-medio)]">Moderación social</p><h1 className="text-3xl font-extrabold text-[var(--epm-azul-profundo)]">Recuerdos</h1></div>
        <a href="/api/recuerdos/zip" className="boton-secundario"><Download /> Descargar álbum ZIP</a>
      </div>
      <div className="mt-5 flex gap-2">{[["todos", "Todos"], ["reportados", "Reportados"], ["pendientes", "Pendientes"]].map(([valor, texto]) => <a key={valor} href={`/admin/recuerdos?filtro=${valor}`} className={`rounded-full px-4 py-2 text-sm font-extrabold ${filtro === valor ? "bg-[var(--epm-azul)] text-white" : "bg-white text-slate-600"}`}>{texto}</a>)}</div>
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {recuerdos.map((recuerdo) => (
          <article key={recuerdo.id} className="tarjeta overflow-hidden">
            <div className="relative"><img src={recuerdo.urlMiniatura} alt={recuerdo.descripcion || `Recuerdo de ${recuerdo.participante.nombre}`} className="aspect-square w-full object-cover" />{(recuerdo.reportado || recuerdo.pendiente || !recuerdo.visible) && <span className="absolute left-2 top-2 rounded-full bg-slate-950/80 px-2 py-1 text-[10px] font-extrabold text-white">{recuerdo.reportado ? "REPORTADO" : recuerdo.pendiente ? "PENDIENTE" : "OCULTO"}</span>}</div>
            <div className="p-3"><p className="truncate text-sm font-extrabold">{recuerdo.participante.nombre}</p><p className="truncate text-xs text-slate-500">{recuerdo.descripcion}</p>
              <div className="mt-3 flex items-center justify-between">
                <a href={recuerdo.urlFoto} download className="grid h-10 w-10 place-items-center rounded-full bg-slate-100" aria-label="Descargar"><Download size={17} /></a>
                <form action={moderarRecuerdo}><input type="hidden" name="id" value={recuerdo.id} /><input type="hidden" name="accion" value={recuerdo.visible && !recuerdo.pendiente ? "ocultar" : "mostrar"} /><button aria-label={recuerdo.visible ? "Ocultar" : "Mostrar"} className="grid h-10 w-10 place-items-center rounded-full bg-slate-100">{recuerdo.visible && !recuerdo.pendiente ? <EyeOff size={17} /> : <Eye size={17} />}</button></form>
                <form action={moderarRecuerdo}><input type="hidden" name="id" value={recuerdo.id} /><input type="hidden" name="accion" value="eliminar" /><button aria-label="Eliminar" className="grid h-10 w-10 place-items-center rounded-full bg-red-50 text-red-700"><Trash2 size={17} /></button></form>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
