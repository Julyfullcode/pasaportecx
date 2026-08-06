import { adminActual } from "@/lib/auth";
import { crearTarjetaCosechaParticipante } from "@/lib/cosecha-servidor";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const encabezadosPdfPrivado = {
  "Cache-Control": "private, no-store, no-cache, max-age=0, must-revalidate",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  "Pragma": "no-cache",
  "Expires": "0",
  "Vary": "Cookie",
  "Content-Type": "application/pdf",
  "X-Content-Type-Options": "nosniff",
};

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await adminActual();
  if (!admin) {
    return Response.json(
      { error: "Debes iniciar sesión como administrador." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { id } = await params;
  const participante = await db.participante.findUnique({ where: { id }, select: { id: true } });
  if (!participante) {
    return Response.json(
      { error: "No encontramos al participante." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  const tarjeta = await crearTarjetaCosechaParticipante(participante);
  if (!tarjeta) {
    return Response.json(
      { error: "Esta persona aún no ha completado el desafío de cierre." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  return new Response(Buffer.from(tarjeta.pdf), {
    headers: {
      ...encabezadosPdfPrivado,
      "Content-Disposition": `inline; filename="cosecha-${tarjeta.nombreSeguro || "participante"}-${tarjeta.completitudId}.pdf"`,
    },
  });
}
