import { adminActual } from "@/lib/auth";
import { db } from "@/lib/db";
import { obtenerRankingEquipos } from "@/lib/equipos";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await adminActual())) return Response.json({ error: "Sin autorización" }, { status: 401 });
  const [configuracion, individual, equipos, recuerdos] = await Promise.all([
    db.configuracionEvento.findUniqueOrThrow({ where: { id: "evento" } }),
    db.participante.findMany({ where: { activo: true }, orderBy: [{ puntosTotales: "desc" }, { creadoEn: "desc" }], include: { empresa: true, grupo: true } }),
    obtenerRankingEquipos(),
    db.recuerdo.findMany({ where: { visible: true, pendiente: false, reportado: false }, orderBy: { creadoEn: "desc" }, take: 20, include: { participante: true } }),
  ]);
  return Response.json({ configuracion, individual, equipos, recuerdos });
}
