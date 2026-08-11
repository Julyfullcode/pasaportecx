import { Prisma, type EstadoCompletitud } from "@prisma/client";
import { db } from "@/lib/db";
import { participanteActual } from "@/lib/auth";
import { anunciarCambio } from "@/lib/eventos";
import { storage } from "@/lib/storage";
import { puntuarOpcionMultiple, validarRespuestaAbierta, type Opcion } from "@/lib/validacion";
import { bloquearPuntosParticipante, recalcularPuntosParticipante } from "@/lib/puntos";
import { ImagenInvalidaError, normalizarImagen } from "@/lib/imagenes-servidor";
import { esDesafioCosecha, esRespuestasCosecha, PREGUNTAS_COSECHA } from "@/lib/cosecha-config";
import {
  configuracionPuntualidadDesdeValor,
  esTituloDesafioPuntualidad,
  evaluarPuntualidad,
  mensajePuntualidad,
  resultadoPuntualidadDesdeRespuesta,
  type ResultadoPuntualidad,
} from "@/lib/puntualidad";
import { estadoTemporalDesafio } from "@/lib/duracion-desafio";
import {
  EncuestaMixtaInvalidaError,
  esConfiguracionEncuestaMixta,
  respuestasEncuestaMixtaDesdeFormulario,
} from "@/lib/encuesta-mixta";
import { esConfiguracionMatricula } from "@/lib/matricula";
import { validarTokenQrPuntualidad } from "@/lib/puntualidad-qr";
import { ejecutarTransaccionRobusta } from "@/lib/transaccion";

