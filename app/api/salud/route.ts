import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const inicio = Date.now();
  try {
    await db.$queryRaw`SELECT 1 AS "ok"`;
    return Response.json(
      {
        ok: true,
        baseDeDatos: "conectada",
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
