import { ZodError } from "zod";
import { participanteActual } from "@/lib/auth";
import { db } from "@/lib/db";
import { anunciarCambio } from "@/lib/eventos";
import { consumirLimite } from "@/lib/limite-solicitudes";
import { actualizarPerfilSchema } from "@/lib/validacion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const participante = await participanteActual();
  if (!participante) return Response.json({ error: "Tu sesión ya no está activa." }, { status: 401 });

  const limite = await consumirLimite({ accion: "actualizar-perfil", limite: 20, ventanaSegundos: 60, request });
  if (!limite.permitido) {
    return Response.json({ error: "Espera un momento antes de volver a guardar." }, { status: 429 });
  }

  try {
    const datos = actualizarPerfilSchema.parse(Object.fromEntries(await request.formData()));
    const empresa = await db.empresa.findFirst({
      where: {
        id: datos.empresaId,
        OR: [{ activa: true }, { id: participante.empresaId }],
      },
      select: { id: true, nombre: true },
    });
    if (!empresa) return Response.json({ error: "Selecciona una empresa disponible." }, { status: 400 });

    const nombre = `${datos.nombres} ${datos.apellidos}`.replace(/\s+/g, " ").trim();
    await db.participante.update({
      where: { id: participante.id },
      data: {
        nombre,
        nombres: datos.nombres,
        apellidos: datos.apellidos,
        empresaId: empresa.id,
      },
    });
    anunciarCambio("participante");
    return Response.json({ nombre, empresa: empresa.nombre });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json({ error: error.issues[0]?.message ?? "Revisa los datos del perfil." }, { status: 400 });
    }
    console.error("No se pudo actualizar el perfil", error);
    return Response.json({ error: "No pudimos guardar tus datos. Inténtalo nuevamente." }, { status: 500 });
  }
}
