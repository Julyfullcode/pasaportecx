import { adminActual } from "@/lib/auth";
import { crearTarjetaCosechaParticipante } from "@/lib/cosecha-servidor";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await adminActual();
  if (!admin) return Response.json({ error: "Debes iniciar sesión como administrador." }, { status: 401 });
  const { id } = await params;
  const participante = await db.participante.findUnique({
    where: { id },
    include: { empresa: true, grupo: true },
  });
  if (!participante) return Response.json({ error: "No encontramos al participante." }, { status: 404 });
  const tarjeta = await crearTarjetaCosechaParticipante(participante);
  if (!tarjeta) return Response.json({ error: "Esta persona aún no ha completado el desafío de cierre." }, { status: 404 });
  return new Response(Buffer.from(tarjeta.pdf), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `inline; filename="cosecha-${tarjeta.nombreSeguro || "participante"}.pdf"`,
      "Content-Type": "application/pdf",
    },
  });
}
