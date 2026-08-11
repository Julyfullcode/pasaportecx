import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { participanteActual } from "@/lib/auth";
import { storage } from "@/lib/storage";
import { bloquearPuntosParticipante, recalcularPuntosParticipante } from "@/lib/puntos";
import { anunciarCambio } from "@/lib/eventos";
import { presentarRecuerdo } from "@/lib/recuerdos";
import {
  actualizarPremioFotoMasReaccionada,
  PREFIJO_EVIDENCIA_RECUERDO,
} from "@/lib/premio-recuerdos";
import { extensionImagen } from "@/lib/archivos";
import { ImagenInvalidaError, normalizarImagen } from "@/lib/imagenes-servidor";
import { ejecutarTransaccionRobusta } from "@/lib/transaccion";

class LimiteRecuerdosError extends Error {}

export async function GET(request: Request) {
  const participante = await participanteActual();
  if (!participante) return Response.json({ error: "Sin sesión" }, { status: 401 });
  const url = new URL(request.url);
  const pagina = Math.max(1, Number(url.searchParams.get("pagina") ?? 1));
  const propios = url.searchParams.get("mios") === "1";
  const populares = url.searchParams.get("orden") === "populares";
  const [recuerdosBase, configuracion, usados] = await Promise.all([
    db.recuerdo.findMany({
      where: {
        visible: true,
        pendiente: false,
        reportado: false,
        ...(propios ? { participanteId: participante.id } : {}),
      },
      orderBy: populares
        ? [{ reacciones: { _count: "desc" } }, { creadoEn: "desc" }]
        : { creadoEn: "desc" },
      skip: (pagina - 1) * 18,
      take: 18,
      include: {
        participante: { include: { empresa: true } },
        reacciones: { select: { participanteId: true, tipo: true } },
      },
    }),
    db.configuracionEvento.findUniqueOrThrow({ where: { id: "evento" }, select: { maxRecuerdosPorParticipante: true } }),
    db.recuerdo.count({
      where: {
        participanteId: participante.id,
        OR: [
          { claveIdempotencia: null },
          { claveIdempotencia: { not: { startsWith: PREFIJO_EVIDENCIA_RECUERDO } } },
        ],
      },
    }),
  ]);
  const recuerdos = recuerdosBase.map((recuerdo) => presentarRecuerdo(recuerdo, participante.id));
  return Response.json({
    recuerdos,
    siguiente: recuerdos.length === 18 ? pagina + 1 : null,
    cupo: {
      limite: configuracion.maxRecuerdosPorParticipante,
      usados,
      restantes: Math.max(0, configuracion.maxRecuerdosPorParticipante - usados),
    },
  });
}

