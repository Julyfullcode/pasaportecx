import JSZip from "jszip";
import { requerirAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";

export async function GET() {
  await requerirAdmin();
  const recuerdos = await db.recuerdo.findMany({
    orderBy: { creadoEn: "asc" },
    include: { participante: true },
  });
  const zip = new JSZip();
  for (let i = 0; i < recuerdos.length; i++) {
    const recuerdo = recuerdos[i];
    try {
      const datos = await storage.leer(recuerdo.urlFoto);
      const extension = recuerdo.urlFoto.split(".").at(-1) ?? "jpg";
      const nombre = recuerdo.participante.nombre.replace(/[^\p{L}\p{N}-]+/gu, "-").toLowerCase();
      zip.file(`${String(i + 1).padStart(3, "0")}-${nombre}.${extension}`, datos);
    } catch {}
  }
  const archivo = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 6 } });
  return new Response(archivo, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="album-pasaporte-cx.zip"',
    },
  });
}
