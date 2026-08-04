import { Prisma, type EstadoCompletitud } from "@prisma/client";
import { db } from "@/lib/db";
import { participanteActual } from "@/lib/auth";
import { anunciarCambio } from "@/lib/eventos";
import { storage } from "@/lib/storage";
import { puntuarOpcionMultiple, validarRespuestaAbierta, type Opcion } from "@/lib/validacion";
import { recalcularPuntosParticipante } from "@/lib/puntos";
import { extensionImagen } from "@/lib/archivos";
import { esRespuestasCosecha, FORMATO_COSECHA, PREGUNTAS_COSECHA } from "@/lib/cosecha-config";

type Configuracion = {
  opciones?: Opcion[];
  puntajeParcial?: boolean;
  respuestasAceptadas?: string[];
  formato?: "texto" | "escala" | "cosecha";
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ codigo: string }> },
) {
  const participante = await participanteActual();
  if (!participante) return Response.json({ error: "Tu sesión venció. Recupera tu acceso." }, { status: 401 });
  const { codigo } = await params;
  const desafio = await db.desafio.findUnique({
    where: { codigoQr: codigo },
    include: {
      _count: { select: { completitudes: true } },
      completitudes: { where: { participanteId: participante.id }, take: 1 },
    },
  });
  if (!desafio) return Response.json({ error: "Este código no corresponde a un desafío." }, { status: 404 });
  const configuracion = desafio.configuracion as Configuracion;
  const esCosecha = desafio.tipo === "ENCUESTA" && configuracion.formato === FORMATO_COSECHA;
  const existente = desafio.completitudes[0];
  const cosechaIncompleta = Boolean(existente && esCosecha && !esRespuestasCosecha(existente.respuesta));
  const ahora = new Date();
  if (desafio.estado !== "PUBLICADO") return Response.json({ error: "El desafío no está disponible." }, { status: 409 });
  if (desafio.disponibleDesde && desafio.disponibleDesde > ahora) return Response.json({ error: "Este desafío aún no comienza." }, { status: 409 });
  if (desafio.disponibleHasta && desafio.disponibleHasta < ahora) return Response.json({ error: "Este desafío ya finalizó." }, { status: 409 });
  if (existente && !cosechaIncompleta) {
    return Response.json({
      yaCompletado: true,
      estado: existente.estado,
      puntosGanados: existente.puntosOtorgados,
      nuevoTotal: participante.puntosTotales,
    });
  }
  if (!existente && desafio.limiteCompletitudes && desafio._count.completitudes >= desafio.limiteCompletitudes) {
    return Response.json({ error: "Se alcanzó el límite de completitudes." }, { status: 409 });
  }

  // Un check-in no lleva campos. Evitar parsear multipart vacío también hace el
  // flujo más resistente a navegadores que omiten el boundary cuando no hay partes.
  const formulario = desafio.tipo === "CHECK_IN" ? new FormData() : await request.formData();
  let puntos = desafio.puntos;
  let estado: EstadoCompletitud = "APROBADO";
  let urlEvidencia: string | undefined;
  let respuesta: Prisma.InputJsonValue = {};

  if (desafio.tipo === "OPCION_MULTIPLE") {
    const seleccionadas = formulario.getAll("opcion").map(String);
    puntos = puntuarOpcionMultiple(
      seleccionadas,
      configuracion.opciones ?? [],
      desafio.puntos,
      Boolean(configuracion.puntajeParcial),
    );
    respuesta = { seleccionadas };
  } else if (desafio.tipo === "RESPUESTA_ABIERTA") {
    const texto = String(formulario.get("respuesta") ?? "");
    puntos = validarRespuestaAbierta(texto, configuracion.respuestasAceptadas ?? [])
      ? desafio.puntos
      : 0;
    respuesta = { texto };
  } else if (desafio.tipo === "EVIDENCIA_FOTO") {
    const foto = formulario.get("evidencia");
    const extension = foto instanceof File ? extensionImagen(foto.type) : null;
    if (!(foto instanceof File) || !extension) {
      return Response.json({ error: "Adjunta una foto como evidencia." }, { status: 400 });
    }
    if (foto.size > 800_000) {
      return Response.json({ error: "La evidencia es demasiado pesada. Vuelve a seleccionarla para comprimirla." }, { status: 413 });
    }
    try {
      urlEvidencia = await storage.guardar(
        new Uint8Array(await foto.arrayBuffer()),
        extension,
        "evidencias",
      );
    } catch {
      return Response.json({ error: "El almacenamiento está ocupado. Reintenta la evidencia." }, { status: 503 });
    }
    puntos = 0;
    estado = "PENDIENTE";
  } else if (desafio.tipo === "ENCUESTA") {
    if (configuracion.formato === FORMATO_COSECHA) {
      const respuestas = Object.fromEntries(
        PREGUNTAS_COSECHA.map(({ id }) => [id, String(formulario.get(id) ?? "").trim()]),
      );
      if (PREGUNTAS_COSECHA.some(({ id }) => respuestas[id].length < 2)) {
        return Response.json({ error: "Completa las tres reflexiones para crear tu tarjeta." }, { status: 400 });
      }
      if (PREGUNTAS_COSECHA.some(({ id }) => respuestas[id].length > 600)) {
        return Response.json({ error: "Cada reflexión puede tener máximo 600 caracteres." }, { status: 400 });
      }
      respuesta = respuestas;
    } else {
      const valor = String(formulario.get("respuesta") ?? "");
      if (!valor.trim()) return Response.json({ error: "Responde la pregunta para continuar." }, { status: 400 });
      respuesta = { valor };
    }
  }

  try {
    const resultado = await db.$transaction(async (tx) => {
      const completitud = existente && esCosecha && !esRespuestasCosecha(existente.respuesta)
        ? await tx.completitud.update({
          where: { id: existente.id },
          data: { puntosOtorgados: puntos, respuesta, estado },
        })
        : await tx.completitud.create({
          data: {
            participanteId: participante.id,
            desafioId: desafio.id,
            puntosOtorgados: puntos,
            respuesta,
            urlEvidencia,
            estado,
          },
        });
      const nuevoTotal = await recalcularPuntosParticipante(tx, participante.id);
      return { completitud, nuevoTotal };
    });
    anunciarCambio("puntos");
    return Response.json({
      estado: resultado.completitud.estado,
      puntosGanados: puntos,
      nuevoTotal: resultado.nuevoTotal,
    });
  } catch (error) {
    if (urlEvidencia) await storage.eliminar(urlEvidencia).catch(() => undefined);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existente = await db.completitud.findUniqueOrThrow({
        where: { participanteId_desafioId: { participanteId: participante.id, desafioId: desafio.id } },
      });
      return Response.json({
        yaCompletado: true,
        estado: existente.estado,
        puntosGanados: existente.puntosOtorgados,
        nuevoTotal: participante.puntosTotales,
      });
    }
    console.error(error);
    return Response.json({ error: "La respuesta no pudo guardarse. Puedes reintentar sin perderla." }, { status: 500 });
  }
}
