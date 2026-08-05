import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const inicio = Date.now();
  try {
    const bucket = process.env.SUPABASE_STORAGE_BUCKET;
    const consultaStorage = bucket && process.env.STORAGE_DRIVER?.toLowerCase() === "supabase"
      ? db.$queryRaw<{ total: number }[]>`SELECT COUNT(*)::int AS "total" FROM storage.objects WHERE bucket_id = ${bucket}`
      : Promise.resolve([{ total: 0 }]);
    const [, agendaDias, , fotosDias, configuracion, reaccionesRecuerdos, correosAutorizados, objetosStorage] = await Promise.all([
      db.$queryRaw`SELECT 1 AS "ok"`,
      db.diaAgenda.count(),
      db.momentoAgenda.findFirst({ select: { destacado: true, urlFotoExpositor: true } }),
      db.fotoDiaAgenda.count(),
      db.configuracionEvento.findUnique({ where: { id: "evento" }, select: { maxRecuerdosPorParticipante: true, eliminarEvidenciasRechazadas: true, diplomaHabilitado: true } }),
      db.reaccionRecuerdo.count(),
      db.correoAutorizado.count(),
      consultaStorage,
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
        correosAutorizados,
        maxRecuerdosPorParticipante: configuracion?.maxRecuerdosPorParticipante,
        limpiezaEvidenciasRechazadas: configuracion?.eliminarEvidenciasRechazadas,
        diplomaHabilitado: configuracion?.diplomaHabilitado,
        imagenesWebp: true,
        almacenamientoConsultable: true,
        objetosAlmacenados: Number(objetosStorage[0]?.total ?? 0),
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
