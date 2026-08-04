import { expect, test } from "@playwright/test";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { autenticarParticipante, contextoApiParticipante, crearParticipanteConToken, fotoPng, iniciarAdmin } from "./ayudas";

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

  test("la barra lateral abre la invitación de registro en modo presentación", async ({ page }) => {
    await iniciarAdmin(page);
    const invitacion = page.getByRole("link", { name: "Invitar a registrarse" });
    await expect(invitacion).toHaveAttribute("href", "/admin/proyeccion/registro");
    await expect(invitacion).toHaveAttribute("target", "_blank");

    await page.goto("/admin/proyeccion/registro");
    await expect(page.getByRole("heading", { name: "Vive la experiencia" })).toBeVisible();
    await expect(page.getByText("Escanea para registrarte", { exact: true })).toBeVisible();
    await expect(page.getByRole("img", { name: "Código QR para registrarse en Pasaporte CX" })).toHaveAttribute("src", /^data:image\/png;base64,/);
    await expect(page.getByRole("link", { name: "Abrir registro de Pasaporte CX" })).toHaveAttribute("href", /^http:\/\/(?:127\.0\.0\.1|localhost):3000\/registro$/);
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

  test("administración crea un desafío de puntualidad con hora y tolerancia", async ({ page }) => {
    const titulo = `Puntualidad ${Date.now()}`;
    await iniciarAdmin(page);
    await page.goto("/admin/desafios");
    const creador = page.locator("details").first();
    await creador.locator("summary").click();
    await creador.locator('input[name="titulo"]').fill(titulo);
    await creador.locator('textarea[name="descripcion"]').fill("Reconoce a quienes llegan dentro del tiempo acordado.");
    await creador.locator('select[name="tipo"]').selectOption("PUNTUALIDAD");
    await creador.locator('input[name="puntos"]').fill("90");
    await creador.locator('select[name="dia"]').selectOption("1");
    await creador.locator('select[name="ubicacion"]').selectOption("Registro E2E");
    await creador.locator('input[name="fechaHoraObjetivo"]').fill("2026-08-04T14:00");
    await creador.locator('input[name="toleranciaMinutos"]').fill("5");
    await creador.locator('select[name="estado"]').selectOption("PUBLICADO");
    await creador.getByRole("button", { name: "Crear desafío y generar QR" }).click();

    await expect(page.getByRole("heading", { name: titulo })).toBeVisible();
    const guardado = await db.desafio.findFirstOrThrow({ where: { titulo } });
    expect(guardado.tipo).toBe("CHECK_IN");
    expect(guardado.configuracion).toMatchObject({ tipoEspecial: "PUNTUALIDAD", fechaHoraObjetivo: "2026-08-04T14:00", toleranciaMinutos: 5 });
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

  test("una evidencia aprobada aparece en Recuerdos cuando el desafío lo permite", async ({ page, playwright }) => {
    const marca = Date.now();
    const titulo = "Foto para recuerdos " + marca;
    await db.configuracionEvento.update({ where: { id: "evento" }, data: { puntosFotoMasReaccionada: 0 } });
    await iniciarAdmin(page);
    await page.goto("/admin/desafios");
    const creador = page.locator("details").first();
    await creador.locator("summary").click();
    await creador.locator('input[name="titulo"]').fill(titulo);
    await creador.locator('textarea[name="descripcion"]').fill("Evidencia que se publicará después de aprobarse.");
    await creador.locator('select[name="tipo"]').selectOption("EVIDENCIA_FOTO");
    await creador.locator('input[name="puntos"]').fill("80");
    await creador.locator('select[name="dia"]').selectOption("1");
    await creador.locator('select[name="ubicacion"]').selectOption("Registro E2E");
    await creador.locator('input[name="instruccion"]').fill("Toma una fotografía del encuentro.");
    await creador.locator('input[name="publicarEnRecuerdos"]').check();
    await creador.locator('select[name="estado"]').selectOption("PUBLICADO");
    await creador.getByRole("button", { name: "Crear desafío y generar QR" }).click();
    await expect(page.getByRole("heading", { name: titulo })).toBeVisible();

    const desafio = await db.desafio.findFirstOrThrow({ where: { titulo } });
    expect(desafio.configuracion).toMatchObject({ publicarEnRecuerdos: true });
    const { participante, token } = await crearParticipanteConToken({ nombre: "Autor evidencia " + marca });
    const api = await contextoApiParticipante(playwright.request, token);
    const respuesta = await api.post("/api/desafios/" + desafio.codigoQr + "/completar", {
      multipart: { evidencia: fotoPng },
    });
    expect(respuesta.status()).toBe(200);
    const completitud = await db.completitud.findUniqueOrThrow({
      where: { participanteId_desafioId: { participanteId: participante.id, desafioId: desafio.id } },
    });
    expect(completitud.estado).toBe("PENDIENTE");
    expect(await db.recuerdo.count({ where: { claveIdempotencia: "evidencia:" + completitud.id } })).toBe(0);

    await page.goto("/admin/evidencias");
    const tarjeta = page.locator("article").filter({ hasText: titulo });
    await tarjeta.getByRole("button", { name: "Aprobar" }).click();
    await expect.poll(() => db.recuerdo.count({
      where: { claveIdempotencia: "evidencia:" + completitud.id },
    })).toBe(1);
    const recuerdo = await db.recuerdo.findUniqueOrThrow({
      where: { claveIdempotencia: "evidencia:" + completitud.id },
    });
    expect(recuerdo.participanteId).toBe(participante.id);
    expect(recuerdo.visible).toBe(true);
    await api.dispose();
  });

  test("el premio pasa en tiempo real a la foto con más corazones y risas", async ({ playwright }) => {
    const marca = Date.now();
    await db.configuracionEvento.update({ where: { id: "evento" }, data: { puntosFotoMasReaccionada: 300 } });
    const autorA = await crearParticipanteConToken({ nombre: "Autor A " + marca });
    const autorB = await crearParticipanteConToken({ nombre: "Autor B " + marca });
    const reactorA = await crearParticipanteConToken({ nombre: "Reactor A " + marca });
    const reactorB = await crearParticipanteConToken({ nombre: "Reactor B " + marca });
    const fotoA = await db.recuerdo.create({
      data: {
        participanteId: autorA.participante.id,
        urlFoto: "/marca/logo-grupo-epm-oficial.png",
        urlMiniatura: "/marca/logo-grupo-epm-oficial.png",
        descripcion: "Candidata A",
        creadoEn: new Date("2026-01-01T10:00:00Z"),
      },
    });
    const fotoB = await db.recuerdo.create({
      data: {
        participanteId: autorB.participante.id,
        urlFoto: "/marca/logo-grupo-epm-oficial.png",
        urlMiniatura: "/marca/logo-grupo-epm-oficial.png",
        descripcion: "Candidata B",
        creadoEn: new Date("2026-01-01T10:01:00Z"),
      },
    });
    const apiA = await contextoApiParticipante(playwright.request, reactorA.token);
    const apiB = await contextoApiParticipante(playwright.request, reactorB.token);

    expect((await apiA.post("/api/recuerdos/" + fotoA.id + "/reaccion", { data: { tipo: "CORAZON" } })).status()).toBe(200);
    expect((await db.participante.findUniqueOrThrow({ where: { id: autorA.participante.id } })).puntosTotales).toBe(325);
    expect((await apiB.post("/api/recuerdos/" + fotoB.id + "/reaccion", { data: { tipo: "CORAZON" } })).status()).toBe(200);
    expect((await db.participante.findUniqueOrThrow({ where: { id: autorA.participante.id } })).puntosTotales).toBe(325);
    expect((await apiA.post("/api/recuerdos/" + fotoB.id + "/reaccion", { data: { tipo: "RISA" } })).status()).toBe(200);
    expect((await db.participante.findUniqueOrThrow({ where: { id: autorA.participante.id } })).puntosTotales).toBe(25);
    expect((await db.participante.findUniqueOrThrow({ where: { id: autorB.participante.id } })).puntosTotales).toBe(325);
    expect(await db.ajustePuntos.count({ where: { motivo: { startsWith: "Premio foto mas reaccionada: " } } })).toBe(1);
    await Promise.all([apiA.dispose(), apiB.dispose()]);
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
