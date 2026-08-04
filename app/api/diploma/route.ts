import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { participanteActual } from "@/lib/auth";
import { db } from "@/lib/db";
import { generarDiplomaPdf } from "@/lib/diploma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const participante = await participanteActual();
  if (!participante) return Response.json({ error: "Debes iniciar sesión para generar tu certificado." }, { status: 401 });

  const config = await db.configuracionEvento.findUniqueOrThrow({ where: { id: "evento" } });
  if (!config.diplomaHabilitado) {
    return Response.json(
      { error: "Tu certificado estará disponible al finalizar el encuentro." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }
  let logo: Uint8Array | undefined;
  try {
    logo = await readFile(join(process.cwd(), "public", "marca", "logo-grupo-epm-blanco.png"));
  } catch {
    logo = undefined;
  }

  const [fuenteRegular, fuenteSemibold] = await Promise.all([
    readFile(join(process.cwd(), "public", "fuentes", "Poppins-Regular.ttf")).catch(() => undefined),
    readFile(join(process.cwd(), "public", "fuentes", "Poppins-SemiBold.ttf")).catch(() => undefined),
  ]);

  const pdf = await generarDiplomaPdf({
    nombre: participante.nombre,
    empresa: participante.empresa.nombre,
    evento: config.nombreEvento,
    organizadores: config.organizadoresAgenda,
    fecha: new Date(),
    logo,
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
      "Content-Disposition": `inline; filename="certificado-${nombreSeguro || "participante"}.pdf"`,
      "Content-Type": "application/pdf",
    },
  });
}
