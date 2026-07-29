import { PDFDocument } from "pdf-lib";
import { requerirAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { qrPdf } from "@/lib/qr";

export async function GET(request: Request) {
  await requerirAdmin();
  const url = new URL(request.url);
  const dia = url.searchParams.get("dia");
  const componenteId = url.searchParams.get("componenteId");
  const desafios = await db.desafio.findMany({
    where: {
      estado: "PUBLICADO",
      ...(dia ? { dia: Number(dia) } : {}),
      ...(componenteId ? { componenteId } : {}),
    },
    orderBy: [{ dia: "asc" }, { creadoEn: "asc" }],
  });
  const destino = await PDFDocument.create();
  for (const desafio of desafios) {
    const origen = await PDFDocument.load(await qrPdf(desafio));
    const [pagina] = await destino.copyPages(origen, [0]);
    destino.addPage(pagina);
  }
  return new Response(await destino.save(), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="qr-publicados-pasaporte-cx.pdf"',
    },
  });
}
