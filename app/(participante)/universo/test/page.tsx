import { redirect } from "next/navigation";
import { requerirParticipante } from "@/lib/auth";
import { db } from "@/lib/db";
import { FondoUniverso } from "@/components/universo/FondoUniverso";
import { TestPlaneta } from "@/components/universo/TestPlaneta";
import { asegurarActividadUniversoArquetipos, PREGUNTAS_TEST_UNIVERSO, RESPUESTA_TEST_UNIVERSO_ID } from "@/lib/universo-arquetipos";

export const dynamic = "force-dynamic";

export default async function TestUniverso() {
  const participante = await requerirParticipante("/universo/test");
  const actividad = await asegurarActividadUniversoArquetipos();
  if (actividad.estado !== "PUBLICADA") return <FondoUniverso><div className="grid min-h-dvh place-items-center p-6 text-center"><div><h1 className="font-display text-4xl font-extrabold">El universo aún no está abierto</h1><p className="mt-3 text-white/60">Espera la señal del equipo organizador.</p></div></div></FondoUniverso>;
  const resultado = await db.respuestaActividad.findUnique({ where: { actividadId_participanteId_preguntaId: { actividadId: actividad.id, participanteId: participante.id, preguntaId: RESPUESTA_TEST_UNIVERSO_ID } }, select: { id: true } });
  if (resultado) redirect("/universo");
  return <FondoUniverso><TestPlaneta preguntas={PREGUNTAS_TEST_UNIVERSO} /></FondoUniverso>;
}
