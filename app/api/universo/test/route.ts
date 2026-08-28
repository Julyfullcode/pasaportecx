import type { Prisma } from "@prisma/client";
import { participanteActual } from "@/lib/auth";
import { db } from "@/lib/db";
import { ACTIVIDAD_UNIVERSO_ARQUETIPOS_ID, calcularArquetipo, RESPUESTA_TEST_UNIVERSO_ID, TIPO_UNIVERSO_ARQUETIPOS } from "@/lib/universo-arquetipos";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const participante = await participanteActual();
  if (!participante) return Response.json({ error: "Debes iniciar sesión." }, { status: 401 });
  let cuerpo: { respuestas?: unknown };
  try { cuerpo = await request.json(); } catch { return Response.json({ error: "La respuesta no tiene un formato válido." }, { status: 400 }); }
  if (!cuerpo.respuestas || typeof cuerpo.respuestas !== "object" || Array.isArray(cuerpo.respuestas)) return Response.json({ error: "Completa las cinco preguntas." }, { status: 400 });
  const respuestas = cuerpo.respuestas as Record<string, string>;
  const resultado = calcularArquetipo(respuestas);
  if (!resultado) return Response.json({ error: "Completa las cinco preguntas." }, { status: 400 });
  const actividad = await db.actividad.findUnique({ where: { id: ACTIVIDAD_UNIVERSO_ARQUETIPOS_ID }, select: { id: true, tipo: true, estado: true } });
  if (!actividad || actividad.tipo !== TIPO_UNIVERSO_ARQUETIPOS || actividad.estado !== "PUBLICADA") return Response.json({ error: "Esta actividad aún no está disponible." }, { status: 409 });
  const guardado = { ...resultado, respuestas };
  await db.respuestaActividad.upsert({
    where: { actividadId_participanteId_preguntaId: { actividadId: actividad.id, participanteId: participante.id, preguntaId: RESPUESTA_TEST_UNIVERSO_ID } },
    update: {},
    create: { actividadId: actividad.id, participanteId: participante.id, preguntaId: RESPUESTA_TEST_UNIVERSO_ID, empresaEvaluadaId: participante.empresaId, respuesta: guardado as unknown as Prisma.InputJsonValue },
  });
  return Response.json({ planetaId: resultado.planetaId }, { headers: { "Cache-Control": "no-store" } });
}
