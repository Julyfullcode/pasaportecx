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
      let grupoId = datos.grupoId;
      if (configuracion.asignacionAutomatica) {
        await tx.$queryRaw`WITH bloqueo AS MATERIALIZED (SELECT pg_advisory_xact_lock(1302026)) SELECT 1 AS "adquirido" FROM bloqueo`;
        const grupos = await tx.grupo.findMany({
          where: { activo: true },
          include: { _count: { select: { participantes: { where: { activo: true } } } } },
          orderBy: { orden: "asc" },
        });
        grupoId = grupos.sort(
          (a, b) => a._count.participantes - b._count.participantes || a.orden - b.orden,
        )[0]?.id;
      }
      if (!grupoId) throw new Error("No hay un equipo disponible");
      let codigo = codigoRecuperacion();
      while (await tx.participante.findUnique({ where: { codigoRecuperacion: codigo } })) {
        codigo = codigoRecuperacion();
      }
      return tx.participante.create({
        data: {
          nombre: nombreCompleto,
          empresaId: datos.empresaId,
          grupoId,
          urlFoto: urlFoto!,
          codigoRecuperacion: codigo,
          puntosRegistro: configuracion.puntosPorRegistro,
          puntosTotales: configuracion.puntosPorRegistro,
        },
        include: { grupo: true },
      });
    }, { maxWait: 10_000, timeout: 15_000 });
    participantePersistido = true;
    await crearSesionParticipante(participante.id);
    anunciarCambio("participante");
    return Response.json({
      participante: {
        nombre: participante.nombre,
        codigoRecuperacion: participante.codigoRecuperacion,
        grupo: participante.grupo.nombre,
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
    return Response.json(
      { error: "No pudimos completar el registro. Tus datos siguen en el formulario; vuelve a intentarlo." },
      { status: 500 },
    );
  }
}
