import { createHash, timingSafeEqual } from "node:crypto";
import { CODIGO_DESAFIO_CIERRE } from "@/lib/cosecha-config";
import { db } from "@/lib/db";
import { recalcularPuntosParticipante } from "@/lib/puntos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN_HASH = "9bc676eff6b9dd2f34ff6dfd9f0829f2783edad2a8ad36fd0c405cc5ab4f79c4";

function estaAutorizado(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const recibido = Buffer.from(createHash("sha256").update(token).digest("hex"), "hex");
  const esperado = Buffer.from(TOKEN_HASH, "hex");
  return recibido.length === esperado.length && timingSafeEqual(recibido, esperado);
}

export async function POST(request: Request) {
  if (!estaAutorizado(request)) return new Response(null, { status: 404 });

  const desafio = await db.desafio.findUnique({
    where: { codigoQr: CODIGO_DESAFIO_CIERRE },
    select: {
      id: true,
      titulo: true,
      completitudes: { select: { participanteId: true } },
    },
  });
  if (!desafio) return Response.json({ error: "Desafío de cierre no encontrado." }, { status: 404 });

  const participantes = [...new Set(desafio.completitudes.map(({ participanteId }) => participanteId))];
  const eliminadas = await db.$transaction(async (tx) => {
    const resultado = await tx.completitud.deleteMany({ where: { desafioId: desafio.id } });
    for (const participanteId of participantes) {
      await recalcularPuntosParticipante(tx, participanteId);
    }
    return resultado.count;
  });
  const restantes = await db.completitud.count({ where: { desafioId: desafio.id } });

  return Response.json({
    desafio: desafio.titulo,
    eliminadas,
    participantesRecalculados: participantes.length,
    restantes,
  });
}
