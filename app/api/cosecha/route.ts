import { participanteActual } from "@/lib/auth";
import { crearTarjetaCosechaParticipante } from "@/lib/cosecha-servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const participante = await participanteActual();
  if (!participante) return Response.json({ error: "Debes iniciar sesión para ver tu tarjeta." }, { status: 401 });
  const tarjeta = await crearTarjetaCosechaParticipante(participante);
  if (!tarjeta) return Response.json({ error: "Completa el desafío de cierre para crear tu tarjeta." }, { status: 404 });
  return new Response(Buffer.from(tarjeta.pdf), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `inline; filename="cosecha-${tarjeta.nombreSeguro || "participante"}.pdf"`,
      "Content-Type": "application/pdf",
    },
  });
}
