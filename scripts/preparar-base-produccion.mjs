import { PrismaClient } from "@prisma/client";

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url || !url.startsWith("postgres")) {
  throw new Error("La migración de producción requiere una conexión PostgreSQL.");
}

const db = new PrismaClient({ datasources: { db: { url } } });
try {
  await db.$executeRawUnsafe(
    'ALTER TABLE "Participante" '
    + 'ADD COLUMN IF NOT EXISTS "esStaff" BOOLEAN NOT NULL DEFAULT false',
  );
  await db.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS "Participante_activo_esStaff_puntosTotales_idx" '
    + 'ON "Participante"("activo", "esStaff", "puntosTotales")',
  );
  await db.$executeRawUnsafe(
    'ALTER TABLE "ConfiguracionEvento" '
    + 'ADD COLUMN IF NOT EXISTS "puntosFotoMasReaccionada" INTEGER NOT NULL DEFAULT 0, '
    + 'ADD COLUMN IF NOT EXISTS "revisionPremioReacciones" INTEGER NOT NULL DEFAULT 0',
  );
  await db.$executeRawUnsafe(
    'ALTER TABLE "Desafio" '
    + 'ADD COLUMN IF NOT EXISTS "duracionMinutos" INTEGER DEFAULT 60, '
    + 'ADD COLUMN IF NOT EXISTS "publicadoEn" TIMESTAMP',
  );
  await db.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS "CorreoAutorizado" ('
    + '"id" TEXT NOT NULL PRIMARY KEY, '
    + '"correo" TEXT NOT NULL, '
    + '"participanteId" TEXT, '
    + '"creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, '
    + 'CONSTRAINT "CorreoAutorizado_participanteId_fkey" '
    + 'FOREIGN KEY ("participanteId") REFERENCES "Participante"("id") '
    + 'ON DELETE SET NULL ON UPDATE CASCADE)'
  );
  await db.$executeRawUnsafe(
    'CREATE UNIQUE INDEX IF NOT EXISTS "CorreoAutorizado_correo_key" '
    + 'ON "CorreoAutorizado"("correo")',
  );
  await db.$executeRawUnsafe(
    'CREATE UNIQUE INDEX IF NOT EXISTS "CorreoAutorizado_participanteId_key" '
    + 'ON "CorreoAutorizado"("participanteId")',
  );
  await db.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS "CorreoAutorizado_creadoEn_idx" '
    + 'ON "CorreoAutorizado"("creadoEn")',
  );
  await db.$executeRawUnsafe(
    'UPDATE "Desafio" SET "duracionMinutos" = NULL '
    + 'WHERE "disponibleHasta" IS NOT NULL',
  );
  await db.$executeRawUnsafe(
    'UPDATE "Desafio" SET "publicadoEn" = CURRENT_TIMESTAMP '
    + "WHERE \"estado\" = 'PUBLICADO' "
    + 'AND "duracionMinutos" IS NOT NULL AND "publicadoEn" IS NULL',
  );
  console.log("Base de producción preparada.");
} finally {
  await db.$disconnect();
}
