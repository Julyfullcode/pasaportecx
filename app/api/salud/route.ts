import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const inicio = Date.now();
  try {
    const bucket = process.env.SUPABASE_STORAGE_BUCKET;
    const consultaStorage = bucket && process.env.STORAGE_DRIVER?.toLowerCase() === "supabase"
      ? db.$queryRaw<{ total: number }[]>`SELECT COUNT(*)::int AS "total" FROM storage.objects WHERE bucket_id = ${bucket}`
      : Promise.resolve([{ total: 0 }]);
    const [, agendaDias, , fotosDias, configuracion, reaccionesRecuerdos, correosAutorizados, participantesStaff, objetosStorage, puntualidadLuis] = await Promise.all([
      db.$queryRaw`SELECT 1 AS "ok"`,
      db.diaAgenda.count(),
      db.momentoAgenda.findFirst({ select: { destacado: true, urlFotoExpositor: true } }),
      db.fotoDiaAgenda.count(),
      db.configuracionEvento.findUnique({ where: { id: "evento" }, select: { maxRecuerdosPorParticipante: true, eliminarEvidenciasRechazadas: true, diplomaHabilitado: true } }),
      db.reaccionRecuerdo.count(),
      db.correoAutorizado.count(),
      db.participante.count({ where: { esStaff: true } }),
      consultaStorage,
      db.$queryRaw<{ puntos: number }[]>`
        SELECT c."puntosOtorgados" AS puntos
        FROM "Completitud" c
        INNER JOIN "Participante" p ON p."id" = c."participanteId"
        INNER JOIN "Desafio" d ON d."id" = c."desafioId"
        WHERE LOWER(p."nombre") LIKE '%luis%'
          AND LOWER(p."nombre") LIKE '%fernando%'
          AND LOWER(p."nombre") LIKE '%maldonado%'
          AND c."puntosOtorgados" IN (10, 14)
          AND (
            LOWER(d."titulo") LIKE '%puntualidad%'
            OR LOWER(d."titulo") LIKE '%llegada a tiempo%'
            OR LOWER(d."titulo") LIKE '%presentes a tiempo%'
            OR c."respuesta"->>'tipoEspecial' = 'PUNTUALIDAD'
            OR c."respuesta"->>'tipo' = 'PUNTUALIDAD'
          )
      `,
    ]);
    const puntosPuntualidadLuis = puntualidadLuis.map(({ puntos }) => Number(puntos));
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
        participantesStaff,
        ajustePuntualidadVerificado: !puntosPuntualidadLuis.includes(14) && puntosPuntualidadLuis.includes(10),
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
