import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const inicio = Date.now();
  try {
    const bucket = process.env.SUPABASE_STORAGE_BUCKET;
    const consultaStorage = bucket && process.env.STORAGE_DRIVER?.toLowerCase() === "supabase"
      ? db.$queryRaw<{ total: number }[]>`SELECT COUNT(*)::int AS "total" FROM storage.objects WHERE bucket_id = ${bucket}`
      : Promise.resolve([{ total: 0 }]);
    const [, agendaDias, , fotosDias, configuracion, reaccionesRecuerdos, correosAutorizados, participantesStaff, objetosStorage, puntualidadLuis, diagnosticoLuis, diagnosticoTerminos] = await Promise.all([
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
        WHERE LOWER(CONCAT_WS(' ', p."nombre", p."nombres", p."apellidos")) LIKE '%luis%'
          AND LOWER(CONCAT_WS(' ', p."nombre", p."nombres", p."apellidos")) LIKE '%maldonado%'
          AND c."puntosOtorgados" IN (10, 14)
          AND (
            LOWER(d."titulo") LIKE '%puntualidad%'
            OR LOWER(d."titulo") LIKE '%llegada a tiempo%'
            OR LOWER(d."titulo") LIKE '%presentes a tiempo%'
            OR c."respuesta"->>'tipoEspecial' = 'PUNTUALIDAD'
            OR c."respuesta"->>'tipo' = 'PUNTUALIDAD'
          )
      `,      db.$queryRaw<{ personas: number; asignaciones14: number }[]>`
        SELECT
          COUNT(DISTINCT p."id")::int AS personas,
          COUNT(c."id") FILTER (WHERE c."puntosOtorgados" = 14)::int AS "asignaciones14"
        FROM "Participante" p
        LEFT JOIN "Completitud" c ON c."participanteId" = p."id"
        WHERE LOWER(CONCAT_WS(' ', p."nombre", p."nombres", p."apellidos")) LIKE '%luis%'
          AND LOWER(CONCAT_WS(' ', p."nombre", p."nombres", p."apellidos")) LIKE '%maldonado%'
      `,      db.$queryRaw<{ luis: number; fernando: number; maldonado: number; luisFernando: number; luisMaldonado: number; fernandoMaldonado: number; puntualidades14: number; luisFernandoPuntualidades14: number; luisMaldonadoPuntualidades14: number }[]>`
        SELECT
          COUNT(DISTINCT p."id") FILTER (WHERE LOWER(CONCAT_WS(' ', p."nombre", p."nombres", p."apellidos")) LIKE '%luis%')::int AS luis,
          COUNT(DISTINCT p."id") FILTER (WHERE LOWER(CONCAT_WS(' ', p."nombre", p."nombres", p."apellidos")) LIKE '%fernando%')::int AS fernando,
          COUNT(DISTINCT p."id") FILTER (WHERE LOWER(CONCAT_WS(' ', p."nombre", p."nombres", p."apellidos")) LIKE '%maldonado%')::int AS maldonado,
          COUNT(DISTINCT p."id") FILTER (WHERE LOWER(CONCAT_WS(' ', p."nombre", p."nombres", p."apellidos")) LIKE '%luis%' AND LOWER(CONCAT_WS(' ', p."nombre", p."nombres", p."apellidos")) LIKE '%fernando%')::int AS "luisFernando",
          COUNT(DISTINCT p."id") FILTER (WHERE LOWER(CONCAT_WS(' ', p."nombre", p."nombres", p."apellidos")) LIKE '%luis%' AND LOWER(CONCAT_WS(' ', p."nombre", p."nombres", p."apellidos")) LIKE '%maldonado%')::int AS "luisMaldonado",
          COUNT(DISTINCT p."id") FILTER (WHERE LOWER(CONCAT_WS(' ', p."nombre", p."nombres", p."apellidos")) LIKE '%fernando%' AND LOWER(CONCAT_WS(' ', p."nombre", p."nombres", p."apellidos")) LIKE '%maldonado%')::int AS "fernandoMaldonado",
          COUNT(c."id") FILTER (WHERE c."puntosOtorgados" = 14 AND (LOWER(d."titulo") LIKE '%puntualidad%' OR LOWER(d."titulo") LIKE '%llegada a tiempo%' OR LOWER(d."titulo") LIKE '%presentes a tiempo%' OR c."respuesta"->>'tipoEspecial' = 'PUNTUALIDAD' OR c."respuesta"->>'tipo' = 'PUNTUALIDAD'))::int AS "puntualidades14",
          COUNT(c."id") FILTER (WHERE c."puntosOtorgados" = 14 AND LOWER(CONCAT_WS(' ', p."nombre", p."nombres", p."apellidos")) LIKE '%luis%' AND LOWER(CONCAT_WS(' ', p."nombre", p."nombres", p."apellidos")) LIKE '%fernando%' AND (LOWER(d."titulo") LIKE '%puntualidad%' OR LOWER(d."titulo") LIKE '%llegada a tiempo%' OR LOWER(d."titulo") LIKE '%presentes a tiempo%' OR c."respuesta"->>'tipoEspecial' = 'PUNTUALIDAD' OR c."respuesta"->>'tipo' = 'PUNTUALIDAD'))::int AS "luisFernandoPuntualidades14",
          COUNT(c."id") FILTER (WHERE c."puntosOtorgados" = 14 AND LOWER(CONCAT_WS(' ', p."nombre", p."nombres", p."apellidos")) LIKE '%luis%' AND LOWER(CONCAT_WS(' ', p."nombre", p."nombres", p."apellidos")) LIKE '%maldonado%' AND (LOWER(d."titulo") LIKE '%puntualidad%' OR LOWER(d."titulo") LIKE '%llegada a tiempo%' OR LOWER(d."titulo") LIKE '%presentes a tiempo%' OR c."respuesta"->>'tipoEspecial' = 'PUNTUALIDAD' OR c."respuesta"->>'tipo' = 'PUNTUALIDAD'))::int AS "luisMaldonadoPuntualidades14"
        FROM "Participante" p
        LEFT JOIN "Completitud" c ON c."participanteId" = p."id"
        LEFT JOIN "Desafio" d ON d."id" = c."desafioId"
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
        diagnosticoAjuste: { personas: Number(diagnosticoLuis[0]?.personas ?? 0), asignaciones14: Number(diagnosticoLuis[0]?.asignaciones14 ?? 0), puntualidadesDetectadas: puntosPuntualidadLuis.length, terminos: diagnosticoTerminos[0] },
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
