import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const CLAVE_MIGRACION = "eliminar-grupos-20260804-c71e5a42";

export async function POST(request: Request) {
  if (request.headers.get("x-clave-migracion") !== CLAVE_MIGRACION) {
    return Response.json({ error: "No encontrado" }, { status: 404 });
  }

  await db.$executeRawUnsafe(`
    UPDATE "ConfiguracionEvento"
    SET "cicloMixto" = trim(both ',' from replace(regexp_replace("cicloMixto", '(^|,)equipos:[0-9]+', '', 'g'), ',,', ','))
    WHERE "cicloMixto" LIKE '%equipos:%'
  `);
  await db.$executeRawUnsafe(
    'ALTER TABLE "Participante" DROP CONSTRAINT IF EXISTS "Participante_grupoId_fkey"',
  );
  await db.$executeRawUnsafe('DROP INDEX IF EXISTS "Participante_grupoId_idx"');
  await db.$executeRawUnsafe('ALTER TABLE "Participante" DROP COLUMN IF EXISTS "grupoId"');
  await db.$executeRawUnsafe('DROP TABLE IF EXISTS "Grupo"');
  await db.$executeRawUnsafe(
    'ALTER TABLE "ConfiguracionEvento" DROP COLUMN IF EXISTS "tamanoPodioEquipos"',
  );
  await db.$executeRawUnsafe(
    'ALTER TABLE "ConfiguracionEvento" DROP COLUMN IF EXISTS "metodoPuntajeEquipo"',
  );
  await db.$executeRawUnsafe(
    'ALTER TABLE "ConfiguracionEvento" DROP COLUMN IF EXISTS "asignacionAutomatica"',
  );
  await db.$executeRawUnsafe('DROP TYPE IF EXISTS "MetodoPuntajeEquipo"');

  const [tablaGrupo, columnas] = await Promise.all([
    db.$queryRawUnsafe<{ existe: boolean }[]>(
      `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Grupo') AS existe`,
    ),
    db.$queryRawUnsafe<{ column_name: string }[]>(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name IN ('Participante', 'ConfiguracionEvento') AND column_name IN ('grupoId', 'tamanoPodioEquipos', 'metodoPuntajeEquipo', 'asignacionAutomatica')`,
    ),
  ]);

  return Response.json({
    ok: tablaGrupo[0]?.existe === false && columnas.length === 0,
    tablaGrupoEliminada: tablaGrupo[0]?.existe === false,
    columnasEliminadas: columnas.length === 0,
  });
}
