import { redirect } from "next/navigation";
import { requerirParticipante } from "@/lib/auth";
import { db } from "@/lib/db";
import { FondoUniverso } from "@/components/universo/FondoUniverso";
import { MapaEstelar } from "@/components/universo/MapaEstelar";
import { asegurarActividadUniversoArquetipos, leerConfiguracionUniverso, leerResultadoTestUniverso, PLANETAS_ARQUETIPO, RESPUESTA_TEST_UNIVERSO_ID, type PlanetaId } from "@/lib/universo-arquetipos";

export const dynamic = "force-dynamic";

export default async function Universo() {
  const participante = await requerirParticipante("/universo");
  const actividad = await asegurarActividadUniversoArquetipos();
  if (actividad.estado !== "PUBLICADA") return <FondoUniverso><div className="grid min-h-dvh place-items-center p-6 text-center"><div><h1 className="font-display text-4xl font-extrabold">El universo aún no está abierto</h1><p className="mt-3 text-white/60">Espera la señal del equipo organizador.</p></div></div></FondoUniverso>;
  const configuracion = leerConfiguracionUniverso(actividad.configuracion);
  if (!configuracion) throw new Error("La configuración del universo no es válida.");
  const respuestas = await db.respuestaActividad.findMany({ where: { actividadId: actividad.id, participanteId: participante.id }, select: { preguntaId: true, respuesta: true } });
  const resultado = leerResultadoTestUniverso(respuestas.find((item) => item.preguntaId === RESPUESTA_TEST_UNIVERSO_ID)?.respuesta);
  if (!resultado) redirect("/universo/test");
  const ids = new Set(respuestas.map((item) => item.preguntaId));
  const progreso = Object.fromEntries(PLANETAS_ARQUETIPO.map((planeta) => { const retos = configuracion.retos.filter((reto) => reto.planetaId === planeta.id && reto.activo); return [planeta.id, { completados: retos.filter((reto) => ids.has(reto.id)).length, total: retos.length }]; })) as Record<PlanetaId, { completados: number; total: number }>;
  return <FondoUniverso><MapaEstelar planetas={configuracion.planetas} progreso={progreso} arquetipo={resultado.planetaId} /></FondoUniverso>;
}
