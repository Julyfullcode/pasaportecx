import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { participanteActual } from "@/lib/auth";
import { db } from "@/lib/db";
import { generarDiplomaPdf } from "@/lib/diploma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const participante = await participanteActual();
  if (!participante) return Response.json({ error: "Debes iniciar sesión para generar tu diploma." }, { status: 401 });

  const config = await db.configuracionEvento.findUniqueOrThrow({ where: { id: "evento" } });
  let logo: Uint8Array | undefined;
  try {
    logo = await readFile(join(process.cwd(), "public", "marca", "logo-grupo-epm-oficial.png"));
  } catch {
    logo = undefined;
  }

  const pdf = await generarDiplomaPdf({
    nombre: participante.nombre,
    empresa: participante.empresa.nombre,
    equipo: participante.grupo.nombre,
    evento: config.nombreEvento,
    fecha: new Date(),
    logo,
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
      "Content-Disposition": `attachment; filename="diploma-${nombreSeguro || "participante"}.pdf"`,
      "Content-Type": "application/pdf",
    },
  });
}
