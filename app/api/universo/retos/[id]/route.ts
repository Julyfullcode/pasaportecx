import type { Prisma } from "@prisma/client";
import { participanteActual } from "@/lib/auth";
import { bloquearPuntosParticipante, recalcularPuntosParticipante } from "@/lib/puntos";
import { ejecutarTransaccionRobusta } from "@/lib/transaccion";
import { ACTIVIDAD_UNIVERSO_ARQUETIPOS_ID, leerConfiguracionUniverso, RESPUESTA_TEST_UNIVERSO_ID, TIPO_UNIVERSO_ARQUETIPOS } from "@/lib/universo-arquetipos";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const participante = await participanteActual();
  if (!participante) return Response.json({ error: "Debes iniciar sesión." }, { status: 401 });
  const { id } = await params;
  let texto = "";
  try { texto = String((await request.json()).texto ?? "").trim(); } catch { return Response.json({ error: "La respuesta no tiene un formato válido." }, { status: 400 }); }
  if (texto.length < 12 || texto.length > 800) return Response.json({ error: "Escribe una respuesta de 12 a 800 caracteres." }, { status: 400 });
  try {
    const resultado = await ejecutarTransaccionRobusta(async (tx) => {
      await bloquearPuntosParticipante(tx, participante.id);
      const actividad = await tx.actividad.findUniqueOrThrow({ where: { id: ACTIVIDAD_UNIVERSO_ARQUETIPOS_ID } });
      if (actividad.tipo !== TIPO_UNIVERSO_ARQUETIPOS || actividad.estado !== "PUBLICADA") throw new Error("NO_DISPONIBLE");
      const configuracion = leerConfiguracionUniverso(actividad.configuracion);
      const reto = configuracion?.retos.find((item) => item.id === id && item.activo);
      if (!reto) throw new Error("RETO_INVALIDO");
      const tieneTest = await tx.respuestaActividad.findUnique({ where: { actividadId_participanteId_preguntaId: { actividadId: actividad.id, participanteId: participante.id, preguntaId: RESPUESTA_TEST_UNIVERSO_ID } }, select: { id: true } });
      if (!tieneTest) throw new Error("SIN_TEST");
      const existente = await tx.respuestaActividad.findUnique({ where: { actividadId_participanteId_preguntaId: { actividadId: actividad.id, participanteId: participante.id, preguntaId: reto.id } }, select: { id: true } });
      await tx.respuestaActividad.upsert({
        where: { actividadId_participanteId_preguntaId: { actividadId: actividad.id, participanteId: participante.id, preguntaId: reto.id } },
        update: {},
        create: { actividadId: actividad.id, participanteId: participante.id, preguntaId: reto.id, empresaEvaluadaId: participante.empresaId, respuesta: { texto, planetaId: reto.planetaId, retoTitulo: reto.titulo } as Prisma.InputJsonValue },
      });
      const respondidas = await tx.respuestaActividad.findMany({ where: { actividadId: actividad.id, participanteId: participante.id, preguntaId: { not: RESPUESTA_TEST_UNIVERSO_ID } }, select: { preguntaId: true } });
      const ids = new Set(respondidas.map((item) => item.preguntaId));
      const puntosOtorgados = participante.esStaff ? 0 : configuracion!.retos.filter((item) => item.activo && ids.has(item.id)).reduce((total, item) => total + item.puntos, 0);
      await tx.participacionActividad.upsert({ where: { actividadId_participanteId: { actividadId: actividad.id, participanteId: participante.id } }, update: { puntosOtorgados }, create: { actividadId: actividad.id, participanteId: participante.id, puntosOtorgados } });
      const puntosTotales = await recalcularPuntosParticipante(tx, participante.id);
      return { completado: true, puntosOtorgados: participante.esStaff || existente ? 0 : reto.puntos, puntosActividad: puntosOtorgados, puntosTotales };
    });
    return Response.json(resultado, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "NO_DISPONIBLE") return Response.json({ error: "Esta actividad aún no está disponible." }, { status: 409 });
    if (error instanceof Error && error.message === "RETO_INVALIDO") return Response.json({ error: "Este reto ya no está disponible." }, { status: 404 });
    if (error instanceof Error && error.message === "SIN_TEST") return Response.json({ error: "Primero descubre qué planeta eres." }, { status: 409 });
    console.error("[universo/reto]", error);
    return Response.json({ error: "No pudimos guardar tu aporte." }, { status: 500 });
  }
}
