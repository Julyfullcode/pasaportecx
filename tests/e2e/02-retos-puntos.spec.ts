import { expect, test } from "@playwright/test";
import { db } from "@/lib/db";
import { autenticarParticipante, crearParticipanteConToken, contextoApiParticipante, PUNTOS_REGISTRO } from "./ayudas";
import { crearTokenQrPuntualidad } from "@/lib/puntualidad-qr";

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
    expect((await db.participante.findUniqueOrThrow({ where: { id: participante.id } })).puntosTotales).toBe(PUNTOS_REGISTRO + 100);
  });

  test("un código QR mal formado no rompe la app y muestra un error claro", async ({ context, page }) => {
    const { token } = await crearParticipanteConToken({ nombre: `QR inválido ${Date.now()}` });
    await autenticarParticipante(context, token);
    await page.goto("/escanear");
    const contenedorLector = page.locator("#lector-qr");
    await expect(contenedorLector).toBeVisible();
    expect(await contenedorLector.evaluate((elemento) => elemento.clientWidth)).toBeGreaterThan(0);
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
    expect((await db.participante.findUniqueOrThrow({ where: { id: participante.id } })).puntosTotales).toBe(PUNTOS_REGISTRO + 100);
  });

  test("los puntos obtenidos se reflejan en el perfil del participante", async ({ playwright, context, page }) => {
    const { token } = await crearParticipanteConToken({ nombre: `Perfil puntos ${Date.now()}` });
    const api = await contextoApiParticipante(playwright.request, token);
    expect((await api.post("/api/desafios/reto-e2e-100/completar")).status()).toBe(200);
    await api.dispose();
    await autenticarParticipante(context, token);
    await page.goto("/");

    const tarjeta = page.locator("section").filter({ hasText: "Tu puntaje total" }).first();
    await expect(tarjeta.getByText(String(PUNTOS_REGISTRO + 100), { exact: true })).toBeVisible();
  });

  test("Staff completa desafíos pero no recibe puntos ni participa por premios", async ({ playwright, context, page }) => {
    const { participante, token } = await crearParticipanteConToken({
      nombre: `Staff desafío ${Date.now()}`,
      esStaff: true,
    });
    const api = await contextoApiParticipante(playwright.request, token);
    const respuesta = await api.post("/api/desafios/reto-e2e-100/completar");
    expect(respuesta.status()).toBe(200);
    expect(await respuesta.json()).toMatchObject({
      puntosGanados: 0,
      nuevoTotal: 0,
      mensaje: "Tu participación quedó registrada. Como integrante Staff, no participas en el esquema de puntos.",
    });
    const completitud = await db.completitud.findUniqueOrThrow({
      where: { participanteId_desafioId: { participanteId: participante.id, desafioId: "desafio-e2e-100" } },
    });
    expect(completitud.puntosOtorgados).toBe(0);
    expect((await db.participante.findUniqueOrThrow({ where: { id: participante.id } })).puntosTotales).toBe(0);

    await autenticarParticipante(context, token);
    await page.goto("/");
    await expect(page.getByText("Perfil Staff", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Sin participación en ranking", { exact: true })).toBeVisible();
    await api.dispose();
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
    await page.goto(`/d/${desafio.codigoQr}?llegada=${encodeURIComponent(crearTokenQrPuntualidad(desafio.codigoQr))}`);

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
    await page.goto(`/d/${desafio.codigoQr}?llegada=${encodeURIComponent(crearTokenQrPuntualidad(desafio.codigoQr))}`);

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
    await page.goto(`/d/${desafio.codigoQr}?llegada=${encodeURIComponent(crearTokenQrPuntualidad(desafio.codigoQr))}`);

    await expect(page.getByRole("heading", { name: "El tiempo para registrarte terminó" })).toBeVisible();
    await expect(page.getByText(/Desafortunadamente, llegaste \d+ minutos tarde. El registro cerró 5 minutos después/)).toBeVisible();
    await expect(page.getByText("No se registró ninguna completitud.", { exact: true })).toBeVisible();
    expect(await db.completitud.count({ where: { participanteId: participante.id, desafioId: desafio.id } })).toBe(0);
    expect((await db.participante.findUniqueOrThrow({ where: { id: participante.id } })).puntosTotales).toBe(PUNTOS_REGISTRO);
  });

  test("el desafío de puntualidad exige escanear el QR dinámico vigente", async ({ playwright, context, page }) => {
    const marca = Date.now();
    const { participante, token } = await crearParticipanteConToken({ nombre: `QR puntualidad ${marca}` });
    const desafio = await db.desafio.create({
      data: {
        codigoQr: `puntualidad-qr-${marca}`,
        titulo: "Llegada con QR dinámico",
        descripcion: "Escanea el código proyectado.",
        tipo: "CHECK_IN",
        puntos: 60,
        dia: 1,
        ubicacion: "",
        estado: "PUBLICADO",
        configuracion: {
          tipoEspecial: "PUNTUALIDAD",
          fechaHoraObjetivo: fechaHoraColombia(new Date()),
          toleranciaMinutos: 5,
        },
      },
    });
    await autenticarParticipante(context, token);
    await page.goto(`/d/${desafio.codigoQr}`);
    await expect(page.getByRole("heading", { name: "Escanea el QR de llegada" })).toBeVisible();
    await expect(page.locator("#lector-qr")).toBeVisible();
    await expect(page.getByLabel("Ingresar código manualmente")).toHaveCount(0);

    const api = await contextoApiParticipante(playwright.request, token);
    const sinToken = await api.post(`/api/desafios/${desafio.codigoQr}/completar`, { multipart: {} });
    expect(sinToken.status()).toBe(409);
    expect(await sinToken.json()).toMatchObject({ noRegistrado: true });
    expect(await db.completitud.count({ where: { participanteId: participante.id, desafioId: desafio.id } })).toBe(0);
    await api.dispose();
  });

  test("un desafío vencido por minutos rechaza incluso el acceso directo por QR", async ({ playwright }) => {
    const marca = Date.now();
    const { participante, token } = await crearParticipanteConToken({ nombre: `Duración vencida ${marca}` });
    const desafio = await db.desafio.create({
      data: {
        codigoQr: `duracion-vencida-${marca}`,
        titulo: "Desafío con tiempo agotado",
        descripcion: "Solo estuvo disponible cinco minutos.",
        tipo: "CHECK_IN",
        puntos: 70,
        dia: 1,
        ubicacion: "Registro E2E",
        estado: "PUBLICADO",
        duracionMinutos: 5,
        publicadoEn: new Date(Date.now() - 6 * 60_000),
        configuracion: {},
      },
    });
    const api = await contextoApiParticipante(playwright.request, token);
    const respuesta = await api.post(`/api/desafios/${desafio.codigoQr}/completar`);

    expect(respuesta.status()).toBe(409);
    expect(await respuesta.json()).toEqual({ error: "El tiempo de este desafío ya finalizó." });
    expect(await db.completitud.count({ where: { participanteId: participante.id, desafioId: desafio.id } })).toBe(0);
    await api.dispose();
  });
});
