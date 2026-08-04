import { expect, test, type Page } from "@playwright/test";
import { db } from "@/lib/db";
import { EMPRESA_ID, fotoPng, GRUPO_ID, PUNTOS_REGISTRO, registrarPorApi } from "./ayudas";

async function completarCamposBasicos(page: Page, sufijo: string) {
  await page.getByLabel("Apellidos").fill(sufijo);
  await page.getByLabel("Empresa del Grupo").selectOption(EMPRESA_ID);
  await page.getByRole("radio", { name: /Equipo Aurora/ }).check({ force: true });
  await page.getByLabel(/Tomar foto|Repetir/).setInputFiles(fotoPng);
  await page.getByRole("checkbox", { name: /Autorización de datos/ }).check();
}

test.describe("Registro de participante", () => {
  test("registro exitoso con nombre y foto, asignado al equipo elegido", async ({ page }) => {
    const marca = `Registro exitoso ${Date.now()}`;
    await page.goto("/registro");
    await page.getByLabel("Nombre", { exact: true }).fill(marca);
    await completarCamposBasicos(page, "E2E");
    await page.getByRole("button", { name: "Crear mi pasaporte" }).click();

    await expect(page.getByText("¡Tu pasaporte está listo!")).toBeVisible();
    await expect(page.getByText(/Equipo Aurora/).first()).toBeVisible();
    const participante = await db.participante.findFirstOrThrow({ where: { nombre: `${marca} E2E` } });
    expect(participante.grupoId).toBe(GRUPO_ID);
    expect(participante.puntosTotales).toBe(PUNTOS_REGISTRO);
  });

  test("registro con nombre vacío es rechazado por validación", async ({ page }) => {
    const antes = await db.participante.count();
    await page.goto("/registro");
    await completarCamposBasicos(page, `Vacío ${Date.now()}`);
    await page.getByRole("button", { name: "Crear mi pasaporte" }).click();

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
    await page.getByRole("radio", { name: /Equipo Aurora/ }).check({ force: true });
    await page.getByRole("checkbox", { name: /Autorización de datos/ }).check();
    await page.getByRole("button", { name: "Crear mi pasaporte" }).click();

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
        grupoId: GRUPO_ID,
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