type Configuracion = {
  opciones?: Opcion[];
  puntajeParcial?: boolean;
  respuestasAceptadas?: string[];
  formato?: "texto" | "escala" | "cosecha" | "mixta" | "matricula";
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
  const esCosecha = esDesafioCosecha(desafio.codigoQr, configuracion);
  const puntualidad = configuracionPuntualidadDesdeValor(configuracion);
  const esPuntualidad = Boolean(puntualidad) || esTituloDesafioPuntualidad(desafio.titulo);
  const esMatricula = esConfiguracionMatricula(configuracion);
  const existente = desafio.completitudes[0];
  const cosechaIncompleta = Boolean(existente && esCosecha && !esRespuestasCosecha(existente.respuesta));
  const ahora = new Date();
  if (desafio.estado !== "PUBLICADO") return Response.json({ error: "El desafío no está disponible." }, { status: 409 });
  const estadoTemporal = estadoTemporalDesafio(desafio, ahora);
  if (!esPuntualidad && estadoTemporal === "PROGRAMADO") return Response.json({ error: "Este desafío aún no comienza." }, { status: 409 });
  if (!esPuntualidad && estadoTemporal === "FINALIZADO") return Response.json({ error: "El tiempo de este desafío ya finalizó." }, { status: 409 });
  if (existente && !cosechaIncompleta && !esMatricula) {
    const puntualidad = resultadoPuntualidadDesdeRespuesta(existente.respuesta);
    return Response.json({
      yaCompletado: true,
      completitudId: existente.id,
      estado: existente.estado,
      puntosGanados: participante.esStaff ? 0 : existente.puntosOtorgados,
      nuevoTotal: participante.puntosTotales,
      puntualidad,
      mensaje: participante.esStaff
        ? "Tu participación quedó registrada. Como integrante Staff, no participas en el esquema de puntos."
        : puntualidad ? mensajePuntualidad(puntualidad, desafio.puntos) : undefined,
    });
  }
  const evaluacionPuntualidad = puntualidad ? evaluarPuntualidad(puntualidad, ahora) : null;
  if (evaluacionPuntualidad && evaluacionPuntualidad.estadoVentana !== "DENTRO") {
    const mensaje = mensajePuntualidad(evaluacionPuntualidad, desafio.puntos);
    return Response.json({
      error: mensaje,
      noRegistrado: true,
      estado: "FUERA_VENTANA",
      puntosGanados: 0,
      nuevoTotal: participante.puntosTotales,
      puntualidad: evaluacionPuntualidad,
      mensaje,
    }, { status: 409 });
  }
  const formulario = desafio.tipo === "CHECK_IN" && !esCosecha && !esPuntualidad
    ? new FormData()
    : await request.formData();
  if (esPuntualidad) {
    const tokenLlegada = String(formulario.get("tokenLlegada") ?? "");
    if (!validarTokenQrPuntualidad(desafio.codigoQr, tokenLlegada, ahora)) {
      return Response.json({
        error: "El código QR venció. Abre nuevamente la cámara y escanea el código que está en la pantalla del evento.",
        noRegistrado: true,
      }, { status: 409 });
    }
  }

  // Un check-in no lleva campos. Evitar parsear multipart vacío también hace el
  // flujo más resistente a navegadores que omiten el boundary cuando no hay partes.
  let puntos = desafio.puntos;
  let estado: EstadoCompletitud = "APROBADO";
  let urlEvidencia: string | undefined;
  let respuesta: Prisma.InputJsonValue = {};
  const resultadoPuntualidad: ResultadoPuntualidad | null = evaluacionPuntualidad;

  if (esPuntualidad && resultadoPuntualidad) {
    puntos = desafio.puntos;
    respuesta = { ...resultadoPuntualidad, evaluadoEn: ahora.toISOString() };
  } else if (esCosecha) {
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
  } else if (desafio.tipo === "OPCION_MULTIPLE") {
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
    if (!(foto instanceof File) || !foto.size) {
      return Response.json({ error: "Adjunta una foto como evidencia." }, { status: 400 });
    }
    try {
      const imagen = await normalizarImagen(new Uint8Array(await foto.arrayBuffer()), {
        dimensionMaxima: 1600,
        calidad: 82,
      });
      urlEvidencia = await storage.guardar(
        imagen.datos,
        imagen.extension,
        "evidencias",
      );
    } catch (error) {
      if (error instanceof ImagenInvalidaError) {
        return Response.json({ error: "El archivo adjunto no contiene una imagen válida." }, { status: 400 });
      }
      return Response.json({ error: "El almacenamiento está ocupado. Reintenta la evidencia." }, { status: 503 });
    }
    puntos = 0;
    estado = "PENDIENTE";
    respuesta = { comentario: String(formulario.get("comentario") ?? "").trim().slice(0, 140) };
  } else if (desafio.tipo === "ENCUESTA") {
    if (esMatricula) {
      const opcionId = String(formulario.get("matricula") ?? "");
      if (!configuracion.opciones.some((opcion) => opcion.id === opcionId)) {
        return Response.json({ error: "Selecciona una de las dos alternativas." }, { status: 400 });
      }
      respuesta = { opcionId };
    } else if (esConfiguracionEncuestaMixta(configuracion)) {
      try {
        respuesta = {
          formato: configuracion.formato,
          respuestas: respuestasEncuestaMixtaDesdeFormulario(configuracion, formulario),
        };
      } catch (error) {
        if (error instanceof EncuestaMixtaInvalidaError) {
          return Response.json({ error: error.message }, { status: 400 });
        }
        throw error;
      }
    } else {
      const valor = String(formulario.get("respuesta") ?? "");
      if (!valor.trim()) return Response.json({ error: "Responde la pregunta para continuar." }, { status: 400 });
      respuesta = { valor };
    }
  }
  const puntosOtorgados = participante.esStaff ? 0 : puntos;

  try {
    const resultado = await ejecutarTransaccionRobusta(async (tx) => {
      await bloquearPuntosParticipante(tx, participante.id);
      if (!existente && desafio.limiteCompletitudes) {
        const completadas = await tx.completitud.count({ where: { desafioId: desafio.id } });
        if (completadas >= desafio.limiteCompletitudes) throw new Error("LIMITE_COMPLETITUDES");
      }
      const completitud = existente && (esMatricula || (esCosecha && !esRespuestasCosecha(existente.respuesta)))
        ? await tx.completitud.update({
          where: { id: existente.id },
          data: { puntosOtorgados: esMatricula ? existente.puntosOtorgados : puntosOtorgados, respuesta, estado },
        })
        : await tx.completitud.create({
          data: {
            participanteId: participante.id,
            desafioId: desafio.id,
            puntosOtorgados,
            respuesta,
            urlEvidencia,
            estado,
          },
        });
      const nuevoTotal = await recalcularPuntosParticipante(tx, participante.id);
      return { completitud, nuevoTotal };
    }, { serializable: Boolean(!existente && desafio.limiteCompletitudes) });
    anunciarCambio("puntos");
    return Response.json({
      completitudId: resultado.completitud.id,
      estado: resultado.completitud.estado,
      puntosGanados: existente && esMatricula ? 0 : puntosOtorgados,
      yaCompletado: Boolean(existente && esMatricula),
      nuevoTotal: resultado.nuevoTotal,
      puntualidad: resultadoPuntualidad,
      mensaje: participante.esStaff
        ? "Tu participación quedó registrada. Como integrante Staff, no participas en el esquema de puntos."
        : resultadoPuntualidad ? mensajePuntualidad(resultadoPuntualidad, desafio.puntos) : undefined,
    });
  } catch (error) {
    if (urlEvidencia) await storage.eliminar(urlEvidencia).catch(() => undefined);
    if (error instanceof Error && error.message === "LIMITE_COMPLETITUDES") {
      return Response.json({ error: "Se alcanzó el límite de completitudes." }, { status: 409 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const [existente, participanteActualizado] = await Promise.all([
        db.completitud.findUniqueOrThrow({
          where: { participanteId_desafioId: { participanteId: participante.id, desafioId: desafio.id } },
        }),
        db.participante.findUniqueOrThrow({ where: { id: participante.id }, select: { puntosTotales: true } }),
      ]);
      const puntualidad = resultadoPuntualidadDesdeRespuesta(existente.respuesta);
      return Response.json({
        yaCompletado: true,
        completitudId: existente.id,
        estado: existente.estado,
        puntosGanados: participante.esStaff ? 0 : existente.puntosOtorgados,
        nuevoTotal: participanteActualizado.puntosTotales,
        puntualidad,
        mensaje: participante.esStaff
          ? "Tu participación quedó registrada. Como integrante Staff, no participas en el esquema de puntos."
          : puntualidad ? mensajePuntualidad(puntualidad, desafio.puntos) : undefined,
      });
    }
    console.error(error);
    return Response.json({ error: "La respuesta no pudo guardarse. Puedes reintentar sin perderla." }, { status: 500 });
  }
}
