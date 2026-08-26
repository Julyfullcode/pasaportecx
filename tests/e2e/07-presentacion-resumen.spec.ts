import { expect, test } from "@playwright/test";
import { db } from "@/lib/db";
import { PREGUNTAS_ENCUESTA_MIXTA_EJEMPLO } from "@/lib/encuesta-mixta";
import { crearParticipanteConToken } from "./ayudas";

test("la presentación final reúne cifras, fotos, controles y música", async ({ page }) => {
  await db.configuracionEvento.update({ where: { id: "evento" }, data: { nombreEvento: "Encuentro experiencia y comunicaciones" } });
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
  await page.goto("/admin/proyeccion/resumen");
  await expect(page.getByRole("heading", { name: "El evento en cifras y recuerdos" })).toBeVisible();
  await page.getByLabel("Código de acceso").fill("Incorrecto");
  await page.getByRole("button", { name: "Ingresar a la presentación" }).click();
  await expect(page.getByText("El código no es correcto. Inténtalo de nuevo.", { exact: true })).toBeVisible();
  await page.getByLabel("Código de acceso").fill("Experiencia");
  await page.getByRole("button", { name: "Ingresar a la presentación" }).click();

  await expect(page).toHaveURL(/\/admin\/proyeccion\/resumen\/presentacion$/);
  const viewportPublicado = await page.locator('meta[name="viewport"]').getAttribute("content");
  expect(viewportPublicado).toContain("width=1920");
  expect(viewportPublicado).toContain("user-scalable=yes");
  expect(viewportPublicado).not.toContain("maximum-scale=1");
  await expect(page.getByRole("heading", { name: "El evento en cifras y recuerdos" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Comenzar con música" })).toBeVisible();
  await page.getByRole("button", { name: "Comenzar sin música" }).click();
  await expect(page.getByRole("button", { name: "Pausar" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Activar música" })).toBeVisible();
  await expect(page.getByLabel(/Ir a la diapositiva/)).toHaveCount(0);
  const [controlSiguiente, controlMusica] = await Promise.all([
    page.getByRole("button", { name: "Siguiente" }).boundingBox(),
    page.getByRole("button", { name: "Activar música" }).boundingBox(),
  ]);
  expect(controlSiguiente && controlMusica && controlSiguiente.y === controlMusica.y && controlSiguiente.x < controlMusica.x).toBeTruthy();
  await page.getByRole("button", { name: "Activar música" }).click();
  await expect(page.getByRole("button", { name: "Silenciar música" })).toBeVisible();
  await page.getByRole("button", { name: "Silenciar música" }).click();
  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByRole("heading", { name: "Una experiencia construida entre todos" })).toBeVisible();
  await page.waitForTimeout(600);
  await expect(page.getByTestId("cifras-personas-fotos").locator("img")).toHaveCount(6);
  expect(await page.getByTestId("cifras-personas-fotos").locator("img").first().evaluate((imagen) => imagen.getBoundingClientRect().width)).toBeGreaterThan(80);
  const primerasPersonas = await page.getByTestId("cifras-personas-fotos").locator("img").evaluateAll((imagenes) => imagenes.map((imagen) => (imagen as HTMLImageElement).alt));
  await page.waitForTimeout(2_900);
  const siguientesPersonas = await page.getByTestId("cifras-personas-fotos").locator("img").evaluateAll((imagenes) => imagenes.map((imagen) => (imagen as HTMLImageElement).alt));
  expect(siguientesPersonas).not.toEqual(primerasPersonas);
  const fotosCifrasSeTraslapan = await page.getByTestId("cifras-personas-fotos").locator("img").evaluateAll((imagenes) => {
    const cajas = imagenes.map((imagen) => imagen.getBoundingClientRect());
    return cajas.some((caja, indice) => cajas.slice(indice + 1).some((otra) => caja.left < otra.right && caja.right > otra.left && caja.top < otra.bottom && caja.bottom > otra.top));
  });
  expect(fotosCifrasSeTraslapan).toBe(false);
  await expect(page.getByTestId("cifras-empresas-logos")).toBeVisible();
  await expect(page.getByTestId("cifras-empresas-logos").locator(":scope > div")).toHaveCount(Math.min(4, empresasConPersonas));
  const logos = page.getByTestId("cifras-empresas-logos").locator("img");
  if (await logos.count()) await expect(logos.first()).toHaveCSS("filter", /invert/);
  const logosSeTraslapan = await page.getByTestId("cifras-empresas-logos").locator(":scope > div").evaluateAll((elementos) => {
    const cajas = elementos.map((elemento) => elemento.getBoundingClientRect());
    return cajas.some((caja, indice) => cajas.slice(indice + 1).some((otra) => caja.left < otra.right && caja.right > otra.left && caja.top < otra.bottom && caja.bottom > otra.top));
  });
  expect(logosSeTraslapan).toBe(false);
  await expect(page.getByTestId("cifras-desafios")).toBeVisible();
  await expect(page.getByTestId("cifras-desafios").locator(":scope > div")).toHaveCount(Math.min(2, desafiosPublicados));
  await expect(page.getByTestId("cifras-desafios").locator("small").first()).not.toBeEmpty();
  const desafiosSeTraslapan = await page.getByTestId("cifras-desafios").locator(":scope > div").evaluateAll((elementos) => {
    const cajas = elementos.map((elemento) => elemento.getBoundingClientRect());
    return cajas.some((caja, indice) => cajas.slice(indice + 1).some((otra) => caja.top < otra.bottom && caja.bottom > otra.top));
  });
  expect(desafiosSeTraslapan).toBe(false);
  await expect(page.getByTestId("cifras-momentos-fotos").locator("img")).not.toHaveCount(0);

  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByRole("heading", { name: "personas se registraron en la app" })).toBeVisible();
  await page.waitForTimeout(600);
  await expect(page.getByText(/Rostros 1–8 de/)).toBeVisible();
  await expect(page.locator(".avatar-registro-animado")).toHaveCount(8);
  expect(await page.locator(".avatar-registro-animado img").first().evaluate((imagen) => imagen.getBoundingClientRect().width)).toBeGreaterThan(130);
  const cartelRegistro = await page.getByRole("heading", { name: "personas se registraron en la app" }).locator("..").boundingBox();
  const avataresRegistro = await page.locator(".avatar-registro-animado").evaluateAll((elementos) => elementos.map((elemento) => {
    const caja = elemento.getBoundingClientRect();
    return { left: caja.left, right: caja.right, top: caja.top, bottom: caja.bottom };
  }));
  expect(cartelRegistro && avataresRegistro.every((avatar) => avatar.right <= cartelRegistro.x || avatar.left >= cartelRegistro.x + cartelRegistro.width || avatar.bottom <= cartelRegistro.y || avatar.top >= cartelRegistro.y + cartelRegistro.height)).toBeTruthy();
  expect(avataresRegistro.some((avatar, indice) => avataresRegistro.slice(indice + 1).some((otro) => avatar.left < otro.right && avatar.right > otro.left && avatar.top < otro.bottom && avatar.bottom > otro.top))).toBe(false);
  const ubicacionesPrimerGrupo = await page.locator(".avatar-registro-animado img").evaluateAll((imagenes) => imagenes.map((imagen) => {
    const caja = imagen.getBoundingClientRect();
    return `${(imagen as HTMLImageElement).alt}:${Math.round(caja.left)}:${Math.round(caja.top)}:${Math.round(caja.width)}`;
  }));
  await expect(page.getByText(/Rostros 9–\d+ de/), "las fotos deben rotar para mostrar a todas las personas").toBeVisible({ timeout: 4_000 });
  const ubicacionesSegundoGrupo = await page.locator(".avatar-registro-animado img").evaluateAll((imagenes) => imagenes.map((imagen) => {
    const caja = imagen.getBoundingClientRect();
    return `${(imagen as HTMLImageElement).alt}:${Math.round(caja.left)}:${Math.round(caja.top)}:${Math.round(caja.width)}`;
  }));
  expect(ubicacionesSegundoGrupo).not.toEqual(ubicacionesPrimerGrupo);

  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByRole("heading", { name: "La experiencia se puso en movimiento" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Quienes hicieron parte de esta historia" })).toHaveCount(0);

  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByRole("heading", { name: "Un solo equipo, muchas voces" })).toBeVisible();
  expect(await page.getByTestId("empresa-participantes").first().evaluate((elemento) => getComputedStyle(elemento).color)).toBe("rgb(255, 255, 255)");
  await expect(page.getByTestId("empresa-personas")).toHaveCount(0);
  await expect(page.getByTestId("barra-empresa")).toHaveCount(empresasConPersonas);
  expect(await page.getByTestId("barra-empresa").first().evaluate((barra) => barra.getBoundingClientRect().height)).toBeGreaterThan(10);
  expect(await page.getByTestId("barra-empresa").first().locator("div").evaluate((barra) => barra.getBoundingClientRect().width)).toBeGreaterThan(0);

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
  await expect(page.getByText("¡pero la verdadera victoria fue la participación de todos!")).toBeVisible();

  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByRole("heading", { name: "Las voces que nos impulsan" })).toBeVisible();
  await expect(page.getByTestId("promedio-satisfaccion")).toHaveText(/10[,.]0/);
  await expect(page.getByText(/La conexión genuina con personas/)).toBeVisible();
  await expect(page.getByText(PREGUNTAS_ENCUESTA_MIXTA_EJEMPLO[2].titulo, { exact: true })).toBeVisible();
  const comentarioMejora = page.getByTestId("comentarios-satisfaccion").locator('[data-tono="mejora"]');
  await expect(comentarioMejora).toContainText("Más tiempo para conversar.");
  await expect(comentarioMejora).toContainText(PREGUNTAS_ENCUESTA_MIXTA_EJEMPLO[3].titulo);

  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByRole("heading", { name: /La tecnología cobra sentido/ })).toBeVisible();

  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByRole("heading", { name: /Cada cifra tiene una historia/ })).toBeVisible();
  const distintivoCierre = await page.getByTestId("distintivo-cierre").boundingBox();
  expect(distintivoCierre && distintivoCierre.y + distintivoCierre.height < page.viewportSize()!.height).toBeTruthy();
});
