import { afterAll, describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

describe("idempotencia de completitudes", () => {
  const sufijo = `test-${Date.now()}`;
  let participanteId = "";
  let desafioId = "";

  afterAll(async () => {
    if (participanteId) await db.participante.delete({ where: { id: participanteId } }).catch(() => {});
    if (desafioId) await db.desafio.delete({ where: { id: desafioId } }).catch(() => {});
    await db.$disconnect();
  });

  it("la restricción compuesta impide sumar dos veces con requests concurrentes", async () => {
    const empresa = await db.empresa.findFirstOrThrow();
    const participante = await db.participante.create({
      data: {
        nombre: "Prueba idempotencia",
        empresaId: empresa.id,
        urlFoto: "/marca/icono.svg",
        codigoRecuperacion: `I${Date.now().toString(36).slice(-5)}`.toUpperCase(),
      },
    });
    participanteId = participante.id;
    const desafio = await db.desafio.create({
      data: {
        codigoQr: sufijo,
        titulo: "Prueba concurrente",
        descripcion: "Prueba",
        tipo: "CHECK_IN",
        puntos: 100,
        dia: 1,
        ubicacion: "Test",
        estado: "PUBLICADO",
        configuracion: {},
      },
    });
    desafioId = desafio.id;
    const intentos = await Promise.allSettled([
      db.completitud.create({ data: { participanteId, desafioId, puntosOtorgados: 100 } }),
      db.completitud.create({ data: { participanteId, desafioId, puntosOtorgados: 100 } }),
    ]);
    expect(intentos.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rechazo = intentos.find((r) => r.status === "rejected");
    expect(rechazo?.status).toBe("rejected");
    if (rechazo?.status === "rejected") {
      expect(rechazo.reason).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
      expect(rechazo.reason.code).toBe("P2002");
    }
    expect(await db.completitud.count({ where: { participanteId, desafioId } })).toBe(1);
  });
});
