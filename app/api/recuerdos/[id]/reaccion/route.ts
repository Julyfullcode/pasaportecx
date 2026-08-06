import { Prisma } from "@prisma/client";
import { participanteActual } from "@/lib/auth";
import { db } from "@/lib/db";
import { anunciarCambio } from "@/lib/eventos";
import { resumirReacciones, TIPOS_REACCION, type TipoReaccionRecuerdo } from "@/lib/recuerdos";
import { actualizarPremioFotoMasReaccionada } from "@/lib/premio-recuerdos";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const participante = await participanteActual();
  if (!participante) return Response.json({ error: "Tu sesión venció." }, { status: 401 });

  const { id: recuerdoId } = await params;
  const cuerpo = (await request.json().catch(() => null)) as { tipo?: string } | null;
  if (!cuerpo?.tipo || !TIPOS_REACCION.includes(cuerpo.tipo as TipoReaccionRecuerdo)) {
    return Response.json({ error: "La reacción no es válida." }, { status: 400 });
  }
  const tipo = cuerpo.tipo as TipoReaccionRecuerdo;
  const recuerdo = await db.recuerdo.findFirst({
    where: { id: recuerdoId, visible: true, pendiente: false, reportado: false },
    select: { id: true },
  });
  if (!recuerdo) return Response.json({ error: "Este recuerdo ya no está disponible." }, { status: 404 });

  try {
    await db.$transaction(async (tx) => {
      const existentes = await tx.reaccionRecuerdo.findMany({
        where: { recuerdoId, participanteId: participante.id },
        select: { id: true, tipo: true },
      });
      const misma = existentes.find((reaccion) => reaccion.tipo === tipo);
      await tx.reaccionRecuerdo.deleteMany({ where: { recuerdoId, participanteId: participante.id } });
      if (!misma) {
        await tx.reaccionRecuerdo.create({ data: { recuerdoId, participanteId: participante.id, tipo } });
      }
      await actualizarPremioFotoMasReaccionada(tx);
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
  }

  const reacciones = await db.reaccionRecuerdo.findMany({
    where: { recuerdoId },
    select: { participanteId: true, tipo: true },
  });
  anunciarCambio("reaccion-recuerdo");
  anunciarCambio("puntos");
  return Response.json({ reacciones: resumirReacciones(reacciones, participante.id) });
}
