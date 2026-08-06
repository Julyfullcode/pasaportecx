import { participanteActual } from "@/lib/auth";
import { crearTarjetaCosechaParticipante } from "@/lib/cosecha-servidor";

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

export async function GET(request: Request) {
  const participante = await participanteActual();
  if (!participante) {
    return Response.json(
      { error: "Debes iniciar sesión para ver tu tarjeta." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const version = new URL(request.url).searchParams.get("v")?.trim() || undefined;
  const tarjeta = await crearTarjetaCosechaParticipante(participante, version);
  if (!tarjeta) {
    return Response.json(
      { error: "Completa el desafío de cierre para crear tu tarjeta." },
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
