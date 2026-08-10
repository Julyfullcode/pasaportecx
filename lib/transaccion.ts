import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

type Operacion<T> = (tx: Prisma.TransactionClient) => Promise<T>;

export async function ejecutarTransaccionSerializable<T>(
  operacion: Operacion<T>,
  { intentos = 7, maxWait = 15_000, timeout = 20_000 } = {},
): Promise<T> {
  for (let intento = 0; intento < intentos; intento += 1) {
    try {
      return await db.$transaction(operacion, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait,
        timeout,
      });
    } catch (error) {
      const conflicto = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
      if (!conflicto || intento === intentos - 1) throw error;
      const esperaMs = Math.min(800, 40 * (2 ** intento)) + Math.floor(Math.random() * 80);
      await new Promise((resolver) => setTimeout(resolver, esperaMs));
    }
  }
  throw new Error("No fue posible completar la transacción.");
}