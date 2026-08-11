import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

type Operacion<T> = (tx: Prisma.TransactionClient) => Promise<T>;

export async function ejecutarTransaccionRobusta<T>(
  operacion: Operacion<T>,
  { intentos = 9, maxWait = 30_000, timeout = 30_000, serializable = false } = {},
): Promise<T> {
  for (let intento = 0; intento < intentos; intento += 1) {
    try {
      const opciones: {
        maxWait: number;
        timeout: number;
        isolationLevel?: Prisma.TransactionIsolationLevel;
      } = { maxWait, timeout };
      if (serializable) opciones.isolationLevel = Prisma.TransactionIsolationLevel.Serializable;
      return await db.$transaction(operacion, opciones);
    } catch (error) {
      const reintentable = error instanceof Prisma.PrismaClientKnownRequestError
        && (error.code === "P2034" || error.code === "P2024");
      if (!reintentable || intento === intentos - 1) throw error;
      const esperaMs = Math.min(1_500, 50 * (2 ** intento)) + Math.floor(Math.random() * 120);
      await new Promise((resolver) => setTimeout(resolver, esperaMs));
    }
  }
  throw new Error("No fue posible completar la transacción.");
}