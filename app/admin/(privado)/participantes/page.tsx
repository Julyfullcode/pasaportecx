import Link from "next/link";
import { FileText, Search, SlidersHorizontal, Sprout } from "lucide-react";
import { db } from "@/lib/db";
import { ajustarPuntos, alternarParticipante, eliminarParticipante } from "@/app/admin/actions";
import { FotoCircular } from "@/components/marca/FotoCircular";
import { CODIGO_DESAFIO_CIERRE, esRespuestasCosecha } from "@/lib/cosecha-config";

export const dynamic = "force-dynamic";

export default async function AdminParticipantes({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; empresa?: string }>;
}) {
  const filtros = await searchParams;
  const [participantes, empresas] = await Promise.all([
    db.participante.findMany({
      where: {
        ...(filtros.q ? { nombre: { contains: filtros.q } } : {}),
        ...(filtros.empresa ? { empresaId: filtros.empresa } : {}),
      },
      orderBy: { nombre: "asc" },
      include: {
        empresa: true,
        completitudes: { where: { desafio: { codigoQr: CODIGO_DESAFIO_CIERRE } }, select: { id: true, respuesta: true }, take: 1 },
        _count: { select: { completitudes: true, recuerdos: true } },
      },
    }),
    db.empresa.findMany({ orderBy: { orden: "asc" } }),
  ]);
  return (
    <div className="p-4 md:p-7">
      <div><p className="font-extrabold text-[var(--epm-verde-medio)]">Personas y puntajes</p><h1 className="text-3xl font-extrabold text-[var(--epm-azul-profundo)]">Participantes</h1></div>
      <form className="tarjeta mt-5 grid gap-3 p-4 md:grid-cols-[2fr_1fr_auto]">
        <label className="relative"><Search className="absolute left-3 top-3 text-slate-400" size={20} /><input className="campo pl-10" name="q" defaultValue={filtros.q} placeholder="Buscar por nombre" /></label>
        <select className="campo" name="empresa" defaultValue={filtros.empresa ?? ""}><option value="">Todas las empresas</option>{empresas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select>
        <button className="boton-primario"><SlidersHorizontal size={18} /> Filtrar</button>
      </form>
      <p className="mt-4 text-sm font-bold text-slate-500">{participantes.length} resultados</p>
      <div className="mt-3 space-y-3">
        {participantes.map((persona) => (
          <article key={persona.id} className={`tarjeta p-4 ${persona.activo ? "" : "opacity-60"}`}>
            <div className="flex flex-wrap items-center gap-3">
              <FotoCircular src={persona.urlFoto} alt={`Foto de ${persona.nombre}`} className="h-14 w-14" />
              <Link href={`/admin/participantes/${persona.id}`} className="min-w-[180px] flex-1">
                <h2 className="font-extrabold text-[var(--epm-azul-profundo)]">{persona.nombre}</h2>
                <p className="text-xs text-slate-500">{persona.empresa.nombre} · {persona._count.completitudes} retos · {persona._count.recuerdos} recuerdos</p>
              </Link>
              <Link href={`/admin/participantes/${persona.id}#detalle-puntos`} className="rounded-xl px-3 py-2 text-right font-display text-2xl text-[var(--epm-azul-profundo)] transition hover:bg-sky-50 hover:text-[var(--epm-azul)]" title="Ver detalle de puntos">{persona.puntosTotales} pts<span className="block font-sans text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Ver detalle</span></Link>
            </div>
            <div className="mt-3 grid gap-2 border-t pt-3 md:grid-cols-2">
              <form action={ajustarPuntos} className="flex gap-2">
                <input type="hidden" name="participanteId" value={persona.id} />
                <input className="campo !min-h-10 !w-24 !py-1 text-sm" name="puntos" type="number" placeholder="+/− pts" required />
                <input className="campo !min-h-10 !py-1 text-sm" name="motivo" placeholder="Motivo obligatorio" required />
                <button className="text-sm font-extrabold text-[var(--epm-azul)]">Aplicar</button>
              </form>
              <div className="flex flex-wrap items-center justify-end gap-3">
                <a href={`/api/admin/participantes/${persona.id}/pasaporte#view=Fit`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-2 text-sm font-extrabold text-[var(--epm-azul)] transition hover:bg-sky-100"><FileText size={17} /> Ver pasaporte</a>
                {esRespuestasCosecha(persona.completitudes[0]?.respuesta) && <a href={`/api/admin/participantes/${persona.id}/cosecha#view=Fit`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-2 text-sm font-extrabold text-[var(--epm-teal)] transition hover:bg-emerald-100"><Sprout size={17} /> Tarjeta de cierre</a>}
                <form action={alternarParticipante}><input type="hidden" name="participanteId" value={persona.id} /><button className="text-sm font-extrabold text-amber-700">{persona.activo ? "Desactivar" : "Reactivar"}</button></form>
                <form action={eliminarParticipante}><input type="hidden" name="participanteId" value={persona.id} /><button className="text-sm font-extrabold text-red-700">Eliminar</button></form>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
