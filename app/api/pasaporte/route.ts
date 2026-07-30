import { readFile } from "node:fs/promises";
import { join } from "node:path";
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
    const [logo, foto] = await Promise.all([
      readFile(join(process.cwd(), "public", "marca", "logo-grupo-epm-oficial.png")).catch(() => undefined),
      participante.urlFoto.startsWith("/uploads/") ? storage.leer(participante.urlFoto).catch(() => undefined) : Promise.resolve(undefined),
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
        "Content-Disposition": `attachment; filename="pasaporte-${nombreSeguro || "participante"}.pdf"`,
        "Content-Type": "application/pdf",
      },
    });
  } catch (error) {
    console.error("No se pudo generar el pasaporte PDF", error);
    return Response.json({ error: "No pudimos generar tu pasaporte. Vuelve a intentarlo." }, { status: 500 });
  }
}
