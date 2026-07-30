import { db } from "@/lib/db";
import { obtenerRankingConConfiguracion } from "@/lib/equipos";

export const dynamic = "force-dynamic";

export async function GET() {
  const [individual, ranking] = await Promise.all([
    db.participante.findMany({
      where: { activo: true },
      orderBy: [{ puntosTotales: "desc" }, { creadoEn: "asc" }],
      select: {
        id: true,
        nombre: true,
        urlFoto: true,
        puntosTotales: true,
        empresa: { select: { nombre: true, urlLogo: true } },
        grupo: { select: { nombre: true, colorHex: true } },
      },
    }),
    obtenerRankingConConfiguracion(),
  ]);
  return Response.json(
    { configuracion: ranking.configuracion, individual, equipos: ranking.equipos },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
