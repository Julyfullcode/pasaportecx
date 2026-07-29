import Link from "next/link";
import { CheckCircle2, Image, Target, Users, UsersRound } from "lucide-react";
import { db } from "@/lib/db";
import { obtenerRankingEquipos } from "@/lib/equipos";
import { FotoCircular } from "@/components/marca/FotoCircular";
import { ActualizacionEnVivo } from "@/components/admin/ActualizacionEnVivo";

export const dynamic = "force-dynamic";

export default async function DashboardAdmin() {
  const [participantes, desafios, completitudes, recuerdos, individual, equipos, empresas, componentes] = await Promise.all([
    db.participante.count({ where: { activo: true } }),
    db.desafio.count({ where: { estado: "PUBLICADO" } }),
    db.completitud.count(),
    db.recuerdo.count(),
    db.participante.findMany({ where: { activo: true }, orderBy: { puntosTotales: "desc" }, take: 5, include: { empresa: true, grupo: true } }),
    obtenerRankingEquipos(),
    db.empresa.findMany({ include: { _count: { select: { participantes: { where: { activo: true } } } } }, orderBy: { orden: "asc" } }),
    db.componente.findMany({ include: { _count: { select: { desafios: true } } }, orderBy: { orden: "asc" } }),
  ]);
  const cantidades = equipos.map((e) => e.integrantes);
  const desbalance = cantidades.length > 1 && Math.max(...cantidades) - Math.min(...cantidades) > 2;
  const metricas = [
    ["Participantes", participantes, Users, "#0079C2"],
    ["Desafíos publicados", desafios, Target, "#0E7C6E"],
    ["Completitudes", completitudes, CheckCircle2, "#2E9E5B"],
    ["Recuerdos", recuerdos, Image, "#8CC63F"],
  ] as const;
  return (
    <div className="p-4 md:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="font-extrabold text-[var(--epm-verde-medio)]">Centro de control</p><h1 className="text-3xl font-extrabold text-[var(--epm-azul-profundo)]">El encuentro, ahora</h1></div>
        <ActualizacionEnVivo />
      </div>
      {desbalance && <Link href="/admin/grupos" className="mt-5 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 font-bold text-amber-900"><UsersRound /> Hay más de 2 personas de diferencia entre equipos. Ver sugerencia de balanceo.</Link>}
      <section className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {metricas.map(([etiqueta, valor, Icono, color]) => (
          <div key={etiqueta} className="tarjeta p-4 md:p-5">
            <span className="grid h-10 w-10 place-items-center rounded-full text-white" style={{ background: color }}><Icono size={21} /></span>
            <p className="mt-4 font-display text-3xl font-extrabold text-[var(--epm-azul-profundo)]">{valor}</p>
            <p className="text-sm font-bold text-slate-500">{etiqueta}</p>
          </div>
        ))}
      </section>
      <section className="mt-6 grid gap-5 xl:grid-cols-2">
        <div className="tarjeta p-5">
          <div className="flex items-center justify-between"><h2 className="text-xl font-extrabold">Podio individual</h2><Link href="/admin/proyeccion/podio" target="_blank" className="text-sm font-extrabold text-[var(--epm-azul)]">Proyectar ↗</Link></div>
          <div className="mt-4 space-y-2">{individual.map((persona, i) => <div key={persona.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-2"><strong className="w-6 text-center text-[var(--epm-azul-profundo)]">{i + 1}</strong><FotoCircular src={persona.urlFoto} alt={`Foto de ${persona.nombre}`} className="h-10 w-10" /><span className="min-w-0 flex-1 truncate font-bold">{persona.nombre}</span><strong>{persona.puntosTotales}</strong></div>)}</div>
        </div>
        <div className="tarjeta p-5">
          <div className="flex items-center justify-between"><h2 className="text-xl font-extrabold">Ranking de equipos</h2><Link href="/admin/proyeccion/equipos" target="_blank" className="text-sm font-extrabold text-[var(--epm-azul)]">Proyectar ↗</Link></div>
          <div className="mt-4 space-y-3">{equipos.map((equipo, i) => <div key={equipo.id} className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full font-bold text-white" style={{ background: equipo.colorHex }}>{i + 1}</span><span className="flex-1 font-bold">{equipo.nombre}<small className="block font-normal text-slate-500">{equipo.integrantes} integrantes</small></span><strong>{equipo.puntaje.toLocaleString("es-CO")}</strong></div>)}</div>
        </div>
      </section>
      <section className="mt-6 grid gap-5 xl:grid-cols-2">
        <div className="tarjeta p-5"><h2 className="text-lg font-extrabold">Participación por empresa</h2><div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">{empresas.map((empresa) => <div key={empresa.id} className="flex justify-between border-b border-slate-100 py-1 text-sm"><span>{empresa.nombre}</span><strong>{empresa._count.participantes}</strong></div>)}</div></div>
        <div className="tarjeta p-5"><h2 className="text-lg font-extrabold">Desafíos por componente</h2><div className="mt-4 space-y-2">{componentes.map((componente) => <div key={componente.id} className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: componente.colorHex }} /><span className="flex-1">{componente.nombre}</span><strong>{componente._count.desafios}</strong></div>)}</div></div>
      </section>
    </div>
  );
}
