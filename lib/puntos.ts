import type { Prisma } from "@prisma/client";

export function calcularTotalIndividual(
  completitudes: { puntosOtorgados: number; estado: string }[],
  ajustes: { puntos: number }[],
  puntosRegistro = 0,
): number {
  return (
    puntosRegistro +
    completitudes
      .filter((completitud) => completitud.estado === "APROBADO")
      .reduce((total, completitud) => total + completitud.puntosOtorgados, 0) +
    ajustes.reduce((total, ajuste) => total + ajuste.puntos, 0)
  );
}

type ClienteTransaccion = Prisma.TransactionClient;

export async function recalcularPuntosParticipante(
  tx: ClienteTransaccion,
  participanteId: string,
): Promise<number> {
  const [participante, completitudes, ajustes] = await Promise.all([
    tx.participante.findUniqueOrThrow({
      where: { id: participanteId },
      select: { puntosRegistro: true },
    }),
    tx.completitud.aggregate({
      where: { participanteId, estado: "APROBADO" },
      _sum: { puntosOtorgados: true },
    }),
    tx.ajustePuntos.aggregate({
      where: { participanteId },
      _sum: { puntos: true },
    }),
  ]);
  const total =
    participante.puntosRegistro +
    (completitudes._sum.puntosOtorgados ?? 0) +
    (ajustes._sum.puntos ?? 0);
  await tx.participante.update({
    where: { id: participanteId },
    data: { puntosTotales: total },
  });
  return total;
}
