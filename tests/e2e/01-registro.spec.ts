import { expect, test, type Page } from "@playwright/test";
import { db } from "@/lib/db";
import { autenticarParticipante, BASE_URL, crearParticipanteConToken, EMPRESA_ID, fotoPng, PUNTOS_REGISTRO, registrarPorApi } from "./ayudas";

async function completarCamposBasicos(page: Page, sufijo: string) {
  const correo = `ui-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  await db.correoAutorizado.create({ data: { correo } });
  await page.getByLabel("Correo electrónico").fill(correo);
  await page.getByLabel("Apellidos").fill(sufijo);
  await page.getByLabel("Empresa del Grupo").selectOption(EMPRESA_ID);
  await page.getByLabel(/Tomar foto|Repetir/).setInputFiles(fotoPng);
  await page.getByRole("checkbox", { name: /Autorización de tratamiento de datos personales/ }).check();
  return correo;
}

test.describe("Registro de participante", () => {
  test("la cabecera y el formulario conservan separación en celular y computador", async ({ page }) => {
    for (const viewport of [{ width: 390, height: 844 }, { width: 1365, height: 768 }]) {
      await page.setViewportSize(viewport);
      await page.goto("/registro");
      await expect(page.getByRole("img", { name: "Grupo EPM" })).toHaveAttribute("src", /logo-grupo-epm-blanco/);
      const cabecera = await page.locator("header").boundingBox();
      const nombre = await page.getByText("Nombre", { exact: true }).boundingBox();
      expect(cabecera).not.toBeNull();
      expect(nombre).not.toBeNull();
      expect(nombre!.y - (cabecera!.y + cabecera!.height)).toBeGreaterThanOrEqual(35);
    }
    await expect(page.getByText("Tu pasaporte para conectar, descubrir y sumar durante el encuentro de experiencia y comunicaciones del Grupo EPM.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Crear mi pasaporte" })).toBeVisible();
    await expect(page.getByText("Autorización de tratamiento de datos personales", { exact: true })).toBeVisible();
  });

  test("registro exitoso con nombre, empresa y foto", async ({ page }) => {
    const marca = `Registro exitoso ${Date.now()}`;
    await page.goto("/registro");
    await page.getByLabel("Nombre", { exact: true }).fill(marca);
    const correo = await completarCamposBasicos(page, "E2E");
    const registroCompletado = page.waitForResponse((respuesta) =>
      respuesta.url().endsWith("/api/registro") && respuesta.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Crear mi pasaporte" }).click();
    const respuestaRegistro = await registroCompletado;

    await expect(page.getByRole("heading", { name: `¡${marca} E2E, tu pasaporte está listo!` })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Encuentro de experiencia y comunicaciones" })).toBeVisible();
    await expect(page.getByText("Te damos una cálida bienvenida.", { exact: true })).toBeVisible();
    await expect(page.getByText("Gracias por realizar tu registro y prepárate para vivir una gran experiencia.", { exact: true })).toBeVisible();
    await expect(page.getByText("Conéctate con las actividades, vive el encuentro y aprovecha cada momento para escuchar y aportar.", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Tu pasaporte para conectar, descubrir y sumar durante el encuentro de experiencia y comunicaciones del Grupo EPM.")).toHaveCount(0);
    await expect(page.getByText("Código de recuperación", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("img", { name: /QR personal de recuperación/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Descargar Pasaporte" })).toHaveAttribute("href", /^\/api\/pasaporte\?v=.+#view=Fit$/);
    const tokenSesion = (await respuestaRegistro.headerValue("set-cookie"))?.match(/pasaporte_participante=([^;]+)/)?.[1];
    expect(tokenSesion).toBeTruthy();
    await page.context().addCookies([{ name: "pasaporte_participante", value: tokenSesion!, url: BASE_URL }]);
    const pasaporte = await page.request.get("/api/pasaporte");
    expect(pasaporte.status()).toBe(200);
    expect(pasaporte.headers()["content-type"]).toContain("application/pdf");
    expect(pasaporte.headers()["cache-control"]).toContain("no-store");
    expect((await pasaporte.body()).subarray(0, 4).toString()).toBe("%PDF");
    const participante = await db.participante.findFirstOrThrow({ where: { nombre: `${marca} E2E` }, include: { correoAutorizado: true } });
    expect(participante.puntosTotales).toBe(PUNTOS_REGISTRO);
    expect(participante.correoAutorizado?.correo).toBe(correo);
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
    const correo = `sin-foto-${Date.now()}@example.com`;
    await db.correoAutorizado.create({ data: { correo } });
    await page.goto("/registro");
    await page.getByLabel("Correo electrónico").fill(correo);
    await page.getByLabel("Nombre", { exact: true }).fill("Sin foto");
    await page.getByLabel("Apellidos").fill(`E2E ${Date.now()}`);
    await page.getByLabel("Empresa del Grupo").selectOption(EMPRESA_ID);
    await page.getByRole("checkbox", { name: /Autorización de tratamiento de datos personales/ }).check();
    await page.getByRole("button", { name: "Crear mi pasaporte" }).click();

    await expect(page.getByText("Toma o selecciona una foto para continuar.", { exact: true })).toBeVisible();
    expect(await db.participante.count()).toBe(antes);
  });

  test("un archivo falso declarado como imagen es rechazado por el servidor", async ({ playwright }) => {
    const antes = await db.participante.count();
    const api = await playwright.request.newContext({ baseURL: "http://127.0.0.1:3000" });
    const correo = `imagen-${Date.now()}@example.com`;
    await db.correoAutorizado.create({ data: { correo } });
    const respuesta = await api.post("/api/registro", {
      multipart: {
        correo,
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

  test("un correo no autorizado no puede registrarse", async ({ page }) => {
    const antes = await db.participante.count();
    await page.goto("/registro");
    await page.getByLabel("Correo electrónico").fill(`no-autorizado-${Date.now()}@example.com`);
    await page.getByLabel("Nombre", { exact: true }).fill("Persona");
    await page.getByLabel("Apellidos").fill("No autorizada");
    await page.getByLabel("Empresa del Grupo").selectOption(EMPRESA_ID);
    await page.getByLabel(/Tomar foto|Repetir/).setInputFiles(fotoPng);
    await page.getByRole("checkbox", { name: /Autorización de tratamiento de datos personales/ }).check();
    await page.getByRole("button", { name: "Crear mi pasaporte" }).click();

    await expect(page.getByText("Este correo no está autorizado. Conversa con alguien de la Vicepresidencia Experiencia Usuario-Cliente para solicitar autorización.", { exact: true })).toBeVisible();
    expect(await db.participante.count()).toBe(antes);
  });

  test("un correo autorizado solo puede utilizarse una vez", async ({ playwright }) => {
    const correo = `unico-${Date.now()}@example.com`;
    const api = await playwright.request.newContext({ baseURL: "http://127.0.0.1:3000" });
    const primera = await registrarPorApi(api, "Primer registro", "E2E", correo);
    const segunda = await registrarPorApi(api, "Segundo registro", "E2E", correo);

    expect(primera.status()).toBe(200);
    expect(segunda.status()).toBe(409);
    expect((await segunda.json()).error).toBe("Este correo ya fue registrado en Pasaporte.");
    expect(await db.correoAutorizado.count({ where: { correo, participanteId: { not: null } } })).toBe(1);
    await api.dispose();
  });

  test("el participante edita nombre, apellidos y empresa desde el inicio", async ({ context, page }) => {
    const marca = Date.now();
    const persona = await crearParticipanteConToken({ nombre: `Nombre anterior ${marca}` });
    const empresa = await db.empresa.create({ data: { nombre: `Empresa perfil ${marca}`, orden: 90, activa: true } });
    await autenticarParticipante(context, persona.token);
    await page.goto("/");
    await page.getByRole("button", { name: /Editar mis datos/ }).click();
    await page.getByLabel("Nombre", { exact: true }).fill("Nuevo Nombre");
    await page.getByLabel("Apellidos", { exact: true }).fill("Nuevos Apellidos");
    await page.getByLabel("Empresa del Grupo").selectOption(empresa.id);
    await page.getByRole("button", { name: "Guardar mis datos" }).click();
    await expect(page.getByRole("status")).toContainText("Tus datos quedaron actualizados");
    const actualizado = await db.participante.findUniqueOrThrow({ where: { id: persona.participante.id } });
    expect(actualizado).toMatchObject({ nombre: "Nuevo Nombre Nuevos Apellidos", nombres: "Nuevo Nombre", apellidos: "Nuevos Apellidos", empresaId: empresa.id });
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
