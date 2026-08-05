import Link from "next/link";
import { Clock3, FileText, Mail, Search, SlidersHorizontal, Sprout, Trash2, UserCheck } from "lucide-react";
import { db } from "@/lib/db";
import { ajustarPuntos, alternarParticipante, eliminarCorreoAutorizado, eliminarParticipante } from "@/app/admin/actions";
import { FotoCircular } from "@/components/marca/FotoCircular";
import { CODIGO_DESAFIO_CIERRE, esRespuestasCosecha } from "@/lib/cosecha-config";
import { GestionCorreosAutorizados } from "@/components/admin/GestionCorreosAutorizados";

export const dynamic = "force-dynamic";

export default async function AdminParticipantes({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; empresa?: string }>;
}) {
  const filtros = await searchParams;
  const busqueda = filtros.q?.trim().toLowerCase() ?? "";
  const [participantesBase, correosPendientesBase, empresas, totalRegistrados, totalAutorizados, totalAutorizadosRegistrados] = await Promise.all([
    db.participante.findMany({
      where: {
        ...(filtros.empresa ? { empresaId: filtros.empresa } : {}),
      },
      orderBy: { nombre: "asc" },
      include: {
        empresa: true,
        correoAutorizado: true,
        completitudes: { where: { desafio: { codigoQr: CODIGO_DESAFIO_CIERRE } }, select: { id: true, respuesta: true }, take: 1 },
        _count: { select: { completitudes: true, recuerdos: true } },
      },
    }),
    filtros.empresa ? Promise.resolve([]) : db.correoAutorizado.findMany({
      where: { participanteId: null },
      orderBy: { correo: "asc" },
    }),
    db.empresa.findMany({ orderBy: { orden: "asc" } }),
    db.participante.count(),
    db.correoAutorizado.count(),
    db.correoAutorizado.count({ where: { participanteId: { not: null } } }),
  ]);
  const participantes = busqueda
    ? participantesBase.filter((persona) => persona.nombre.toLowerCase().includes(busqueda) || persona.correoAutorizado?.correo.includes(busqueda))
    : participantesBase;
  const correosPendientes = busqueda
    ? correosPendientesBase.filter(({ correo }) => correo.includes(busqueda))
    : correosPendientesBase;
  const totalPendientes = totalAutorizados - totalAutorizadosRegistrados;
  return (
    <div className="p-4 md:p-7">
      <div><p className="font-extrabold text-[var(--epm-verde-medio)]">Personas y puntajes</p><h1 className="text-3xl font-extrabold text-[var(--epm-azul-profundo)]">Participantes</h1></div>
      <GestionCorreosAutorizados />
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Resumen icono={<Mail size={20} />} etiqueta="Correos autorizados" valor={totalAutorizados} />
        <Resumen icono={<UserCheck size={20} />} etiqueta="Personas registradas" valor={totalRegistrados} />
        <Resumen icono={<Clock3 size={20} />} etiqueta="Pendientes de registro" valor={totalPendientes} />
      </div>
      <form className="tarjeta mt-5 grid gap-3 p-4 md:grid-cols-[2fr_1fr_auto]">
        <label className="relative"><Search className="absolute left-3 top-3 text-slate-400" size={20} /><input className="campo pl-10" name="q" defaultValue={filtros.q} placeholder="Buscar por nombre o correo" /></label>
        <select className="campo" name="empresa" defaultValue={filtros.empresa ?? ""}><option value="">Todas las empresas</option>{empresas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select>
        <button className="boton-primario"><SlidersHorizontal size={18} /> Filtrar</button>
      </form>
      <p className="mt-4 text-sm font-bold text-slate-500">{participantes.length + correosPendientes.length} resultados</p>
      <div className="mt-3 space-y-3">
        {participantes.map((persona) => (
          <article key={persona.id} className={`tarjeta p-4 ${persona.activo ? "" : "opacity-60"}`}>
            <div className="flex flex-wrap items-center gap-3">
              <FotoCircular src={persona.urlFoto} alt={`Foto de ${persona.nombre}`} className="h-14 w-14" />
              <Link href={`/admin/participantes/${persona.id}`} className="min-w-[180px] flex-1">
                <div className="flex flex-wrap items-center gap-2"><h2 className="font-extrabold text-[var(--epm-azul-profundo)]">{persona.nombre}</h2><span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-emerald-700">Registrado</span></div>
                <p className="mt-0.5 text-xs font-bold text-[var(--epm-azul)]">{persona.correoAutorizado?.correo ?? "Correo no asociado"}</p>
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
        {correosPendientes.map((autorizacion) => (
          <article key={autorizacion.id} className="tarjeta p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-amber-50 text-amber-700"><Mail size={24} /></span>
              <div className="min-w-[220px] flex-1">
                <div className="flex flex-wrap items-center gap-2"><h2 className="break-all font-extrabold text-[var(--epm-azul-profundo)]">{autorizacion.correo}</h2><span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-amber-700">Pendiente de registro</span></div>
                <p className="mt-1 text-xs text-slate-500">Autorizado para crear su Pasaporte CX.</p>
              </div>
              <form action={eliminarCorreoAutorizado}>
                <input type="hidden" name="id" value={autorizacion.id} />
                <button className="inline-flex items-center gap-1.5 text-sm font-extrabold text-red-700"><Trash2 size={16} /> Retirar autorización</button>
              </form>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function Resumen({ icono, etiqueta, valor }: { icono: React.ReactNode; etiqueta: string; valor: number }) {
  return <div className="tarjeta flex items-center gap-3 p-4 text-[var(--epm-azul-profundo)]"><span className="text-[var(--epm-azul)]">{icono}</span><span className="min-w-0"><strong className="block font-display text-2xl">{valor}</strong><small className="font-bold text-slate-500">{etiqueta}</small></span></div>;
}
