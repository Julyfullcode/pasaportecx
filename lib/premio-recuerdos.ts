import type { Prisma } from "@prisma/client";
import { recalcularPuntosParticipante } from "@/lib/puntos";

export const PREFIJO_PREMIO_REACCIONES = "Premio foto mas reaccionada: ";
export const PREFIJO_EVIDENCIA_RECUERDO = "evidencia:";

/**
 * Reasigna el premio a la foto visible con mas corazones y risas. La
 * actualizacion de la configuracion bloquea esa fila y serializa reacciones
 * concurrentes para que nunca queden dos ganadores.
 */
export async function actualizarPremioFotoMasReaccionada(tx: Prisma.TransactionClient) {
  const configuracion = await tx.configuracionEvento.update({
    where: { id: "evento" },
    data: { revisionPremioReacciones: { increment: 1 } },
    select: { puntosFotoMasReaccionada: true },
  });
  const premiosAnteriores = await tx.ajustePuntos.findMany({
    where: { motivo: { startsWith: PREFIJO_PREMIO_REACCIONES } },
    select: { participanteId: true },
  });
  await tx.ajustePuntos.deleteMany({
    where: { motivo: { startsWith: PREFIJO_PREMIO_REACCIONES } },
  });

  const afectados = new Set(premiosAnteriores.map((premio) => premio.participanteId));
  if (configuracion.puntosFotoMasReaccionada > 0) {
    const ganadora = await tx.recuerdo.findFirst({
      where: {
        visible: true,
        pendiente: false,
        reportado: false,
        reacciones: { some: {} },
      },
      orderBy: [
        { reacciones: { _count: "desc" } },
        { creadoEn: "asc" },
        { id: "asc" },
      ],
      select: { id: true, participanteId: true },
    });
    const admin = ganadora
      ? await tx.admin.findFirst({ orderBy: { creadoEn: "asc" }, select: { id: true } })
      : null;
    if (ganadora && admin) {
      await tx.ajustePuntos.create({
        data: {
          participanteId: ganadora.participanteId,
          puntos: configuracion.puntosFotoMasReaccionada,
          motivo: PREFIJO_PREMIO_REACCIONES + ganadora.id,
          adminId: admin.id,
        },
      });
      afectados.add(ganadora.participanteId);
    }
  }

  for (const participanteId of afectados) {
    await recalcularPuntosParticipante(tx, participanteId);
  }
}

export function claveRecuerdoEvidencia(completitudId: string) {
  return PREFIJO_EVIDENCIA_RECUERDO + completitudId;
}
