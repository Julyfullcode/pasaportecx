import { adminActual } from "@/lib/auth";
import { obtenerTarjetasCierre } from "@/lib/cosecha-proyeccion";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await adminActual())) return Response.json({ error: "Sin autorización" }, { status: 401 });
  return Response.json(
    { tarjetas: await obtenerTarjetasCierre() },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
