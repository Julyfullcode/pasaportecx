import { participanteActual } from "@/lib/auth";
import { crearPasaporteParticipante } from "@/lib/pasaporte-servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const participante = await participanteActual();
  if (!participante) return Response.json({ error: "Debes iniciar sesión para descargar tu pasaporte." }, { status: 401 });

  try {
    const origen = new URL(request.url).origin;
    const { pdf, nombreSeguro } = await crearPasaporteParticipante(participante, origen);

    return new Response(Buffer.from(pdf), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `inline; filename="pasaporte-${nombreSeguro || "participante"}.pdf"`,
        "Content-Type": "application/pdf",
      },
    });
  } catch (error) {
    console.error("No se pudo generar el pasaporte PDF", error);
    return Response.json({ error: "No pudimos generar tu pasaporte. Vuelve a intentarlo." }, { status: 500 });
  }
}
