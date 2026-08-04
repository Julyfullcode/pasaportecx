import { expect, test } from "@playwright/test";
import { db } from "@/lib/db";
import { autenticarParticipante, crearParticipanteConToken, contextoApiParticipante, PUNTOS_REGISTRO } from "./ayudas";

function fechaHoraColombia(fecha: Date) {
  const partes = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(fecha).map((parte) => [parte.type, parte.value]));
  return `${partes.year}-${partes.month}-${partes.day}T${partes.hour}:${partes.minute}`;
}

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

  test("el desafío de puntualidad otorga puntos dentro de la tolerancia", async ({ context, page }) => {
    const marca = Date.now();
    const { participante, token } = await crearParticipanteConToken({ nombre: `Puntual ${marca}` });
    const desafio = await db.desafio.create({
      data: {
        codigoQr: `puntualidad-a-tiempo-${marca}`,
        titulo: "Llegada puntual",
        descripcion: "Registra tu hora de llegada.",
        tipo: "CHECK_IN",
        puntos: 80,
        dia: 1,
        ubicacion: "Entrada",
        estado: "PUBLICADO",
        configuracion: {
          tipoEspecial: "PUNTUALIDAD",
          fechaHoraObjetivo: fechaHoraColombia(new Date(Date.now() - 2 * 60_000)),
          toleranciaMinutos: 5,
        },
      },
    });
    await autenticarParticipante(context, token);
    await page.goto(`/d/${desafio.codigoQr}`);
    await expect(page.getByRole("button", { name: "Registrar mi puntualidad" })).toBeVisible();
    await page.getByRole("button", { name: "Registrar mi puntualidad" }).click();

    await expect(page.getByRole("heading", { name: "¡Puntualidad registrada!" })).toBeVisible();
    await expect(page.getByText("+80", { exact: true })).toBeVisible();
    expect((await db.participante.findUniqueOrThrow({ where: { id: participante.id } })).puntosTotales).toBe(PUNTOS_REGISTRO + 80);
  });

  test("el desafío de puntualidad rechaza el registro antes de la ventana", async ({ context, page }) => {
    const marca = Date.now();
    const { participante, token } = await crearParticipanteConToken({ nombre: `Temprano ${marca}` });
    const desafio = await db.desafio.create({
      data: {
        codigoQr: `puntualidad-temprano-${marca}`,
        titulo: "Llegada puntual",
        descripcion: "Registra tu hora de llegada.",
        tipo: "CHECK_IN",
        puntos: 80,
        dia: 1,
        ubicacion: "Entrada",
        estado: "PUBLICADO",
        configuracion: {
          tipoEspecial: "PUNTUALIDAD",
          fechaHoraObjetivo: fechaHoraColombia(new Date(Date.now() + 7 * 60_000)),
          toleranciaMinutos: 5,
        },
      },
    });
    await autenticarParticipante(context, token);
    await page.goto(`/d/${desafio.codigoQr}`);
    await page.getByRole("button", { name: "Registrar mi puntualidad" }).click();

    await expect(page.getByRole("heading", { name: "El desafío aún no está disponible" })).toBeVisible();
    await expect(page.getByText("No se registró ninguna completitud.", { exact: true })).toBeVisible();
    expect(await db.completitud.count({ where: { participanteId: participante.id, desafioId: desafio.id } })).toBe(0);
  });

  test("el desafío de puntualidad rechaza la llegada después de la ventana", async ({ context, page }) => {
    const marca = Date.now();
    const { participante, token } = await crearParticipanteConToken({ nombre: `Tarde ${marca}` });
    const desafio = await db.desafio.create({
      data: {
        codigoQr: `puntualidad-tarde-${marca}`,
        titulo: "Llegada puntual",
        descripcion: "Registra tu hora de llegada.",
        tipo: "CHECK_IN",
        puntos: 80,
        dia: 1,
        ubicacion: "Entrada",
        estado: "PUBLICADO",
        configuracion: {
          tipoEspecial: "PUNTUALIDAD",
          fechaHoraObjetivo: fechaHoraColombia(new Date(Date.now() - 7 * 60_000)),
          toleranciaMinutos: 5,
        },
      },
    });
    await autenticarParticipante(context, token);
    await page.goto(`/d/${desafio.codigoQr}`);
    await page.getByRole("button", { name: "Registrar mi puntualidad" }).click();

    await expect(page.getByRole("heading", { name: "El tiempo para registrarte terminó" })).toBeVisible();
    await expect(page.getByText(/Desafortunadamente, llegaste \d+ minutos tarde. El registro cerró 5 minutos después/)).toBeVisible();
    await expect(page.getByText("No se registró ninguna completitud.", { exact: true })).toBeVisible();
    expect(await db.completitud.count({ where: { participanteId: participante.id, desafioId: desafio.id } })).toBe(0);
    expect((await db.participante.findUniqueOrThrow({ where: { id: participante.id } })).puntosTotales).toBe(PUNTOS_REGISTRO);
  });
});
