import { db } from "@/lib/db";
import { crearSesionParticipante } from "@/lib/auth";
import { consumirLimite } from "@/lib/limite-solicitudes";

export async function POST(request: Request) {
  const limite = await consumirLimite({ accion: "recuperar-sesion", limite: 60, ventanaSegundos: 60, request });
  if (!limite.permitido) {
    return Response.json(
      { error: "Demasiados intentos. Espera un momento e intenta nuevamente." },
      { status: 429, headers: { "Retry-After": String(limite.reintentarEn) } },
    );
  }
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
