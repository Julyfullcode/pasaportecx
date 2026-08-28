import { expect, test } from "@playwright/test";
import { db } from "@/lib/db";
import { asegurarActividadUniversoArquetipos, RESPUESTA_TEST_UNIVERSO_ID } from "@/lib/universo-arquetipos";
import { autenticarParticipante, crearParticipanteConToken, iniciarAdmin } from "./ayudas";

test("el nuevo universo descubre el arquetipo, completa un reto y publica la estrella", async ({ browser, request }) => {
  const actividadBase = await asegurarActividadUniversoArquetipos();
  const actividad = await db.actividad.update({ where: { id: actividadBase.id }, data: { estado: "PUBLICADA" } });
  const { participante, token } = await crearParticipanteConToken({ nombre: `Astronauta ${Date.now()}` });
  const contexto = await browser.newContext(); await autenticarParticipante(contexto, token); const page = await contexto.newPage();

  await page.goto("/universo");
  await expect(page).toHaveURL(/\/universo\/test$/);
  for (let indice = 0; indice < 5; indice += 1) {
    await page.locator("section button").first().click();
    await page.getByRole("button", { name: indice === 4 ? "Descubrir mi planeta" : "Siguiente" }).click();
  }
  await expect(page).toHaveURL(/\/universo\/tarjeta\?revelar=1/, { timeout: 15_000 });
  await expect(page.getByText("Tu arquetipo está listo")).toBeVisible();
  await page.getByRole("link", { name: "Entrar al mapa estelar" }).click();
  await expect(page.getByRole("heading", { name: "Mapa estelar" })).toBeVisible();

  await page.goto("/universo/planeta/cliente");
  await page.locator("section button").first().click();
  const aporte = "Voy a preguntar por la emoción y la expectativa antes de ofrecer una solución.";
  await page.getByTestId("respuesta-reto-universo").fill(aporte);
  await page.getByRole("button", { name: "Enviar a la Galaxia Colectiva" }).click();
  await expect(page.getByText("Tu estrella ya brilla en la galaxia")).toBeVisible({ timeout: 15_000 });

  const testGuardado = await db.respuestaActividad.findUnique({ where: { actividadId_participanteId_preguntaId: { actividadId: actividad.id, participanteId: participante.id, preguntaId: RESPUESTA_TEST_UNIVERSO_ID } } });
  expect(testGuardado).not.toBeNull();
  expect((await db.participacionActividad.findUniqueOrThrow({ where: { actividadId_participanteId: { actividadId: actividad.id, participanteId: participante.id } } })).puntosOtorgados).toBe(20);
  const galaxia = await request.get("/api/universo/galaxia"); expect(galaxia.ok()).toBe(true); expect((await galaxia.json()).aportes.some((item: { texto: string }) => item.texto === aporte)).toBe(true);

  await iniciarAdmin(page); await page.goto("/admin/actividades");
  await expect(page.getByRole("heading", { name: "El Universo de la Experiencia", exact: true })).toBeVisible();
  await expect(page.getByText("Encuentra tu planeta y descubre cuál es tu aporte a la experiencia del cliente.")).toBeVisible();
  await contexto.close();
});
