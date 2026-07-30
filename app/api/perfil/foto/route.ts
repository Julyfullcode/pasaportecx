import { participanteActual } from "@/lib/auth";
import { db } from "@/lib/db";
import { anunciarCambio } from "@/lib/eventos";
import { storage } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const participante = await participanteActual();
  if (!participante) return Response.json({ error: "Tu sesión ya no está activa." }, { status: 401 });

  let nuevaUrl: string | undefined;
  let perfilActualizado = false;
  try {
    const formulario = await request.formData();
    const foto = formulario.get("foto");
    if (!(foto instanceof File) || foto.type !== "image/jpeg") {
      return Response.json({ error: "Selecciona una fotografía válida." }, { status: 400 });
    }
    if (foto.size > 550_000) {
      return Response.json({ error: "La fotografía supera 500 KB. Intenta con otra." }, { status: 400 });
    }

    nuevaUrl = await storage.guardar(new Uint8Array(await foto.arrayBuffer()), "jpg", "perfiles");
    const actualizado = await db.participante.updateMany({
      where: { id: participante.id, urlFoto: participante.urlFoto },
      data: { urlFoto: nuevaUrl },
    });
    if (actualizado.count !== 1) {
      await storage.eliminar(nuevaUrl).catch(() => undefined);
      return Response.json({ error: "Tu foto cambió en otra ventana. Actualiza la página e inténtalo de nuevo." }, { status: 409 });
    }
    perfilActualizado = true;

    if (participante.urlFoto.startsWith("/uploads/")) {
      try {
        await storage.eliminar(participante.urlFoto);
      } catch (error) {
        console.error("No se pudo eliminar la foto de perfil anterior", error);
      }
    }
    anunciarCambio("participante");
    return Response.json({ urlFoto: nuevaUrl });
  } catch (error) {
    console.error(error);
    if (nuevaUrl && !perfilActualizado) await storage.eliminar(nuevaUrl).catch(() => undefined);
    return Response.json({ error: "No pudimos actualizar tu foto. Vuelve a intentarlo." }, { status: 500 });
  }
}
