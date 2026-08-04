import { PrismaClient } from "@prisma/client";

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url || !url.startsWith("postgres")) {
  throw new Error("La migración de producción requiere una conexión PostgreSQL.");
}

const db = new PrismaClient({ datasources: { db: { url } } });
try {
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
