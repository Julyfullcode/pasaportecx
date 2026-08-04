import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const CLAVE_MIGRACION = "seguridad-20260804-84d3b96f";

export async function POST(request: Request) {
  if (request.headers.get("x-clave-migracion") !== CLAVE_MIGRACION) {
    return Response.json({ error: "No encontrado" }, { status: 404 });
  }

  await db.$executeRawUnsafe(
    'ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "intentosFallidos" INTEGER NOT NULL DEFAULT 0',
  );
  await db.$executeRawUnsafe(
    'ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "ultimoIntentoFallido" TIMESTAMP',
  );
  await db.$executeRawUnsafe(
    'ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "bloqueadoHasta" TIMESTAMP',
  );
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "LimiteSolicitud" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "accion" TEXT NOT NULL,
      "claveHash" TEXT NOT NULL,
      "ventana" TIMESTAMP NOT NULL,
      "cantidad" INTEGER NOT NULL DEFAULT 1,
      "expiraEn" TIMESTAMP NOT NULL
    )
  `);
  await db.$executeRawUnsafe(
    'CREATE UNIQUE INDEX IF NOT EXISTS "LimiteSolicitud_accion_claveHash_ventana_key" ON "LimiteSolicitud"("accion", "claveHash", "ventana")',
  );
  await db.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS "LimiteSolicitud_expiraEn_idx" ON "LimiteSolicitud"("expiraEn")',
  );

  return Response.json({ ok: true });
}
