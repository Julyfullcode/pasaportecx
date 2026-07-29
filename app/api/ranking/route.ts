import { db } from "@/lib/db";
import { obtenerRankingEquipos } from "@/lib/equipos";

export const dynamic = "force-dynamic";

export async function GET() {
  const [configuracion, individual, equipos] = await Promise.all([
    db.configuracionEvento.findUniqueOrThrow({ where: { id: "evento" } }),
    db.participante.findMany({
      where: { activo: true },
      orderBy: [{ puntosTotales: "desc" }, { creadoEn: "asc" }],
      include: { empresa: true, grupo: true },
    }),
    obtenerRankingEquipos(),
  ]);
  return Response.json({ configuracion, individual, equipos });
}
