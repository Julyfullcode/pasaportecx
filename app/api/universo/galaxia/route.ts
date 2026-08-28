import { db } from "@/lib/db";
import { ACTIVIDAD_UNIVERSO_ARQUETIPOS_ID, leerRespuestaRetoUniverso, PLANETAS_ARQUETIPO, RESPUESTA_TEST_UNIVERSO_ID } from "@/lib/universo-arquetipos";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const desdeTexto = url.searchParams.get("desde");
  const desdeBase = desdeTexto && !Number.isNaN(Date.parse(desdeTexto)) ? new Date(desdeTexto) : null;
  const desde = desdeBase ? new Date(desdeBase.getTime() - 5_000) : null;
  const respuestas = await db.respuestaActividad.findMany({
    where: { actividadId: ACTIVIDAD_UNIVERSO_ARQUETIPOS_ID, preguntaId: { not: RESPUESTA_TEST_UNIVERSO_ID }, ...(desde ? { respondidoEn: { gt: desde } } : {}) },
    orderBy: { respondidoEn: "asc" },
    take: desde ? 500 : 2500,
    include: { participante: { select: { nombre: true, empresa: { select: { id: true, nombre: true } } } } },
  });
  const aportes = respuestas.flatMap((respuesta) => {
    const valor = leerRespuestaRetoUniverso(respuesta.respuesta);
    const planeta = valor ? PLANETAS_ARQUETIPO.find((item) => item.id === valor.planetaId) : null;
    return valor && planeta ? [{ id: respuesta.id, nombre: respuesta.participante.nombre, empresaId: respuesta.participante.empresa.id, empresa: respuesta.participante.empresa.nombre, texto: valor.texto, planetaId: planeta.id, planeta: planeta.nombre, color: planeta.color, fecha: respuesta.respondidoEn.toISOString() }] : [];
  });
  const [totalAportes, personas, empresas] = await Promise.all([
    db.respuestaActividad.count({ where: { actividadId: ACTIVIDAD_UNIVERSO_ARQUETIPOS_ID, preguntaId: { not: RESPUESTA_TEST_UNIVERSO_ID } } }),
    db.respuestaActividad.groupBy({ by: ["participanteId"], where: { actividadId: ACTIVIDAD_UNIVERSO_ARQUETIPOS_ID, preguntaId: { not: RESPUESTA_TEST_UNIVERSO_ID } } }),
    db.respuestaActividad.groupBy({ by: ["empresaEvaluadaId"], where: { actividadId: ACTIVIDAD_UNIVERSO_ARQUETIPOS_ID, preguntaId: { not: RESPUESTA_TEST_UNIVERSO_ID }, empresaEvaluadaId: { not: null } } }),
  ]);
  return Response.json({ aportes, cifras: { aportes: totalAportes, personas: personas.length, empresas: empresas.length }, ahora: new Date().toISOString() }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
