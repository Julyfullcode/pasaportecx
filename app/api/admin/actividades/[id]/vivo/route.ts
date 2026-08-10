import { requerirAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { descripcionRespuestaCorrecta, preguntasDe } from "@/lib/actividad";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requerirAdmin();
  const { id } = await params;
  const actividad = await db.actividad.findUnique({ where: { id } });
  if (!actividad) return Response.json({ error: "Actividad no encontrada." }, { status: 404 });
  const preguntas = preguntasDe(actividad.configuracion);
  if (actividad.tipo === "EVALUACION_WHATSAPP") {
    const total = await db.participacionActividad.count({ where: { actividadId: id } });
    return Response.json({ pregunta: actividad.titulo, contexto: actividad.invitacion, respuestaCorrecta: null, total, tipo: "ABIERTA", datos: [] }, { headers: { "Cache-Control": "no-store" } });
  }
  const pregunta = preguntas[actividad.pasoActual - 1];
  if (!pregunta) return Response.json({ pregunta: null, contexto: null, respuestaCorrecta: null, total: 0, tipo: "SIN_PREGUNTA", datos: [] }, { headers: { "Cache-Control": "no-store" } });
  const respuestas = await db.respuestaActividad.findMany({ where: { actividadId: id, preguntaId: pregunta.id }, select: { respuesta: true } });
  const informacion = { pregunta: pregunta.titulo, contexto: pregunta.contexto, respuestaCorrecta: descripcionRespuestaCorrecta(pregunta) || null, total: respuestas.length };
  if (pregunta.tipo === "OPCION_UNICA") {
    const datos = (pregunta.opciones ?? []).map((opcion) => ({ id: opcion.id, etiqueta: opcion.texto, cantidad: respuestas.filter((item) => item.respuesta === opcion.id || (Array.isArray(item.respuesta) && item.respuesta.includes(opcion.id))).length }));
    return Response.json({ ...informacion, tipo: "OPCIONES", datos }, { headers: { "Cache-Control": "no-store" } });
  }
  if (pregunta.tipo === "VERDADERO_FALSO") {
    const datos = (pregunta.afirmaciones ?? []).map((afirmacion) => {
      const valores = respuestas.map((item) => item.respuesta).filter((valor) => Boolean(valor) && typeof valor === "object" && !Array.isArray(valor)).map((valor) => valor as Record<string, unknown>);
      return { id: afirmacion.id, etiqueta: afirmacion.texto, verdaderas: valores.filter((valor) => valor[afirmacion.id] === true).length, falsas: valores.filter((valor) => valor[afirmacion.id] === false).length };
    });
    return Response.json({ ...informacion, tipo: "VERDADERO_FALSO", datos }, { headers: { "Cache-Control": "no-store" } });
  }
  return Response.json({ ...informacion, tipo: "ABIERTA", datos: [] }, { headers: { "Cache-Control": "no-store" } });
}
