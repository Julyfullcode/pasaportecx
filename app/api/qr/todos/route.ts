import { PDFDocument } from "pdf-lib";
import { requerirAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { estadoTemporalDesafio } from "@/lib/duracion-desafio";
import { esDesafioPuntualidad } from "@/lib/puntualidad";
import { qrPdf } from "@/lib/qr";

export async function GET(request: Request) {
  await requerirAdmin();
  const url = new URL(request.url);
  const dia = url.searchParams.get("dia");
  const filtroDia = dia === "0" || dia === "1" || dia === "2"
    ? { dia: Number(dia) }
    : {};
  const desafiosPublicados = await db.desafio.findMany({
    where: {
      estado: "PUBLICADO",
      ...filtroDia,
    },
    orderBy: [{ dia: "asc" }, { orden: "asc" }, { creadoEn: "asc" }],
  });
  const desafios = desafiosPublicados.filter(
    (desafio) => !esDesafioPuntualidad(desafio) && estadoTemporalDesafio(desafio) === "DISPONIBLE",
  );
  const destino = await PDFDocument.create();
  for (const desafio of desafios) {
    const origen = await PDFDocument.load(await qrPdf(desafio));
    const [pagina] = await destino.copyPages(origen, [0]);
    destino.addPage(pagina);
  }
  return new Response(await destino.save(), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="qr-publicados-pasaporte-cx.pdf"',
    },
  });
}
