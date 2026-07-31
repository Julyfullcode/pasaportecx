import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { participanteActual } from "@/lib/auth";
import { db } from "@/lib/db";
import { generarAgendaPdf } from "@/lib/agenda";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await participanteActual())) return Response.json({ error: "Debes iniciar sesión para descargar la agenda." }, { status: 401 });
  try {
    const [config, dias, logo] = await Promise.all([
      db.configuracionEvento.findUniqueOrThrow({ where: { id: "evento" } }),
      db.diaAgenda.findMany({
        orderBy: { orden: "asc" },
        select: { nombre: true, momentos: { orderBy: [{ horaInicio: "asc" }, { nombre: "asc" }], select: { horaInicio: true, horaFin: true, nombre: true, descripcion: true } } },
      }).catch(() => []),
      readFile(join(process.cwd(), "public", "marca", "logo-grupo-epm-oficial.png")).catch(() => undefined),
    ]);
    const pdf = await generarAgendaPdf({ evento: config.nombreEvento, dias, logo });
    return new Response(Buffer.from(pdf), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": "attachment; filename=agenda-encuentro.pdf",
        "Content-Type": "application/pdf",
      },
    });
  } catch (error) {
    console.error("No se pudo generar la agenda PDF", error);
    return Response.json({ error: "No pudimos generar la agenda. Vuelve a intentarlo." }, { status: 500 });
  }
}
