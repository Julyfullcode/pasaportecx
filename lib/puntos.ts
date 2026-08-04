import type { MetodoPuntajeEquipo, Prisma } from "@prisma/client";

export type IntegrantePuntos = { puntosTotales: number; activo: boolean };

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

export function calcularPuntajeEquipo(
  integrantes: IntegrantePuntos[],
  metodo: MetodoPuntajeEquipo | "PROMEDIO" | "SUMA",
): number {
  const activos = integrantes.filter((integrante) => integrante.activo);
  const total = activos.reduce((suma, integrante) => suma + integrante.puntosTotales, 0);
  if (metodo === "SUMA") return total;
  return activos.length ? Math.round((total / activos.length) * 100) / 100 : 0;
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
