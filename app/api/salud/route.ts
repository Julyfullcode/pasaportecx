import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const inicio = Date.now();
  try {
    const [, agendaDias] = await Promise.all([
      db.$queryRaw`SELECT 1 AS "ok"`,
      db.diaAgenda.count(),
    ]);
    return Response.json(
      {
        ok: true,
        baseDeDatos: "conectada",
        agendaDias,
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
