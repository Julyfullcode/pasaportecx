import { expect, test } from "@playwright/test";
import { db } from "@/lib/db";
import { autenticarParticipante, crearParticipanteConToken, fotoPng, iniciarAdmin } from "./ayudas";

test.describe("Administrador", () => {
  test("las vistas y APIs administrativas están protegidas sin autenticación", async ({ page, request }) => {
    await page.goto("/admin/participantes");
    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(page.getByRole("button", { name: "Ingresar" })).toBeVisible();
    expect((await request.get("/api/proyeccion/datos")).status()).toBe(401);
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
