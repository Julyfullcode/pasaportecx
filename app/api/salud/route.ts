import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const inicio = Date.now();
  try {
    const [, agendaDias, , fotosDias, configuracion, reaccionesRecuerdos] = await Promise.all([
      db.$queryRaw`SELECT 1 AS "ok"`,
      db.diaAgenda.count(),
      db.momentoAgenda.findFirst({ select: { destacado: true, urlFotoExpositor: true } }),
      db.fotoDiaAgenda.count(),
      db.configuracionEvento.findUnique({ where: { id: "evento" }, select: { maxRecuerdosPorParticipante: true, eliminarEvidenciasRechazadas: true } }),
      db.reaccionRecuerdo.count(),
    ]);
    return Response.json(
      {
        ok: true,
        baseDeDatos: "conectada",
        agendaDias,
        fotosExpositores: true,
        momentosDestacados: true,
        fotosDias,
        reaccionesRecuerdos,
        maxRecuerdosPorParticipante: configuracion?.maxRecuerdosPorParticipante,
        limpiezaEvidenciasRechazadas: configuracion?.eliminarEvidenciasRechazadas,
        imagenesWebp: true,
        latenciaMs: Date.now() - inicio,
        version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { ok: false, baseDeDatos: "sin conexión" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
