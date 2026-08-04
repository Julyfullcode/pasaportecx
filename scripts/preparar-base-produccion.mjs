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
  console.log("Base de producción preparada.");
} finally {
  await db.$disconnect();
}
