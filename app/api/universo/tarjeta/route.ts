import { participanteActual } from "@/lib/auth";
import { db } from "@/lib/db";
import { ACTIVIDAD_UNIVERSO_ARQUETIPOS_ID, leerResultadoTestUniverso, PLANETAS_ARQUETIPO, RESPUESTA_TEST_UNIVERSO_ID, rutaSugerida } from "@/lib/universo-arquetipos";
import { generarTarjetaArquetipoPdf } from "@/lib/tarjeta-arquetipo-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const participante = await participanteActual();
  if (!participante) return Response.json({ error: "Debes iniciar sesión para ver tu tarjeta." }, { status: 401 });
  const respuesta = await db.respuestaActividad.findUnique({ where: { actividadId_participanteId_preguntaId: { actividadId: ACTIVIDAD_UNIVERSO_ARQUETIPOS_ID, participanteId: participante.id, preguntaId: RESPUESTA_TEST_UNIVERSO_ID } }, select: { respuesta: true } });
  const resultado = leerResultadoTestUniverso(respuesta?.respuesta);
  if (!resultado) return Response.json({ error: "Completa el test para crear tu tarjeta." }, { status: 404 });
  const planeta = PLANETAS_ARQUETIPO.find((item) => item.id === resultado.planetaId)!;
  try {
    const pdf = await generarTarjetaArquetipoPdf({ planeta, ruta: rutaSugerida(planeta.id), nombre: participante.nombre });
    return new Response(Buffer.from(pdf), { headers: { "Cache-Control": "private, no-store", "Content-Disposition": `inline; filename="mi-tarjeta-${planeta.id}.pdf"`, "Content-Type": "application/pdf", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    console.error("No se pudo generar la tarjeta de arquetipo PDF", error);
    return Response.json({ error: "No pudimos generar tu tarjeta. Vuelve a intentarlo." }, { status: 500 });
  }
}
