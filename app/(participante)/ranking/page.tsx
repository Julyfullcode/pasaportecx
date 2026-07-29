import { requerirParticipante } from "@/lib/auth";
import { db } from "@/lib/db";
import { obtenerRankingEquipos } from "@/lib/equipos";
import { RankingTiempoReal } from "@/components/participante/RankingTiempoReal";

export const dynamic = "force-dynamic";

export default async function Ranking() {
  const participante = await requerirParticipante("/ranking");
  const [configuracion, individual, equipos] = await Promise.all([
    db.configuracionEvento.findUniqueOrThrow({ where: { id: "evento" } }),
    db.participante.findMany({
      where: { activo: true },
      orderBy: [{ puntosTotales: "desc" }, { creadoEn: "asc" }],
      include: { empresa: true, grupo: true },
    }),
    obtenerRankingEquipos(),
  ]);
  return (
    <div className="contenedor py-6">
      <p className="font-extrabold text-[var(--epm-verde-medio)]">Así vamos</p>
      <h1 className="text-3xl font-extrabold text-[var(--epm-azul-profundo)]">Ranking en vivo</h1>
      <p className="mt-2 flex items-center gap-2 text-sm text-slate-600"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--epm-verde-medio)]" /> Actualización automática</p>
      <RankingTiempoReal inicial={{ configuracion, individual, equipos }} participanteId={participante.id} />
    </div>
  );
}
