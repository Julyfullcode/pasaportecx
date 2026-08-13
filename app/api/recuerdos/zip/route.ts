import JSZip from "jszip";
import { requerirAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { generarRecuerdoPng, nombrePngSeguro } from "@/lib/recuerdo-png";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {
  await requerirAdmin();
  const recuerdos = await db.recuerdo.findMany({ orderBy: { creadoEn: "asc" }, include: { participante: { include: { empresa: true } }, reacciones: { select: { tipo: true } } } });
  if (!recuerdos.length) return Response.json({ error: "No hay recuerdos para exportar." }, { status: 404 });
  const zip = new JSZip();
  for (let inicio = 0; inicio < recuerdos.length; inicio += 4) {
    const lote = await Promise.all(recuerdos.slice(inicio, inicio + 4).map(async (recuerdo, indice) => ({
      indice: inicio + indice,
      recuerdo,
      png: await generarRecuerdoPng({
        urlFoto: recuerdo.urlFoto,
        comentario: recuerdo.descripcion,
        autor: recuerdo.participante.nombre,
        empresa: recuerdo.participante.empresa.nombre,
        urlFotoAutor: recuerdo.participante.urlFoto,
        corazones: recuerdo.reacciones.filter((r) => r.tipo === "CORAZON").length,
        risas: recuerdo.reacciones.filter((r) => r.tipo === "RISA").length,
      }),
    })));
    for (const item of lote) zip.file(`${String(item.indice + 1).padStart(3, "0")}-${nombrePngSeguro(item.recuerdo.participante.nombre)}.png`, item.png);
  }
  const archivo = await zip.generateAsync({ type: "uint8array", compression: "STORE" });
  return new Response(archivo, { headers: { "Content-Type": "application/zip", "Content-Disposition": 'attachment; filename="recuerdos-en-png.zip"', "Cache-Control": "private, no-store" } });
}