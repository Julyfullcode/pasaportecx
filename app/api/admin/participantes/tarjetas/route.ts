import JSZip from "jszip";
import { requerirAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { generarParticipantePng, nombreParticipanteSeguro } from "@/lib/participante-png";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {
  await requerirAdmin();
  const participantes = await db.participante.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
    select: { nombre: true, urlFoto: true, empresa: { select: { nombre: true, urlLogo: true } } },
  });
  if (!participantes.length) return Response.json({ error: "No hay participantes para exportar." }, { status: 404 });
  const zip = new JSZip();
  for (let inicio = 0; inicio < participantes.length; inicio += 4) {
    const lote = await Promise.all(participantes.slice(inicio, inicio + 4).map(async (participante, indice) => ({
      indice: inicio + indice,
      participante,
      png: await generarParticipantePng({ nombre: participante.nombre, empresa: participante.empresa.nombre, urlFoto: participante.urlFoto, urlLogoEmpresa: participante.empresa.urlLogo }),
    })));
    for (const item of lote) zip.file(`${String(item.indice + 1).padStart(3, "0")}-${nombreParticipanteSeguro(item.participante.nombre)}.png`, item.png);
  }
  const archivo = await zip.generateAsync({ type: "uint8array", compression: "STORE" });
  return new Response(archivo, { headers: { "Content-Type": "application/zip", "Content-Disposition": 'attachment; filename="tarjetas-participantes.zip"', "Cache-Control": "private, no-store" } });
}