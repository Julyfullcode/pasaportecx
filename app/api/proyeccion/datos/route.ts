import { adminActual } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await adminActual())) return Response.json({ error: "Sin autorización" }, { status: 401 });
  const [individual, configuracion, recuerdos] = await Promise.all([
    db.participante.findMany({
      where: { activo: true, esStaff: false },
      orderBy: [{ puntosTotales: "desc" }, { creadoEn: "desc" }],
      select: {
        id: true,
        nombre: true,
        urlFoto: true,
        puntosTotales: true,
        empresa: { select: { nombre: true, urlLogo: true } },
      },
    }),
    db.configuracionEvento.findUniqueOrThrow({ where: { id: "evento" } }),
    db.recuerdo.findMany({
      where: { visible: true, pendiente: false, reportado: false },
      orderBy: [{ reacciones: { _count: "desc" } }, { creadoEn: "desc" }],
      take: 20,
      select: {
        id: true,
        urlFoto: true,
        descripcion: true,
        participante: { select: { nombre: true, urlFoto: true } },
        reacciones: { select: { tipo: true } },
      },
    }),
  ]);
  return Response.json(
    { configuracion, individual, recuerdos },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
