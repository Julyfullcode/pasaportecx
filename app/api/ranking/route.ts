import { db } from "@/lib/db";
import { adminActual, participanteActual } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const [participante, admin] = await Promise.all([participanteActual(), adminActual()]);
  if (!participante && !admin) {
    return Response.json({ error: "Sin autorización" }, { status: 401 });
  }
  const individual = await db.participante.findMany({
      where: { activo: true },
      orderBy: [{ puntosTotales: "desc" }, { creadoEn: "asc" }],
      select: {
        id: true,
        nombre: true,
        urlFoto: true,
        puntosTotales: true,
        empresa: { select: { nombre: true, urlLogo: true } },
      },
    });
  return Response.json(
    { individual },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
