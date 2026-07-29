import { db } from "@/lib/db";
import { crearSesionParticipante } from "@/lib/auth";

export async function POST(request: Request) {
  const { codigo } = (await request.json()) as { codigo?: string };
  const participante = await db.participante.findUnique({
    where: { codigoRecuperacion: codigo?.trim().toUpperCase() ?? "" },
  });
  if (!participante || !participante.activo) {
    return Response.json({ error: "No encontramos un registro activo con ese código." }, { status: 404 });
  }
  await crearSesionParticipante(participante.id);
  return Response.json({ ok: true });
}
