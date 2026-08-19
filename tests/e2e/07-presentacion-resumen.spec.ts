import { expect, test } from "@playwright/test";
import { db } from "@/lib/db";
import { PREGUNTAS_ENCUESTA_MIXTA_EJEMPLO } from "@/lib/encuesta-mixta";
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
  const encuesta = await db.desafio.create({
    data: {
      codigoQr: `encuesta-resumen-${Date.now()}`,
      titulo: "Encuesta para el resumen",
      descripcion: "Una descripción visible para comprobar el nuevo diseño de los desafíos.",
      tipo: "ENCUESTA",
      puntos: 0,
      dia: 0,
      ubicacion: "E2E",
      estado: "PUBLICADO",
      orden: 999,
      configuracion: { formato: "mixta", preguntas: PREGUNTAS_ENCUESTA_MIXTA_EJEMPLO },
    },
  });
  await db.completitud.create({
    data: {
      participanteId: participante.id,
      desafioId: encuesta.id,
      puntosOtorgados: 0,
      estado: "APROBADO",
      respuesta: {
        formato: "mixta",
        respuestas: {
          "satisfaccion-general": 10,
          "mas-valioso": "La conexión genuina con personas de todas las empresas.",
          "por-ajustar": "Más tiempo para conversar.",
        },
      },
    },
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
  await expect(page.getByTestId("cifras-personas-fotos").locator("img")).toHaveCount(4);
  expect(await page.getByTestId("cifras-personas-fotos").locator("img").first().evaluate((imagen) => imagen.getBoundingClientRect().width)).toBeGreaterThan(80);
  const primerasPersonas = await page.getByTestId("cifras-personas-fotos").locator("img").evaluateAll((imagenes) => imagenes.map((imagen) => (imagen as HTMLImageElement).alt));
  await page.waitForTimeout(2_700);
  const siguientesPersonas = await page.getByTestId("cifras-personas-fotos").locator("img").evaluateAll((imagenes) => imagenes.map((imagen) => (imagen as HTMLImageElement).alt));
  expect(siguientesPersonas).not.toEqual(primerasPersonas);
  await expect(page.getByTestId("cifras-empresas-logos")).toBeVisible();
  await expect(page.getByTestId("cifras-empresas-logos").locator(":scope > div")).toHaveCount(empresasConPersonas);
  const logos = page.getByTestId("cifras-empresas-logos").locator("img");
  if (await logos.count()) await expect(logos.first()).toHaveCSS("filter", /invert/);
  await expect(page.getByTestId("cifras-desafios")).toBeVisible();
  await expect(page.getByTestId("cifras-desafios").locator(":scope > div")).toHaveCount(Math.min(2, desafiosPublicados));
  await expect(page.getByTestId("cifras-desafios").locator("small").first()).not.toBeEmpty();
  await expect(page.getByTestId("cifras-momentos-fotos").locator("img")).not.toHaveCount(0);

  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByRole("heading", { name: "personas se registraron en la app" })).toBeVisible();
  await expect(page.getByText(/Rostros 1–8 de/)).toBeVisible();
  await expect(page.locator(".avatar-registro-animado")).toHaveCount(8);
  expect(await page.locator(".avatar-registro-animado img").first().evaluate((imagen) => imagen.getBoundingClientRect().width)).toBeGreaterThan(130);
  await expect(page.getByText(/Rostros 9–\d+ de/), "las fotos deben rotar para mostrar a todas las personas").toBeVisible({ timeout: 4_000 });

  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByRole("heading", { name: "La experiencia se puso en movimiento" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Quienes hicieron parte de esta historia" })).toHaveCount(0);

  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByRole("heading", { name: "Un solo equipo, muchas voces" })).toBeVisible();
  expect(await page.getByTestId("empresa-participantes").first().evaluate((elemento) => getComputedStyle(elemento).color)).toBe("rgb(255, 255, 255)");
  const avataresEmpresa = page.getByTestId("empresa-personas").first().locator("img");
  await expect(avataresEmpresa).not.toHaveCount(0);
  const posicionesEmpresa = await avataresEmpresa.evaluateAll((imagenes) => imagenes.map((imagen) => {
    const rectangulo = imagen.getBoundingClientRect();
    return { left: rectangulo.left, right: rectangulo.right };
  }));
  expect(posicionesEmpresa.every((posicion, indice) => indice === 0 || posicionesEmpresa[indice - 1].right <= posicion.left)).toBe(true);

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
  await expect(page.getByRole("heading", { name: "Las voces que nos impulsan" })).toBeVisible();
  await expect(page.getByTestId("nps-total")).toHaveText("+100");
  await expect(page.getByText(/La conexión genuina con personas/)).toBeVisible();

  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByRole("heading", { name: /La tecnología cobra sentido/ })).toBeVisible();
});
