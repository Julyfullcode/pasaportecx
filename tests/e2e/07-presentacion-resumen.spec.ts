import { expect, test } from "@playwright/test";
import { iniciarAdmin } from "./ayudas";

test("la presentación final reúne cifras, fotos, controles y música", async ({ page }) => {
  await iniciarAdmin(page);
  await page.goto("/admin/proyeccion/resumen");

  await expect(page.getByRole("heading", { name: "El evento en cifras y recuerdos" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Comenzar con música" })).toBeVisible();
  await page.getByRole("button", { name: "Comenzar sin música" }).click();
  await expect(page.getByRole("button", { name: "Pausar" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Activar música" })).toBeVisible();
  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByRole("heading", { name: "Una experiencia construida entre todos" })).toBeVisible();
});
