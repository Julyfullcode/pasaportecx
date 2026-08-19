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
  const [empresasConPersonas, desafiosPublicados] = await Promise.all([
    db.empresa.count({ where: { participantes: { some: { activo: true } } } }),
    db.desafio.count({ where: { estado: { not: "BORRADOR" } } }),
  ]);
  await iniciarAdmin(page);
  await page.goto("/admin/proyeccion/resumen");

  await expect(page.getByRole("heading", { name: "El evento en cifras y recuerdos" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Comenzar con música" })).toBeVisible();
  await page.getByRole("button", { name: "Comenzar sin música" }).click();
  await expect(page.getByRole("button", { name: "Pausar" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Activar música" })).toBeVisible();
  await page.getByRole("button", { name: "Activar música" }).click();
  await expect(page.getByRole("button", { name: "Silenciar música" })).toBeVisible();
  await page.getByRole("button", { name: "Silenciar música" }).click();
  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByRole("heading", { name: "Una experiencia construida entre todos" })).toBeVisible();
  await expect(page.getByTestId("cifras-personas-fotos").locator("img")).not.toHaveCount(0);
  await expect(page.getByTestId("cifras-empresas-logos")).toBeVisible();
  await expect(page.getByTestId("cifras-empresas-logos").locator(":scope > div")).toHaveCount(empresasConPersonas);
  await expect(page.getByTestId("cifras-desafios")).toBeVisible();
  await expect(page.getByTestId("cifras-desafios").locator(":scope > div")).toHaveCount(desafiosPublicados);
  await expect(page.getByTestId("cifras-momentos-fotos").locator("img")).not.toHaveCount(0);

  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByRole("heading", { name: "Más de 93 personas se registraron en la app" })).toBeVisible();
  await expect(page.getByText(/Rostros 1–12 de/)).toBeVisible();
  await expect(page.locator(".avatar-registro-animado")).toHaveCount(12);
  await expect(page.getByText(/Rostros 13–\d+ de/), "las fotos deben rotar para mostrar a todas las personas").toBeVisible({ timeout: 4_000 });

  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByRole("heading", { name: "La experiencia se puso en movimiento" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Quienes hicieron parte de esta historia" })).toHaveCount(0);

  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByRole("heading", { name: "Un solo equipo, muchas voces" })).toBeVisible();
  expect(await page.getByTestId("empresa-participantes").first().evaluate((elemento) => getComputedStyle(elemento).color)).toBe("rgb(255, 255, 255)");

  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByRole("heading", { name: "Imágenes que cuentan nuestra historia" })).toBeVisible();
  await expect(page.locator(".foto-historia-animada")).not.toHaveCount(0);
  const primerasFotos = await page.getByTestId("galeria-rotativa").locator("figure img:not([aria-hidden])").evaluateAll((imagenes) => imagenes.map((imagen) => (imagen as HTMLImageElement).src));
  await page.waitForTimeout(5_000);
  const siguientesFotos = await page.getByTestId("galeria-rotativa").locator("figure img:not([aria-hidden])").evaluateAll((imagenes) => imagenes.map((imagen) => (imagen as HTMLImageElement).src));
  expect(siguientesFotos).not.toEqual(primerasFotos);

  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByRole("heading", { name: "Personas que dejaron huella" })).toBeVisible();
  expect(await page.getByRole("img", { name: /Foto de/ }).first().evaluate((imagen) => imagen.getBoundingClientRect().width)).toBeGreaterThan(200);

  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByRole("heading", { name: /La tecnología cobra sentido/ })).toBeVisible();
});
