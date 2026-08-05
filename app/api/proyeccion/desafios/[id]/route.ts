import { adminActual } from "@/lib/auth";
import { obtenerSeguimientoDesafio } from "@/lib/seguimiento-desafio";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await adminActual())) {
    return Response.json({ error: "Sin autorización" }, { status: 401 });
  }
  const { id } = await params;
  const seguimiento = await obtenerSeguimientoDesafio(id);
  if (!seguimiento) {
    return Response.json({ error: "Desafío no encontrado" }, { status: 404 });
  }
  return Response.json(seguimiento, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
