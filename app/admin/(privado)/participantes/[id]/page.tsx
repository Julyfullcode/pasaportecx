import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, Sprout } from "lucide-react";
import { db } from "@/lib/db";
import { FotoCircular } from "@/components/marca/FotoCircular";
import { CODIGO_DESAFIO_CIERRE } from "@/lib/cosecha-config";

export default async function DetalleParticipante({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const persona = await db.participante.findUnique({
    where: { id },
    include: {
      empresa: true,
      grupo: true,
      completitudes: { orderBy: { completadoEn: "desc" }, include: { desafio: true } },
      ajustes: { orderBy: { creadoEn: "desc" } },
      recuerdos: { orderBy: { creadoEn: "desc" } },
    },
  });
  if (!persona) notFound();
  const tieneCosecha = persona.completitudes.some((completitud) => completitud.desafio.codigoQr === CODIGO_DESAFIO_CIERRE);
  return (
    <div className="p-4 md:p-7">
      <Link href="/admin/participantes" className="flex items-center gap-2 font-extrabold text-[var(--epm-azul)]"><ArrowLeft /> Volver</Link>
      <header className="tarjeta mt-4 flex flex-wrap items-center gap-4 p-5">
        <FotoCircular src={persona.urlFoto} alt={`Foto de ${persona.nombre}`} className="h-24 w-24" />
        <div className="flex-1"><h1 className="text-3xl font-extrabold">{persona.nombre}</h1><p>{persona.empresa.nombre} · {persona.grupo.nombre}</p><p className="mt-1 text-xs text-slate-500">Registro: {persona.creadoEn.toLocaleString("es-CO")}</p></div>
        <div className="flex flex-col items-end gap-3">
          <strong className="font-display text-4xl text-[var(--epm-azul-profundo)]">{persona.puntosTotales} pts</strong>
          <a href={`/api/admin/participantes/${persona.id}/pasaporte#view=Fit`} target="_blank" rel="noopener noreferrer" className="boton-secundario !min-h-10 !px-4 text-sm"><FileText size={17} /> Ver pasaporte</a>
          {tieneCosecha && <a href={`/api/admin/participantes/${persona.id}/cosecha#view=Fit`} target="_blank" rel="noopener noreferrer" className="boton-secundario !min-h-10 !px-4 text-sm"><Sprout size={17} /> Tarjeta de cierre</a>}
        </div>
      </header>
      <div id="detalle-puntos" className="mt-5 grid scroll-mt-6 gap-5 xl:grid-cols-2">
        <section className="tarjeta p-5"><h2 className="text-xl font-extrabold">Desafíos completados</h2><div className="mt-3 space-y-2">{persona.completitudes.map((c) => <div key={c.id} className="flex justify-between rounded-xl bg-slate-50 p-3 text-sm"><span><strong className="block">{c.desafio.titulo}</strong>{c.completadoEn.toLocaleString("es-CO")} · {c.estado}</span><strong>{c.puntosOtorgados} pts</strong></div>)}</div></section>
        <section className="tarjeta p-5"><h2 className="text-xl font-extrabold">Ajustes manuales</h2><div className="mt-3 space-y-2">{persona.ajustes.map((a) => <div key={a.id} className="flex justify-between border-b py-2 text-sm"><span>{a.motivo}<small className="block text-slate-500">{a.creadoEn.toLocaleString("es-CO")}</small></span><strong className={a.puntos < 0 ? "text-red-700" : "text-emerald-700"}>{a.puntos > 0 ? "+" : ""}{a.puntos}</strong></div>)}</div><h3 className="mt-6 font-extrabold">Recuerdos ({persona.recuerdos.length})</h3><div className="mt-2 grid grid-cols-4 gap-2">{persona.recuerdos.map((r) => <img key={r.id} src={r.urlMiniatura} alt={r.descripcion || "Recuerdo"} className="aspect-square rounded-xl object-cover" />)}</div></section>
      </div>
    </div>
  );
}
