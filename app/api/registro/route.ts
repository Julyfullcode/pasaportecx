import { randomInt } from "node:crypto";
import { db } from "@/lib/db";
import { crearSesionParticipante } from "@/lib/auth";
import { storage } from "@/lib/storage";
import { registroSchema } from "@/lib/validacion";
import { anunciarCambio } from "@/lib/eventos";
import { extensionImagen } from "@/lib/archivos";
import { ImagenInvalidaError, normalizarImagen } from "@/lib/imagenes-servidor";
import { ZodError } from "zod";
import { consumirLimite } from "@/lib/limite-solicitudes";

const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

class CorreoYaRegistradoError extends Error {}

function codigoRecuperacion() {
  return Array.from({ length: 6 }, () => ALFABETO[randomInt(ALFABETO.length)]).join("");
}

export async function POST(request: Request) {
  const limite = await consumirLimite({ accion: "registro", limite: 120, ventanaSegundos: 60, request });
  if (!limite.permitido) {
    return Response.json(
      { error: "Hay demasiados registros en este momento. Espera un momento e intenta nuevamente." },
      { status: 429, headers: { "Retry-After": String(limite.reintentarEn) } },
    );
  }
  let urlFoto: string | undefined;
  let participantePersistido = false;
  try {
    const formulario = await request.formData();
    const datos = registroSchema.parse(Object.fromEntries(formulario));
    const autorizacion = await db.correoAutorizado.findUnique({
      where: { correo: datos.correo },
      select: { id: true, participanteId: true },
    });
    if (!autorizacion) {
      return Response.json({
        error: "Este correo no está autorizado. Conversa con alguien de la Vicepresidencia Experiencia Usuario-Cliente para solicitar autorización.",
      }, { status: 403 });
    }
    if (autorizacion.participanteId) {
      return Response.json({ error: "Este correo ya fue registrado en Pasaporte." }, { status: 409 });
    }
    const nombreCompleto = `${datos.nombres} ${datos.apellidos}`.replace(/\s+/g, " ").trim();
    const foto = formulario.get("foto");
    const extension = foto instanceof File ? extensionImagen(foto.type) : null;
    if (!(foto instanceof File) || !extension) {
      return Response.json({ error: "Selecciona una foto válida" }, { status: 400 });
    }
    if (foto.size > 800_000) {
      return Response.json({ error: "No pudimos optimizar esta fotografía. Intenta seleccionarla nuevamente." }, { status: 400 });
    }
    const configuracion = await db.configuracionEvento.findUniqueOrThrow({ where: { id: "evento" } });
    const imagen = await normalizarImagen(new Uint8Array(await foto.arrayBuffer()), {
      dimensionMaxima: 800,
      calidad: 82,
    });
    urlFoto = await storage.guardar(imagen.datos, imagen.extension, "perfiles");
    const participante = await db.$transaction(async (tx) => {
      let codigo = codigoRecuperacion();
      while (await tx.participante.findUnique({ where: { codigoRecuperacion: codigo } })) {
        codigo = codigoRecuperacion();
      }
      const creado = await tx.participante.create({
        data: {
          nombre: nombreCompleto,
          empresaId: datos.empresaId,
          urlFoto: urlFoto!,
          codigoRecuperacion: codigo,
          puntosRegistro: configuracion.puntosPorRegistro,
          puntosTotales: configuracion.puntosPorRegistro,
        },
      });
      const vinculacion = await tx.correoAutorizado.updateMany({
        where: { id: autorizacion.id, participanteId: null },
        data: { participanteId: creado.id },
      });
      if (vinculacion.count !== 1) throw new CorreoYaRegistradoError();
      return creado;
    }, { maxWait: 10_000, timeout: 15_000 });
    participantePersistido = true;
    await crearSesionParticipante(participante.id);
    anunciarCambio("participante");
    return Response.json({
      participante: {
        nombre: participante.nombre,
        codigoRecuperacion: participante.codigoRecuperacion,
      },
    });
  } catch (error) {
    console.error(error);
    if (urlFoto && !participantePersistido) await storage.eliminar(urlFoto).catch(() => undefined);
    if (error instanceof ZodError) {
      return Response.json(
        { error: error.issues[0]?.message ?? "Revisa los datos del registro." },
        { status: 400 },
      );
    }
    if (error instanceof ImagenInvalidaError) {
      return Response.json({ error: "La foto seleccionada no contiene una imagen válida." }, { status: 400 });
    }
    if (error instanceof CorreoYaRegistradoError) {
      return Response.json({ error: "Este correo ya fue registrado en Pasaporte." }, { status: 409 });
    }
    return Response.json(
      { error: "No pudimos completar el registro. Tus datos siguen en el formulario; vuelve a intentarlo." },
      { status: 500 },
    );
  }
}
