import { expect, test } from "@playwright/test";
import { db } from "@/lib/db";
import { crearParticipanteConToken, contextoApiParticipante, iniciarAdmin } from "./ayudas";

test.describe.serial("Podio en tiempo real", () => {
  test("el podio individual muestra el top 5 ordenado por puntos", async ({ page }) => {
    const staff = await crearParticipanteConToken({
      nombre: `Staff fuera del podio ${Date.now()}`,
      puntos: 100_000,
      esStaff: true,
    });
    await iniciarAdmin(page);
    const ranking = await page.evaluate(async () => {
      const respuesta = await fetch("/api/ranking");
      if (!respuesta.ok) throw new Error(`Ranking respondió ${respuesta.status}`);
      return respuesta.json();
    });
    expect(ranking.individual.slice(0, 5).map((persona: { nombre: string }) => persona.nombre)).toEqual([
      "Podio 1", "Podio 2", "Podio 3", "Podio 4", "Podio 5",
    ]);
    expect(ranking.individual.some((persona: { id: string }) => persona.id === staff.participante.id)).toBe(false);
    await page.goto("/admin/proyeccion/podio");
    await expect(page.getByText(staff.participante.nombre, { exact: true })).toHaveCount(0);
    await expect(page.locator("article").filter({ hasText: "Primer lugar" })).toContainText("Podio 1");
    await expect(page.getByText("Podio 4", { exact: true })).toBeVisible();
    await expect(page.getByText("Podio 5", { exact: true })).toBeVisible();
  });

  test("el podio se actualiza tras 10 participantes sumando puntos en paralelo", async ({ page, playwright }) => {
    const principal = await crearParticipanteConToken({ nombre: `Concurrente líder ${Date.now()}`, puntos: 4_990 });
    const participantes = [principal];
    for (let indice = 2; indice <= 10; indice += 1) {
      participantes.push(await crearParticipanteConToken({ nombre: `Concurrente ${indice} ${Date.now()}`, puntos: 1_000 }));
    }
    await iniciarAdmin(page);
    await page.goto("/admin/proyeccion/podio");
    await expect(page.getByText(principal.participante.nombre, { exact: true })).toBeVisible();

    const contextos = await Promise.all(participantes.map(({ token }) => contextoApiParticipante(playwright.request, token)));
    const respuestas = await Promise.all(contextos.map((api) => api.post("/api/desafios/reto-e2e-100/completar")));
    expect(respuestas.every((respuesta) => respuesta.status() === 200)).toBe(true);
    await expect(page.locator("article").filter({ hasText: "Primer lugar" })).toContainText(principal.participante.nombre, { timeout: 10_000 });
    await expect(page.locator("article").filter({ hasText: "Primer lugar" })).toContainText("5.090");
    expect(await db.completitud.count({ where: { participanteId: { in: participantes.map(({ participante }) => participante.id) }, desafioId: "desafio-e2e-100" } })).toBe(10);
    await Promise.all(contextos.map((api) => api.dispose()));
  });
});