export async function POST(request: Request) {
  const participante = await participanteActual();
  if (!participante) return Response.json({ error: "Tu sesión venció." }, { status: 401 });
  const formulario = await request.formData();
  const foto = formulario.get("foto");
  const miniatura = formulario.get("miniatura");
  const extensionFoto = foto instanceof File ? extensionImagen(foto.type) : null;
  const extensionMiniatura = miniatura instanceof File ? extensionImagen(miniatura.type) : null;
  const descripcion = String(formulario.get("descripcion") ?? "").trim().slice(0, 140);
  const clave = request.headers.get("Idempotency-Key");
  if (!(foto instanceof File) || !(miniatura instanceof File) || !extensionFoto || !extensionMiniatura) {
    return Response.json({ error: "Faltan los archivos de imagen." }, { status: 400 });
  }
  if (foto.size > 700_000 || miniatura.size > 100_000) {
    return Response.json({ error: "La foto es demasiado pesada. Vuelve a seleccionarla para comprimirla." }, { status: 413 });
  }
  if (clave) {
    const existente = await db.recuerdo.findUnique({ where: { claveIdempotencia: clave } });
    if (existente) return Response.json({ recuerdo: existente, repetido: true });
  }
  let fotoNormalizada;
  let miniaturaNormalizada;
  try {
    [fotoNormalizada, miniaturaNormalizada] = await Promise.all([
      normalizarImagen(new Uint8Array(await foto.arrayBuffer()), { dimensionMaxima: 1600, calidad: 82 }),
      normalizarImagen(new Uint8Array(await miniatura.arrayBuffer()), { dimensionMaxima: 480, calidad: 72 }),
    ]);
  } catch (error) {
    if (error instanceof ImagenInvalidaError) {
      return Response.json({ error: "Uno de los archivos no contiene una imagen válida." }, { status: 400 });
    }
    throw error;
  }
  const cargas = await Promise.allSettled([
    storage.guardar(fotoNormalizada.datos, fotoNormalizada.extension, "recuerdos"),
    storage.guardar(miniaturaNormalizada.datos, miniaturaNormalizada.extension, "miniaturas"),
  ]);
  if (cargas.some((carga) => carga.status === "rejected")) {
    await Promise.allSettled(cargas.flatMap((carga) => carga.status === "fulfilled" ? [storage.eliminar(carga.value)] : []));
    return Response.json({ error: "El almacenamiento está ocupado. Reintenta esta foto." }, { status: 503 });
  }
  const [urlFoto, urlMiniatura] = cargas.map((carga) => (carga as PromiseFulfilledResult<string>).value);
  try {
    const recuerdo = await ejecutarTransaccionRobusta(async (tx) => {
      await bloquearPuntosParticipante(tx, participante.id);
      const configuracion = await tx.configuracionEvento.findUniqueOrThrow({ where: { id: "evento" } });
      const usados = await tx.recuerdo.count({
        where: {
          participanteId: participante.id,
          OR: [
            { claveIdempotencia: null },
            { claveIdempotencia: { not: { startsWith: PREFIJO_EVIDENCIA_RECUERDO } } },
          ],
        },
      });
      if (usados >= configuracion.maxRecuerdosPorParticipante) throw new LimiteRecuerdosError();
      const creado = await tx.recuerdo.create({
        data: {
          participanteId: participante.id,
          urlFoto,
          urlMiniatura,
          descripcion: descripcion || null,
          visible: !configuracion.recuerdosRequierenAprobacion,
          pendiente: configuracion.recuerdosRequierenAprobacion,
          claveIdempotencia: clave,
        },
      });
      if (!participante.esStaff && !configuracion.recuerdosRequierenAprobacion && configuracion.puntosPorRecuerdo > 0) {
        const conPuntos = await tx.ajustePuntos.count({
          where: { participanteId: participante.id, motivo: { startsWith: "Recuerdo #" } },
        });
        if (conPuntos < configuracion.maxRecuerdosConPuntos) {
          const admin = await tx.admin.findFirstOrThrow();
          await tx.ajustePuntos.create({
            data: {
              participanteId: participante.id,
              puntos: configuracion.puntosPorRecuerdo,
              motivo: `Recuerdo #${creado.id}`,
              adminId: admin.id,
            },
          });
          await recalcularPuntosParticipante(tx, participante.id);
        }
      }
      return creado;
    });
    anunciarCambio("recuerdo");
    return Response.json({ recuerdo });
  } catch (error) {
    await Promise.allSettled([storage.eliminar(urlFoto), storage.eliminar(urlMiniatura)]);
    if (error instanceof LimiteRecuerdosError) {
      return Response.json({ error: "Ya alcanzaste el máximo de recuerdos permitidos." }, { status: 409 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" && clave) {
      const existente = await db.recuerdo.findUnique({ where: { claveIdempotencia: clave } });
      return Response.json({ recuerdo: existente, repetido: true });
    }
    return Response.json({ error: "No se pudo guardar esta foto. Reintenta solo esta carga." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const participante = await participanteActual();
  if (!participante) return Response.json({ error: "Sin sesión" }, { status: 401 });
  const { id, accion } = (await request.json()) as { id?: string; accion?: string };
  const recuerdo = await db.recuerdo.findUnique({ where: { id } });
  if (!recuerdo) return Response.json({ error: "Recuerdo no encontrado" }, { status: 404 });
  if (accion === "reportar") {
    await db.$transaction(async (tx) => {
      await tx.recuerdo.update({ where: { id }, data: { reportado: true } });
      await actualizarPremioFotoMasReaccionada(tx);
    });
  } else if (accion === "eliminar" && recuerdo.participanteId === participante.id) {
    await db.$transaction(async (tx) => {
      await tx.recuerdo.delete({ where: { id } });
      await tx.ajustePuntos.deleteMany({
        where: { participanteId: participante.id, motivo: `Recuerdo #${id}` },
      });
      await recalcularPuntosParticipante(tx, participante.id);
      await actualizarPremioFotoMasReaccionada(tx);
    });
    if (!recuerdo.claveIdempotencia?.startsWith(PREFIJO_EVIDENCIA_RECUERDO)) {
      await Promise.all([storage.eliminar(recuerdo.urlFoto), storage.eliminar(recuerdo.urlMiniatura)]);
    }
  } else {
    return Response.json({ error: "Acción no permitida" }, { status: 403 });
  }
  anunciarCambio("recuerdo");
  anunciarCambio("puntos");
  return Response.json({ ok: true });
}
