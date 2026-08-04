import { expect, test, type Page } from "@playwright/test";
import { db } from "@/lib/db";
import { EMPRESA_ID, fotoPng, PUNTOS_REGISTRO, registrarPorApi } from "./ayudas";

async function completarCamposBasicos(page: Page, sufijo: string) {
  await page.getByLabel("Apellidos").fill(sufijo);
  await page.getByLabel("Empresa del Grupo").selectOption(EMPRESA_ID);
  await page.getByLabel(/Tomar foto|Repetir/).setInputFiles(fotoPng);
  await page.getByRole("checkbox", { name: /Autorización de tratamiento de datos personales/ }).check();
}

test.describe("Registro de participante", () => {
  test("la cabecera y el formulario conservan separación en celular y computador", async ({ page }) => {
    for (const viewport of [{ width: 390, height: 844 }, { width: 1365, height: 768 }]) {
      await page.setViewportSize(viewport);
      await page.goto("/registro");
      const cabecera = await page.locator("header").boundingBox();
      const nombre = await page.getByText("Nombre", { exact: true }).boundingBox();
      expect(cabecera).not.toBeNull();
      expect(nombre).not.toBeNull();
      expect(nombre!.y - (cabecera!.y + cabecera!.height)).toBeGreaterThanOrEqual(35);
    }
    await expect(page.getByText("Tu pasaporte para conectar, descubrir y sumar durante el encuentro de experiencia y comunicaciones del Grupo EPM.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Crear mi pasaporte CX" })).toBeVisible();
    await expect(page.getByText("Autorización de tratamiento de datos personales", { exact: true })).toBeVisible();
  });

  test("registro exitoso con nombre, empresa y foto", async ({ page }) => {
    const marca = `Registro exitoso ${Date.now()}`;
    await page.goto("/registro");
    await page.getByLabel("Nombre", { exact: true }).fill(marca);
    await completarCamposBasicos(page, "E2E");
    await page.getByRole("button", { name: "Crear mi pasaporte CX" }).click();

    await expect(page.getByText("¡Tu pasaporte está listo!")).toBeVisible();
    const participante = await db.participante.findFirstOrThrow({ where: { nombre: `${marca} E2E` } });
    expect(participante.puntosTotales).toBe(PUNTOS_REGISTRO);
  });

  test("registro con nombre vacío es rechazado por validación", async ({ page }) => {
    const antes = await db.participante.count();
    await page.goto("/registro");
    await completarCamposBasicos(page, `Vacío ${Date.now()}`);
    await page.getByRole("button", { name: "Crear mi pasaporte CX" }).click();

    await expect(page).toHaveURL(/\/registro/);
    const mensaje = await page.getByLabel("Nombre", { exact: true }).evaluate((campo: HTMLInputElement) => campo.validationMessage);
    expect(mensaje.length).toBeGreaterThan(0);
    expect(await db.participante.count()).toBe(antes);
  });

  test("registro sin foto es rechazado con un mensaje claro", async ({ page }) => {
    const antes = await db.participante.count();
    await page.goto("/registro");
    await page.getByLabel("Nombre", { exact: true }).fill("Sin foto");
    await page.getByLabel("Apellidos").fill(`E2E ${Date.now()}`);
    await page.getByLabel("Empresa del Grupo").selectOption(EMPRESA_ID);
    await page.getByRole("checkbox", { name: /Autorización de tratamiento de datos personales/ }).check();
    await page.getByRole("button", { name: "Crear mi pasaporte CX" }).click();

    await expect(page.getByText("Toma o selecciona una foto para continuar.", { exact: true })).toBeVisible();
    expect(await db.participante.count()).toBe(antes);
  });

  test("un archivo falso declarado como imagen es rechazado por el servidor", async ({ playwright }) => {
    const antes = await db.participante.count();
    const api = await playwright.request.newContext({ baseURL: "http://127.0.0.1:3000" });
    const respuesta = await api.post("/api/registro", {
      multipart: {
        nombres: "Imagen",
        apellidos: `Falsa ${Date.now()}`,
        empresaId: EMPRESA_ID,
        aceptaDatos: "on",
        foto: { name: "falsa.png", mimeType: "image/png", buffer: Buffer.from("esto no es una imagen") },
      },
    });
    expect(respuesta.status()).toBe(400);
    expect((await respuesta.json()).error).toContain("imagen válida");
    expect(await db.participante.count()).toBe(antes);
    await api.dispose();
  });

  test("dos altas con el mismo nombre crean pasaportes distintos", async ({ playwright }) => {
    const nombre = `Nombre repetido ${Date.now()}`;
    const apiUno = await playwright.request.newContext({ baseURL: "http://127.0.0.1:3000" });
    const apiDos = await playwright.request.newContext({ baseURL: "http://127.0.0.1:3000" });
    const [respuestaUno, respuestaDos] = await Promise.all([
      registrarPorApi(apiUno, nombre, "Duplicado"),
      registrarPorApi(apiDos, nombre, "Duplicado"),
    ]);
    expect(respuestaUno.status()).toBe(200);
    expect(respuestaDos.status()).toBe(200);
    const [uno, dos] = await Promise.all([respuestaUno.json(), respuestaDos.json()]);
    expect(uno.participante.codigoRecuperacion).not.toBe(dos.participante.codigoRecuperacion);
    expect(await db.participante.count({ where: { nombre: `${nombre} Duplicado` } })).toBe(2);
    await Promise.all([apiUno.dispose(), apiDos.dispose()]);
  });
});
