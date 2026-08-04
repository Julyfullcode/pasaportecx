import { expect, test } from "@playwright/test";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { autenticarParticipante, crearParticipanteConToken, fotoPng, iniciarAdmin } from "./ayudas";

test.describe("Administrador", () => {
  test("las vistas y APIs administrativas están protegidas sin autenticación", async ({ page, request, playwright }) => {
    await page.goto("/admin/participantes");
    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(page.getByRole("button", { name: "Ingresar" })).toBeVisible();
    expect((await request.get("/api/proyeccion/datos")).status()).toBe(401);
    const anonimo = await playwright.request.newContext({ baseURL: "http://127.0.0.1:3000" });
    expect((await anonimo.get("/api/ranking")).status()).toBe(401);
    await anonimo.dispose();
  });

  test("la aplicación no expone selección, navegación ni ranking de equipos", async ({ page }) => {
    await page.goto("/registro");
    await expect(page.getByText("Tu equipo", { exact: true })).toHaveCount(0);
    await iniciarAdmin(page);
    await expect(page.getByRole("link", { name: "Equipos", exact: true })).toHaveCount(0);
    const ranking = await page.evaluate(async () => (await fetch("/api/ranking")).json());
    expect(ranking).not.toHaveProperty("equipos");
    const retirada = await page.goto("/admin/proyeccion/equipos");
    expect(retirada?.status()).toBe(404);
  });

  test("el acceso administrativo se bloquea temporalmente tras cinco intentos fallidos", async ({ page }) => {
    const usuario = `admin-bloqueo-${Date.now()}`;
    const password = "Clave-correcta-123!";
    const admin = await db.admin.create({
      data: { usuario, passwordHash: await bcrypt.hash(password, 4) },
    });
    await page.goto("/admin/login");
    for (let intento = 0; intento < 5; intento += 1) {
      await page.getByLabel("Usuario").fill(usuario);
      await page.getByLabel("Contraseña").fill("incorrecta");
      await page.getByRole("button", { name: "Ingresar" }).click();
      await expect(page.getByText("Usuario o contraseña incorrectos.")).toBeVisible();
      if (intento < 4) {
        await expect.poll(async () => (
          await db.admin.findUniqueOrThrow({ where: { id: admin.id } })
        ).intentosFallidos).toBe(intento + 1);
      } else {
        await expect.poll(async () => Boolean((
          await db.admin.findUniqueOrThrow({ where: { id: admin.id } })
        ).bloqueadoHasta)).toBe(true);
      }
    }
    expect((await db.admin.findUniqueOrThrow({ where: { id: admin.id } })).bloqueadoHasta).not.toBeNull();
    await page.getByLabel("Usuario").fill(usuario);
    await page.getByLabel("Contraseña").fill(password);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page.getByText("Demasiados intentos. Intenta nuevamente en unos minutos.")).toBeVisible();
    await db.admin.delete({ where: { id: admin.id } });
  });

  test("un reto creado durante el evento se refleja para participantes al refrescar", async ({ page, browser }) => {
    const titulo = `Reto en caliente ${Date.now()}`;
    const { token } = await crearParticipanteConToken({ nombre: `Participante reto caliente ${Date.now()}` });
    await iniciarAdmin(page);
    await page.goto("/admin/desafios");
    const creador = page.locator("details").first();
    await creador.locator("summary").click();
    await creador.locator('input[name="titulo"]').fill(titulo);
    await creador.locator('textarea[name="descripcion"]').fill("Creado mientras el evento está activo.");
    await creador.locator('select[name="tipo"]').selectOption("CHECK_IN");
    await creador.locator('input[name="puntos"]').fill("175");
    await creador.locator('select[name="dia"]').selectOption("1");
    await creador.locator('select[name="ubicacion"]').selectOption("Registro E2E");
    await creador.locator('select[name="estado"]').selectOption("PUBLICADO");
    await creador.getByRole("button", { name: "Crear desafío y generar QR" }).click();
    await expect(page.getByRole("heading", { name: titulo })).toBeVisible();

    const contextoParticipante = await browser.newContext();
    await autenticarParticipante(contextoParticipante, token);
    const participante = await contextoParticipante.newPage();
    await participante.goto("/desafios");
    await expect(participante.getByRole("heading", { name: titulo })).toBeVisible();
    await contextoParticipante.close();
  });
});

test.describe("Fotos y carrusel", () => {
  test("la subida de una foto de recuerdo funciona correctamente", async ({ context, page }) => {
    const { participante, token } = await crearParticipanteConToken({ nombre: `Recuerdo ${Date.now()}` });
    await autenticarParticipante(context, token);
    await page.goto("/recuerdos?subir=1");
    await page.getByLabel("Elegir fotos").setInputFiles(fotoPng);
    await page.getByLabel("Descripción opcional").fill("Recuerdo automatizado E2E");
    await page.getByRole("button", { name: "Subir fotos pendientes" }).click();

    await expect(page.getByText("Listo", { exact: true })).toBeVisible();
    expect(await db.recuerdo.count({ where: { participanteId: participante.id, descripcion: "Recuerdo automatizado E2E" } })).toBe(1);
  });

  test("el carrusel rota sin errores con al menos 50 participantes", async ({ page }) => {
    const errores: Error[] = [];
    page.on("pageerror", (error) => errores.push(error));
    await iniciarAdmin(page);
    await page.goto("/admin/proyeccion/asistentes");
    const contador = page.getByText(/personas ya están aquí/);
    const texto = await contador.textContent();
    expect(Number(texto?.match(/\d+/)?.[0] ?? 0)).toBeGreaterThanOrEqual(50);
    const antes = await page.locator("article h2").allTextContents();
    expect(antes).toHaveLength(4);
    await page.waitForTimeout(1_300);
    const despues = await page.locator("article h2").allTextContents();
    expect(despues).toHaveLength(4);
    expect(despues).not.toEqual(antes);
    expect(errores).toEqual([]);
  });
});
