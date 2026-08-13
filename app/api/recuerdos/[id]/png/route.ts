import { requerirAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { generarRecuerdoPng, nombrePngSeguro } from "@/lib/recuerdo-png";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requerirAdmin();
  const { id } = await params;
  const recuerdo = await db.recuerdo.findUnique({ where: { id }, include: { participante: { include: { empresa: true } }, reacciones: { select: { tipo: true } } } });
  if (!recuerdo) return Response.json({ error: "Recuerdo no encontrado." }, { status: 404 });
  const png = await generarRecuerdoPng({
    urlFoto: recuerdo.urlFoto,
    comentario: recuerdo.descripcion,
    autor: recuerdo.participante.nombre,
    empresa: recuerdo.participante.empresa.nombre,
    urlFotoAutor: recuerdo.participante.urlFoto,
    corazones: recuerdo.reacciones.filter((r) => r.tipo === "CORAZON").length,
    risas: recuerdo.reacciones.filter((r) => r.tipo === "RISA").length,
  });
  const nombre = nombrePngSeguro(recuerdo.participante.nombre);
  return new Response(png, { headers: { "Content-Type": "image/png", "Content-Disposition": `attachment; filename="recuerdo-${nombre}.png"`, "Cache-Control": "private, no-store" } });
}