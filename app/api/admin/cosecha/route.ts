import JSZip from "jszip";
import { requerirAdmin } from "@/lib/auth";
import { CODIGO_DESAFIO_CIERRE, esRespuestasCosecha } from "@/lib/cosecha-config";
import { db } from "@/lib/db";
import { generarTarjetaCosechaPng, nombreCosechaSeguro } from "@/lib/tarjeta-cosecha-png";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {
  await requerirAdmin();

  const [completitudes, evento] = await Promise.all([
    db.completitud.findMany({
      where: {
        estado: "APROBADO",
        desafio: { codigoQr: CODIGO_DESAFIO_CIERRE },
      },
      orderBy: [{ completadoEn: "asc" }, { id: "asc" }],
      select: {
        id: true,
        respuesta: true,
        participante: { select: { nombre: true, urlFoto: true, empresa: { select: { nombre: true } } } },
      },
    }),
    db.configuracionEvento.findUniqueOrThrow({ where: { id: "evento" }, select: { nombreEvento: true } }),
  ]);

  if (!completitudes.length) {
    return Response.json(
      { error: "No hay tarjetas de cierre para descargar." },
      { status: 404, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const zip = new JSZip();
  let cantidad = 0;

  for (let inicio = 0; inicio < completitudes.length; inicio += 4) {
    const lote = await Promise.all(completitudes.slice(inicio, inicio + 4).map(async (completitud) => {
      if (!esRespuestasCosecha(completitud.respuesta)) return null;
      return {
        completitud,
        png: await generarTarjetaCosechaPng({
          nombre: completitud.participante.nombre,
          empresa: completitud.participante.empresa.nombre,
          evento: evento.nombreEvento,
          respuestas: completitud.respuesta,
          urlFoto: completitud.participante.urlFoto,
        }),
      };
    }));

    for (const item of lote) {
      if (!item) continue;
      cantidad += 1;
      zip.file(
        `${String(cantidad).padStart(3, "0")}-cosecha-${nombreCosechaSeguro(item.completitud.participante.nombre)}-${item.completitud.id}.png`,
        item.png,
      );
    }
  }

  if (!cantidad) {
    return Response.json(
      { error: "No hay tarjetas de cierre válidas para descargar." },
      { status: 404, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const archivo = await zip.generateAsync({ type: "uint8array", compression: "STORE" });
  return new Response(archivo, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="tarjetas-desafio-cierre-png.zip"',
      "Cache-Control": "private, no-store, no-cache, max-age=0, must-revalidate",
      "CDN-Cache-Control": "no-store",
      "Vercel-CDN-Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
