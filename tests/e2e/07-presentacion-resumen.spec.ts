import { expect, test } from "@playwright/test";
import { db } from "@/lib/db";
import { crearParticipanteConToken, iniciarAdmin } from "./ayudas";

test("la presentación final reúne cifras, fotos, controles y música", async ({ page }) => {
  const { participante } = await crearParticipanteConToken({ nombre: `Autor resumen ${Date.now()}` });
  await db.recuerdo.createMany({
    data: Array.from({ length: 8 }, (_, indice) => ({
      participanteId: participante.id,
      urlFoto: `/marca/logo-grupo-epm-oficial.png?momento=${indice + 1}`,
      urlMiniatura: `/marca/logo-grupo-epm-oficial.png?momento=${indice + 1}`,
      descripcion: `Momento animado ${indice + 1}`,
      visible: true,
    })),
  });
  await iniciarAdmin(page);
  await page.goto("/admin/proyeccion/resumen");

  await expect(page.getByRole("heading", { name: "El evento en cifras y recuerdos" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Comenzar con música" })).toBeVisible();
  await page.getByRole("button", { name: "Comenzar sin música" }).click();
  await expect(page.getByRole("button", { name: "Pausar" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Activar música" })).toBeVisible();
  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByRole("heading", { name: "Una experiencia construida entre todos" })).toBeVisible();
  await expect(page.getByTestId("cifras-personas-fotos").locator("img")).not.toHaveCount(0);
  await expect(page.getByTestId("cifras-empresas-logos")).toBeVisible();
  await expect(page.getByTestId("cifras-desafios")).toBeVisible();
  await expect(page.getByTestId("cifras-momentos-fotos").locator("img")).not.toHaveCount(0);

  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByRole("heading", { name: "Más de 93 personas se registraron en la app" })).toBeVisible();

  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByRole("heading", { name: "La experiencia se puso en movimiento" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Quienes hicieron parte de esta historia" })).toHaveCount(0);

  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByRole("heading", { name: "Imágenes que cuentan nuestra historia" })).toBeVisible();
  await expect(page.locator(".foto-historia-animada")).not.toHaveCount(0);
});
