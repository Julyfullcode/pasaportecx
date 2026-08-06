import type { Prisma } from "@prisma/client";
import { participanteActual } from "@/lib/auth";
import { db } from "@/lib/db";
import { preguntasDe, respuestaActividadValida, type PreguntaActividad } from "@/lib/actividad";
import { recalcularPuntosParticipante } from "@/lib/puntos";

export const dynamic = "force-dynamic";

function sinRespuestasCorrectas(pregunta: PreguntaActividad) {
  return {
    id: pregunta.id,
    titulo: pregunta.titulo,
    contexto: pregunta.contexto,
    tipo: pregunta.tipo,
    opciones: pregunta.opciones,
    afirmaciones: pregunta.afirmaciones?.map(({ id, texto }) => ({ id, texto })),
  };
}

export async function GET(_request: Request, contexto: { params: Promise<{ id: string }> }) {
  const participante = await participanteActual();
  if (!participante) return Response.json({ error: "Debes iniciar sesión." }, { status: 401 });
  const { id } = await contexto.params;
  const actividad = await db.actividad.findUnique({
    where: { id },
    include: { respuestas: { where: { participanteId: participante.id }, select: { preguntaId: true, respuesta: true } } },
  });
  if (!actividad || actividad.estado === "BORRADOR") return Response.json({ error: "Esta actividad aún no está disponible." }, { status: 404 });
  const preguntas = preguntasDe(actividad.configuracion);
  const pregunta = actividad.pasoActual > 0 && actividad.pasoActual <= preguntas.length
    ? preguntas[actividad.pasoActual - 1]
    : null;
  const respuesta = pregunta ? actividad.respuestas.find((item) => item.preguntaId === pregunta.id) : null;
  const etapa = actividad.estado === "CERRADA" || actividad.pasoActual > preguntas.length
    ? "CIERRE"
    : actividad.pasoActual === 0 ? "INVITACION" : "PREGUNTA";
  return Response.json({
    actividad: {
      id: actividad.id,
      titulo: actividad.titulo,
      invitacion: actividad.invitacion,
      cierre: actividad.cierre,
      estado: actividad.estado,
      etapa,
      pasoActual: actividad.pasoActual,
      totalPreguntas: preguntas.length,
      puntosHabilitados: actividad.puntosHabilitados,
      puntos: participante.esStaff ? 0 : actividad.puntos,
    },
    pregunta: pregunta ? sinRespuestasCorrectas(pregunta) : null,
    respondida: Boolean(respuesta),
    respuesta: respuesta?.respuesta ?? null,
    insight: respuesta ? pregunta?.insight ?? null : null,
  }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(request: Request, contexto: { params: Promise<{ id: string }> }) {
  const participante = await participanteActual();
  if (!participante) return Response.json({ error: "Debes iniciar sesión." }, { status: 401 });
  const { id } = await contexto.params;
  let cuerpo: { preguntaId?: string; respuesta?: unknown };
  try {
    cuerpo = await request.json();
  } catch {
    return Response.json({ error: "La respuesta no tiene un formato válido." }, { status: 400 });
  }
  try {
    const resultado = await db.$transaction(async (tx) => {
      const actividad = await tx.actividad.findUniqueOrThrow({ where: { id } });
      const preguntas = preguntasDe(actividad.configuracion);
      const pregunta = preguntas[actividad.pasoActual - 1];
      if (actividad.estado !== "PUBLICADA" || !pregunta || pregunta.id !== cuerpo.preguntaId) throw new Error("ETAPA_CAMBIO");
      if (!respuestaActividadValida(pregunta, cuerpo.respuesta)) throw new Error("RESPUESTA_INVALIDA");
      await tx.respuestaActividad.upsert({
        where: { actividadId_participanteId_preguntaId: { actividadId: id, participanteId: participante.id, preguntaId: pregunta.id } },
        update: {},
        create: { actividadId: id, participanteId: participante.id, preguntaId: pregunta.id, respuesta: cuerpo.respuesta as Prisma.InputJsonValue },
      });
      const respondidas = await tx.respuestaActividad.count({ where: { actividadId: id, participanteId: participante.id } });
      let puntosOtorgados = 0;
      if (respondidas >= preguntas.length) {
        puntosOtorgados = actividad.puntosHabilitados && !participante.esStaff ? actividad.puntos : 0;
        await tx.participacionActividad.upsert({
          where: { actividadId_participanteId: { actividadId: id, participanteId: participante.id } },
          update: {},
          create: { actividadId: id, participanteId: participante.id, puntosOtorgados },
        });
        await recalcularPuntosParticipante(tx, participante.id);
      }
      return { insight: pregunta.insight, completada: respondidas >= preguntas.length, puntosOtorgados };
    });
    return Response.json(resultado, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    if (error instanceof Error && error.message === "ETAPA_CAMBIO") return Response.json({ error: "El moderador avanzó de etapa. Actualizaremos la pantalla." }, { status: 409 });
    if (error instanceof Error && error.message === "RESPUESTA_INVALIDA") return Response.json({ error: "Completa la respuesta antes de continuar." }, { status: 400 });
    console.error("[actividades/responder]", error);
    return Response.json({ error: "No pudimos guardar tu respuesta. Intenta nuevamente." }, { status: 500 });
  }
}
