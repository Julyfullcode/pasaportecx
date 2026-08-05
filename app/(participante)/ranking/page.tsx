import { requerirParticipante } from "@/lib/auth";
import { db } from "@/lib/db";
import { RankingTiempoReal } from "@/components/participante/RankingTiempoReal";

export const dynamic = "force-dynamic";

export default async function Ranking() {
  const participante = await requerirParticipante("/ranking");
  const individual = await db.participante.findMany({
      where: { activo: true, esStaff: false },
      orderBy: [{ puntosTotales: "desc" }, { creadoEn: "asc" }],
      select: {
        id: true,
        nombre: true,
        urlFoto: true,
        puntosTotales: true,
        empresa: { select: { nombre: true } },
      },
    });
  return (
    <div className="contenedor py-6">
      <p className="font-extrabold text-[var(--epm-verde-medio)]">Así vamos</p>
      <h1 className="text-3xl font-extrabold text-[var(--epm-azul-profundo)]">Ranking en vivo</h1>
      <p className="mt-2 flex items-center gap-2 text-sm text-slate-600"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--epm-verde-medio)]" /> Actualización automática</p>
      <RankingTiempoReal inicial={{ individual }} participanteId={participante.id} />
    </div>
  );
}
