import { afterEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { consumirLimite } from "@/lib/limite-solicitudes";

const accion = `unit-${Date.now()}`;

afterEach(async () => {
  await db.limiteSolicitud.deleteMany({ where: { accion } });
});

describe("limitación persistente de solicitudes", () => {
  it("bloquea al superar el máximo en la misma ventana", async () => {
    const request = new Request("http://localhost", { headers: { "x-forwarded-for": "198.51.100.24" } });
    const opciones = { accion, limite: 2, ventanaSegundos: 60, request };
    expect((await consumirLimite(opciones)).permitido).toBe(true);
    expect((await consumirLimite(opciones)).permitido).toBe(true);
    expect((await consumirLimite(opciones)).permitido).toBe(false);
  });
});
