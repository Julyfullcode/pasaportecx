import { adminActual } from "@/lib/auth";
import { consultarEquiposProyeccion } from "@/lib/equipos-proyeccion";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await adminActual())) {
    return Response.json({ error: "Sin autorización" }, { status: 401 });
  }
  const equipos = await consultarEquiposProyeccion();
  return Response.json(
    { equipos },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}