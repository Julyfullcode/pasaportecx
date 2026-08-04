import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const CLAVE_MIGRACION = "puntos-registro-20260804-9f2c7a41";

export async function POST(request: Request) {
  if (request.headers.get("x-clave-migracion") !== CLAVE_MIGRACION) {
    return Response.json({ error: "No encontrado" }, { status: 404 });
  }

  await db.$executeRawUnsafe(
    'ALTER TABLE "ConfiguracionEvento" ADD COLUMN IF NOT EXISTS "puntosPorRegistro" INTEGER NOT NULL DEFAULT 0',
  );
  await db.$executeRawUnsafe(
    'ALTER TABLE "Participante" ADD COLUMN IF NOT EXISTS "puntosRegistro" INTEGER NOT NULL DEFAULT 0',
  );

  return Response.json({ ok: true });
}
