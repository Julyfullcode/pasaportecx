import { redirect } from "next/navigation";
import { requerirParticipante } from "@/lib/auth";
import { db } from "@/lib/db";
import { FondoUniverso } from "@/components/universo/FondoUniverso";
import { TarjetaArquetipo } from "@/components/universo/TarjetaArquetipo";
import { ACTIVIDAD_UNIVERSO_ARQUETIPOS_ID, leerResultadoTestUniverso, PLANETAS_ARQUETIPO, RESPUESTA_TEST_UNIVERSO_ID, rutaSugerida } from "@/lib/universo-arquetipos";

export const dynamic = "force-dynamic";

export default async function TarjetaUniverso({ searchParams }: { searchParams: Promise<{ revelar?: string }> }) {
  const participante = await requerirParticipante("/universo/tarjeta");
  const respuesta = await db.respuestaActividad.findUnique({ where: { actividadId_participanteId_preguntaId: { actividadId: ACTIVIDAD_UNIVERSO_ARQUETIPOS_ID, participanteId: participante.id, preguntaId: RESPUESTA_TEST_UNIVERSO_ID } }, select: { respuesta: true } });
  const resultado = leerResultadoTestUniverso(respuesta?.respuesta);
  if (!resultado) redirect("/universo/test");
  const planeta = PLANETAS_ARQUETIPO.find((item) => item.id === resultado.planetaId)!;
  const { revelar } = await searchParams;
  return <FondoUniverso><TarjetaArquetipo planeta={planeta} ruta={rutaSugerida(planeta.id)} revelar={revelar === "1"} /></FondoUniverso>;
}
