import { db } from "@/lib/db";
import { requerirAdmin } from "@/lib/auth";
import { qrPdf, qrPng } from "@/lib/qr";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requerirAdmin();
  const { id } = await params;
  const desafio = await db.desafio.findUnique({ where: { id } });
  if (!desafio) return Response.json({ error: "Desafío no encontrado" }, { status: 404 });
  const formato = new URL(request.url).searchParams.get("formato") ?? "png";
  if (formato === "pdf") {
    return new Response(await qrPdf(desafio), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${desafio.codigoQr}.pdf"`,
      },
    });
  }
  return new Response(await qrPng(desafio.codigoQr), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="${desafio.codigoQr}.png"`,
    },
  });
}
