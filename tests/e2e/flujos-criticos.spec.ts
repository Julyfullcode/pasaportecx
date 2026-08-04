import { expect, test, type Page } from "@playwright/test";

const foto = {
  name: "foto.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  ),
};

async function registrar(page: Page, sufijo: string, ruta = "/registro") {
  await page.goto(ruta);
  await page.getByLabel("Nombre").fill("Persona E2E");
  await page.getByLabel("Apellidos").fill(sufijo);
  await page.getByLabel("Empresa del Grupo").selectOption({ index: 1 });
  const equipo = page.getByRole("radio", { name: /Equipo/ }).first();
  if (await equipo.count()) await equipo.check({ force: true });
  await page.getByLabel(/Tomar foto|Repetir/).setInputFiles(foto);
  await page.getByRole("checkbox", { name: /Autorización de datos/ }).check();
  await page.getByRole("button", { name: "Crear mi pasaporte" }).click();
  await expect(page.getByText("¡Tu pasaporte está listo!")).toBeVisible();
  await page.getByRole("button", { name: "Entrar al encuentro" }).click();
}

test("registro con empresa, grupo y foto", async ({ page }) => {
  await registrar(page, `registro-${Date.now()}`, "/registro?destino=%2Fdesafios");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText("Tu puntaje total")).toBeVisible();
  await expect(page.getByText(/Equipo 1/).first()).toBeVisible();
});

test("ingreso manual de QR y check-in idempotente", async ({ page }) => {
  await registrar(page, `scan-${Date.now()}`);
  await page.goto("/escanear");
  await page.getByLabel("Ingresar código manualmente").fill("bienvenida-cx");
  await page.getByRole("button", { name: "Abrir" }).click();
  await expect(page.getByText("¡Desafío completado!")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("+100")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Ya completaste este desafío")).toBeVisible();
});

test("subida de un recuerdo", async ({ page }) => {
  await registrar(page, `recuerdo-${Date.now()}`);
  await page.goto("/recuerdos?subir=1");
  await page.getByLabel("Elegir fotos").setInputFiles(foto);
  await page.getByLabel("Descripción opcional").fill("Recuerdo automatizado");
  await page.getByRole("button", { name: "Subir fotos pendientes" }).click();
  await expect(page.getByText("Listo")).toBeVisible();
});
