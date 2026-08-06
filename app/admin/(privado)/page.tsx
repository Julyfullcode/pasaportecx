import Link from "next/link";
import { CheckCircle2, Image, Target, Users } from "lucide-react";
import { db } from "@/lib/db";
import { FotoCircular } from "@/components/marca/FotoCircular";
import { ActualizacionEnVivo } from "@/components/admin/ActualizacionEnVivo";

export const dynamic = "force-dynamic";

export default async function DashboardAdmin() {
  const [participantes, desafios, completitudes, recuerdos, individual, empresas] = await Promise.all([
    db.participante.count({ where: { activo: true } }),
    db.desafio.count({ where: { estado: "PUBLICADO" } }),
    db.completitud.count(),
    db.recuerdo.count(),
    db.participante.findMany({ where: { activo: true, esStaff: false }, orderBy: { puntosTotales: "desc" }, take: 5, include: { empresa: true } }),
    db.empresa.findMany({ include: { _count: { select: { participantes: { where: { activo: true } } } } }, orderBy: { orden: "asc" } }),
  ]);
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
      <section className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {metricas.map(([etiqueta, valor, Icono, color]) => (
          <div key={etiqueta} className="tarjeta p-4 md:p-5">
            <span className="grid h-10 w-10 place-items-center rounded-full text-white" style={{ background: color }}><Icono size={21} /></span>
            <p className="mt-4 font-display text-3xl font-extrabold text-[var(--epm-azul-profundo)]">{valor}</p>
            <p className="text-sm font-bold text-slate-500">{etiqueta}</p>
          </div>
        ))}
      </section>
      <section className="mt-6">
        <div className="tarjeta p-5">
          <div className="flex items-center justify-between"><h2 className="text-xl font-extrabold">Podio individual</h2><Link href="/admin/proyeccion/podio" target="_blank" className="text-sm font-extrabold text-[var(--epm-azul)]">Proyectar ↗</Link></div>
          <div className="mt-4 space-y-2">{individual.map((persona, i) => <div key={persona.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-2"><strong className="w-6 text-center text-[var(--epm-azul-profundo)]">{i + 1}</strong><FotoCircular src={persona.urlFoto} alt={`Foto de ${persona.nombre}`} className="h-10 w-10" /><span className="min-w-0 flex-1 truncate font-bold">{persona.nombre}</span><strong>{persona.puntosTotales}</strong></div>)}</div>
        </div>
      </section>
      <section className="mt-6 grid gap-5 xl:grid-cols-2">
        <div className="tarjeta p-5"><h2 className="text-lg font-extrabold">Participación por empresa</h2><div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">{empresas.map((empresa) => <div key={empresa.id} className="flex justify-between border-b border-slate-100 py-1 text-sm"><span>{empresa.nombre}</span><strong>{empresa._count.participantes}</strong></div>)}</div></div>
      </section>
    </div>
  );
}
