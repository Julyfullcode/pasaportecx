import { notFound, redirect } from "next/navigation";
import { requerirParticipante } from "@/lib/auth";
import { db } from "@/lib/db";
import { FondoUniverso } from "@/components/universo/FondoUniverso";
import { RetosPlaneta } from "@/components/universo/RetosPlaneta";
import { ACTIVIDAD_UNIVERSO_ARQUETIPOS_ID, esPlanetaId, leerConfiguracionUniverso, RESPUESTA_TEST_UNIVERSO_ID } from "@/lib/universo-arquetipos";

export const dynamic = "force-dynamic";

export default async function PlanetaUniverso({ params }: { params: Promise<{ id: string }> }) {
  const participante = await requerirParticipante("/universo"); const { id } = await params; if (!esPlanetaId(id)) notFound();
  const actividad = await db.actividad.findUnique({ where: { id: ACTIVIDAD_UNIVERSO_ARQUETIPOS_ID }, include: { respuestas: { where: { participanteId: participante.id }, select: { preguntaId: true } } } });
  if (!actividad || actividad.estado !== "PUBLICADA") redirect("/universo");
  if (!actividad.respuestas.some((item) => item.preguntaId === RESPUESTA_TEST_UNIVERSO_ID)) redirect("/universo/test");
  const configuracion = leerConfiguracionUniverso(actividad.configuracion); if (!configuracion) throw new Error("La configuración del universo no es válida.");
  const planeta = configuracion.planetas.find((item) => item.id === id); if (!planeta) notFound();
  const retos = configuracion.retos.filter((reto) => reto.planetaId === id && reto.activo).sort((a, b) => a.orden - b.orden);
  return <FondoUniverso><RetosPlaneta planeta={planeta} retos={retos} completadosIniciales={actividad.respuestas.map((item) => item.preguntaId)} /></FondoUniverso>;
}
