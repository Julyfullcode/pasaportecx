import { expect, test } from "@playwright/test";
import { db } from "@/lib/db";
import { autenticarParticipante, crearParticipanteConToken, contextoApiParticipante, PUNTOS_REGISTRO } from "./ayudas";

test.describe("Retos y puntos", () => {
  test("un QR válido suma los puntos correctos", async ({ context, page }) => {
    const { participante, token } = await crearParticipanteConToken({ nombre: `QR válido ${Date.now()}` });
    await autenticarParticipante(context, token);
    await page.goto("/d/reto-e2e-100");

    await expect(page.getByText("¡Desafío completado!")).toBeVisible();
    await expect(page.getByText("+100")).toBeVisible();
    await expect(page.getByText(`Nuevo total: ${PUNTOS_REGISTRO + 100} puntos`)).toBeVisible();
    expect((await db.participante.findUniqueOrThrow({ where: { id: participante.id } })).puntosTotales).toBe(125);
  });

  test("un código QR mal formado no rompe la app y muestra un error claro", async ({ context, page }) => {
    const { token } = await crearParticipanteConToken({ nombre: `QR inválido ${Date.now()}` });
    await autenticarParticipante(context, token);
    await page.goto("/escanear");
    await page.getByLabel("Ingresar código manualmente").fill("%%%codigo-invalido%%%");
    await page.getByRole("button", { name: "Abrir" }).click();

    await expect(page.getByText("El código ingresado no tiene un formato válido. Revísalo e intenta nuevamente.")).toBeVisible();
    await expect(page).toHaveURL(/\/escanear$/);
  });

  test("el mismo reto no puede sumar dos veces al mismo participante", async ({ context, page }) => {
    const { participante, token } = await crearParticipanteConToken({ nombre: `Idempotente UI ${Date.now()}` });
    await autenticarParticipante(context, token);
    await page.goto("/d/reto-e2e-100");
    await expect(page.getByText("¡Desafío completado!")).toBeVisible();
    await page.reload();

    await expect(page.getByText("Ya completaste este desafío")).toBeVisible();
    expect(await db.completitud.count({ where: { participanteId: participante.id, desafioId: "desafio-e2e-100" } })).toBe(1);
    expect((await db.participante.findUniqueOrThrow({ where: { id: participante.id } })).puntosTotales).toBe(125);
  });

  test("los puntos obtenidos se reflejan en el perfil del participante", async ({ playwright, context, page }) => {
    const { token } = await crearParticipanteConToken({ nombre: `Perfil puntos ${Date.now()}` });
    const api = await contextoApiParticipante(playwright.request, token);
    expect((await api.post("/api/desafios/reto-e2e-100/completar")).status()).toBe(200);
    await api.dispose();
    await autenticarParticipante(context, token);
    await page.goto("/");

    const tarjeta = page.locator("section").filter({ hasText: "Tu puntaje total" }).first();
    await expect(tarjeta.getByText("125", { exact: true })).toBeVisible();
  });
});
