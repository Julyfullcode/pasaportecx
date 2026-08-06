import Link from "next/link";
import { CheckCircle2, ChevronRight, MessagesSquare, Radio } from "lucide-react";
import { requerirParticipante } from "@/lib/auth";
import { asegurarActividadConocimiento } from "@/lib/actividad";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Actividades() {
  const participante = await requerirParticipante("/actividades");
  await asegurarActividadConocimiento();
  const actividades = await db.actividad.findMany({
    where: { estado: { in: ["PUBLICADA", "CERRADA"] } },
    orderBy: { creadoEn: "desc" },
    include: { participaciones: { where: { participanteId: participante.id }, take: 1 } },
  });
  return (
    <div className="contenedor py-6">
      <p className="font-extrabold text-[var(--epm-verde-medio)]">Participa en vivo</p>
      <h1 className="text-3xl font-extrabold text-[var(--epm-azul-profundo)]">Actividades</h1>
      <p className="mt-2 text-slate-600">El moderador irá habilitando cada pregunta durante el encuentro.</p>
      <div className="mt-6 space-y-4">
        {actividades.map((actividad) => {
          const completada = actividad.participaciones[0];
          return <Link key={actividad.id} href={`/actividades/${actividad.id}`} className="tarjeta flex items-center gap-4 p-5">
            <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${actividad.estado === "PUBLICADA" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{completada ? <CheckCircle2 /> : actividad.estado === "PUBLICADA" ? <Radio /> : <MessagesSquare />}</span>
            <span className="min-w-0 flex-1"><strong className="block text-lg text-[var(--epm-azul-profundo)]">{actividad.titulo}</strong><small className="text-slate-600">{actividad.estado === "PUBLICADA" ? "En vivo" : "Finalizada"}{actividad.puntosHabilitados && !participante.esStaff ? ` · ${actividad.puntos} puntos` : ""}</small></span>
            <ChevronRight className="text-[var(--epm-azul)]" />
          </Link>;
        })}
      </div>
      {!actividades.length && <div className="tarjeta mt-6 p-8 text-center"><MessagesSquare className="mx-auto text-[var(--epm-azul)]" /><h2 className="mt-3 text-xl font-extrabold">Aún no hay actividades publicadas</h2><p className="mt-2 text-slate-600">Cuando el moderador publique una, aparecerá aquí.</p></div>}
    </div>
  );
}
