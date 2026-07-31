import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { participanteActual } from "@/lib/auth";
import { db } from "@/lib/db";
import { generarPasaportePdf } from "@/lib/pasaporte";
import { storage } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const participante = await participanteActual();
  if (!participante) return Response.json({ error: "Debes iniciar sesión para descargar tu pasaporte." }, { status: 401 });

  try {
    const config = await db.configuracionEvento.findUniqueOrThrow({ where: { id: "evento" } });
    const [logo, foto, fuenteRegular, fuenteSemibold] = await Promise.all([
      readFile(join(process.cwd(), "public", "marca", "logo-grupo-epm-blanco.png")).catch(() => undefined),
      participante.urlFoto.startsWith("/uploads/")
        ? storage.leer(participante.urlFoto)
          .then((imagen) => sharp(imagen).rotate().resize(420, 420, { fit: "cover", position: "centre" }).png().toBuffer())
          .catch(() => undefined)
        : Promise.resolve(undefined),
      readFile(join(process.cwd(), "public", "fuentes", "Poppins-Regular.ttf")).catch(() => undefined),
      readFile(join(process.cwd(), "public", "fuentes", "Poppins-SemiBold.ttf")).catch(() => undefined),
    ]);
    const origen = new URL(request.url).origin;
    const pdf = await generarPasaportePdf({
      nombre: participante.nombre,
      empresa: participante.empresa.nombre,
      equipo: participante.grupo.nombre,
      evento: config.nombreEvento,
      codigo: participante.codigoRecuperacion,
      urlRecuperacion: `${origen}/recuperar/${participante.codigoRecuperacion}`,
      logo,
      foto,
      fuenteRegular,
      fuenteSemibold,
    });
    const nombreSeguro = participante.nombre
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();

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
