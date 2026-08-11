import type { Prisma } from "@prisma/client";

export function calcularTotalIndividual(
  completitudes: { puntosOtorgados: number; estado: string }[],
  ajustes: { puntos: number }[],
  puntosRegistro = 0,
  participaEnPuntos = true,
  actividades: { puntosOtorgados: number }[] = [],
): number {
  if (!participaEnPuntos) return 0;
  return (
    puntosRegistro +
    completitudes
      .filter((completitud) => completitud.estado === "APROBADO")
      .reduce((total, completitud) => total + completitud.puntosOtorgados, 0) +
    ajustes.reduce((total, ajuste) => total + ajuste.puntos, 0) +
    actividades.reduce((total, actividad) => total + actividad.puntosOtorgados, 0)
  );
}

type ClienteTransaccion = Prisma.TransactionClient;

export async function recalcularPuntosParticipante(
  tx: ClienteTransaccion,
  participanteId: string,
): Promise<number> {
  const usaPostgres = /^(postgres|postgresql):/i.test(process.env.DATABASE_URL ?? "");
  if (usaPostgres) {
    await tx.$queryRaw`SELECT "id" FROM "Participante" WHERE "id" = ${participanteId} FOR UPDATE`;
  }
  const [participante, completitudes, ajustes, actividades] = await Promise.all([
    tx.participante.findUniqueOrThrow({
      where: { id: participanteId },
      select: { puntosRegistro: true, esStaff: true },
    }),
    tx.completitud.aggregate({
      where: { participanteId, estado: "APROBADO" },
      _sum: { puntosOtorgados: true },
    }),
    tx.ajustePuntos.aggregate({
      where: { participanteId },
      _sum: { puntos: true },
    }),
    tx.participacionActividad.aggregate({
      where: { participanteId },
      _sum: { puntosOtorgados: true },
    }),
  ]);
  const total = participante.esStaff
    ? 0
    : participante.puntosRegistro
      + (completitudes._sum.puntosOtorgados ?? 0)
      + (ajustes._sum.puntos ?? 0)
      + (actividades._sum.puntosOtorgados ?? 0);
  await tx.participante.update({
    where: { id: participanteId },
    data: { puntosTotales: total },
  });
  return total;
}
