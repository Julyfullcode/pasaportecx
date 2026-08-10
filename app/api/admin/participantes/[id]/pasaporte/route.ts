import { adminActual } from "@/lib/auth";
import { db } from "@/lib/db";
import { crearPasaporteParticipante } from "@/lib/pasaporte-servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await adminActual();
  if (!admin) return Response.json({ error: "Debes iniciar sesión como administrador." }, { status: 401 });

  const { id } = await params;
  const participante = await db.participante.findUnique({
    where: { id },
    include: { empresa: true, equipo: true },
  });
  if (!participante) return Response.json({ error: "No encontramos al participante." }, { status: 404 });

  try {
    const { pdf, nombreSeguro } = await crearPasaporteParticipante(participante, new URL(request.url).origin);
    return new Response(Buffer.from(pdf), {
      headers: {
        "Cache-Control": "private, no-store, no-cache, max-age=0, must-revalidate",
        "CDN-Cache-Control": "no-store",
        "Vercel-CDN-Cache-Control": "no-store",
        "Surrogate-Control": "no-store",
        Pragma: "no-cache",
        Expires: "0",
        "Content-Disposition": `inline; filename="pasaporte-${nombreSeguro || "participante"}.pdf"`,
        "Content-Type": "application/pdf",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("No se pudo generar el pasaporte desde administración", error);
    return Response.json({ error: "No pudimos generar el pasaporte del participante." }, { status: 500 });
  }
}
