import { participanteActual } from "@/lib/auth";
import { db } from "@/lib/db";
import { anunciarCambio } from "@/lib/eventos";
import { storage } from "@/lib/storage";
import { extensionImagen } from "@/lib/archivos";
import { ImagenInvalidaError, normalizarImagen } from "@/lib/imagenes-servidor";

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
    const extension = foto instanceof File ? extensionImagen(foto.type) : null;
    if (!(foto instanceof File) || !extension) {
      return Response.json({ error: "Selecciona una fotografía válida." }, { status: 400 });
    }
    if (foto.size > 250_000) {
      return Response.json({ error: "La fotografía supera 250 KB. Intenta con otra." }, { status: 400 });
    }

    const imagen = await normalizarImagen(new Uint8Array(await foto.arrayBuffer()), {
      dimensionMaxima: 800,
      calidad: 82,
    });
    nuevaUrl = await storage.guardar(imagen.datos, imagen.extension, "perfiles");
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
    if (error instanceof ImagenInvalidaError) {
      return Response.json({ error: "La foto seleccionada no contiene una imagen válida." }, { status: 400 });
    }
    return Response.json({ error: "No pudimos actualizar tu foto. Vuelve a intentarlo." }, { status: 500 });
  }
}
