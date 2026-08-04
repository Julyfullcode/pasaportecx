import { expect, test } from "@playwright/test";
import { db } from "@/lib/db";
import { contextoApiParticipante, crearParticipanteConToken, registrarPorApi } from "./ayudas";

test.describe("Rendimiento y concurrencia", () => {
  test("60 usuarios virtuales interactúan simultáneamente sin pérdida de datos", async ({ playwright, request }) => {
    const marca = Date.now();
    const participantesEscaneo = [];
    for (let indice = 0; indice < 10; indice += 1) {
      participantesEscaneo.push(await crearParticipanteConToken({ nombre: `Carga scan ${marca}-${indice}` }));
    }
    const contextosEscaneo = await Promise.all(participantesEscaneo.map(({ token }) => contextoApiParticipante(playwright.request, token)));
    const contextosRegistro = await Promise.all(Array.from({ length: 5 }, () => playwright.request.newContext({ baseURL: "http://127.0.0.1:3000" })));

    const inicio = Date.now();
    const [registros, escaneos, rankings] = await Promise.all([
      Promise.all(contextosRegistro.map((api, indice) => registrarPorApi(api, `Carga registro ${marca}-${indice}`))),
      Promise.all(contextosEscaneo.map((api) => api.post("/api/desafios/reto-carga-50/completar"))),
      Promise.all(Array.from({ length: 45 }, () => request.get("/api/ranking"))),
    ]);
    const duracionMs = Date.now() - inicio;

    expect(registros.every((respuesta) => respuesta.status() === 200)).toBe(true);
    expect(escaneos.every((respuesta) => respuesta.status() === 200)).toBe(true);
    expect(rankings.every((respuesta) => respuesta.status() === 200)).toBe(true);
    expect(duracionMs).toBeLessThan(30_000);
    expect(await db.participante.count({ where: { nombre: { startsWith: `Carga registro ${marca}-` } } })).toBe(5);
    expect(await db.completitud.count({ where: { desafioId: "desafio-e2e-carga", participanteId: { in: participantesEscaneo.map(({ participante }) => participante.id) } } })).toBe(10);
    const puntajes = await db.participante.findMany({ where: { id: { in: participantesEscaneo.map(({ participante }) => participante.id) } }, select: { puntosTotales: true } });
    expect(puntajes.every(({ puntosTotales }) => puntosTotales === 125)).toBe(true);
    await Promise.all([...contextosRegistro, ...contextosEscaneo].map((api) => api.dispose()));
  });

  test("10 requests concurrentes del mismo reto suman una sola vez", async ({ playwright }) => {
    const { participante, token } = await crearParticipanteConToken({ nombre: `Carrera idempotente ${Date.now()}` });
    const api = await contextoApiParticipante(playwright.request, token);
    const respuestas = await Promise.all(
      Array.from({ length: 10 }, () => api.post("/api/desafios/reto-concurrencia-idempotente/completar")),
    );

    expect(respuestas.every((respuesta) => respuesta.status() === 200)).toBe(true);
    expect(await db.completitud.count({ where: { participanteId: participante.id, desafioId: "desafio-e2e-idempotente" } })).toBe(1);
    expect((await db.participante.findUniqueOrThrow({ where: { id: participante.id } })).puntosTotales).toBe(125);
    await api.dispose();
  });
});
