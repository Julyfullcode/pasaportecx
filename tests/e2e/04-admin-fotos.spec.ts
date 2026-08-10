import { expect, test } from "@playwright/test";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { db } from "@/lib/db";
import { CODIGO_DESAFIO_CIERRE, TITULO_DESAFIO_CIERRE } from "@/lib/cosecha-config";
import { fechaHoraColombiaComoFecha, fechaParaInputColombia } from "@/lib/duracion-desafio";
import { esConfiguracionEncuestaMixta } from "@/lib/encuesta-mixta";
import { autenticarParticipante, contextoApiParticipante, crearParticipanteConToken, fotoPng, iniciarAdmin, registrarPorApi } from "./ayudas";

test.describe("Administrador", () => {
  test("las vistas y APIs administrativas están protegidas sin autenticación", async ({ page, request, playwright }) => {
    await page.goto("/admin/participantes");
    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(page.getByRole("button", { name: "Ingresar" })).toBeVisible();
    expect((await request.get("/api/proyeccion/datos")).status()).toBe(401);
    expect((await request.get("/api/proyeccion/cierre")).status()).toBe(401);
    expect((await request.get("/api/proyeccion/desafios/desafio-e2e-100")).status()).toBe(401);
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
    await expect(page.getByRole("img", { name: "Grupo EPM" })).toHaveAttribute("src", /logo-grupo-epm-blanco/);
    const invitacion = page.getByRole("link", { name: "Invitar a registrarse" });
    await expect(invitacion).toHaveAttribute("href", "/admin/proyeccion/registro");
    await expect(invitacion).toHaveAttribute("target", "_blank");

    await page.goto("/admin/proyeccion/registro");
    await expect(page.getByRole("img", { name: "Grupo EPM" })).toHaveAttribute("src", /logo-grupo-epm-blanco/);
    await expect(page.getByRole("heading", { name: "Vive la experiencia" })).toBeVisible();
    await expect(page.getByText("Escanea el código QR y comienza tu recorrido para conectar, descubrir y sumar en el Encuentro de experiencia y comunicaciones.")).toBeVisible();
    await expect(page.getByText("Pasaporte CX", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Vicepresidencia Experiencia Usuario-Cliente", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Escanea para registrarte", { exact: true })).toBeVisible();
    await expect(page.getByRole("img", { name: "Código QR para registrarse en Pasaporte" })).toHaveAttribute("src", /^data:image\/png;base64,/);
    await expect(page.getByRole("link", { name: "Abrir registro de Pasaporte" })).toHaveAttribute("href", /^http:\/\/(?:127\.0\.0\.1|localhost):3000\/registro$/);
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

  test("Participantes administra correos pendientes y registrados", async ({ page, playwright }) => {
    const correo = `autorizado-${Date.now()}@example.com`;
    await iniciarAdmin(page);
    await page.goto("/admin/participantes");
    await page.locator('textarea[name="correos"]').fill(correo);
    await page.getByRole("button", { name: "Autorizar correos" }).click();
    await expect(page.getByRole("status")).toContainText("1 correo quedó autorizado");
    const pendiente = page.locator("article").filter({ hasText: correo });
    await expect(pendiente.getByText("Pendiente de registro", { exact: true })).toBeVisible();

    const api = await playwright.request.newContext({ baseURL: "http://127.0.0.1:3000" });
    expect((await registrarPorApi(api, "Persona autorizada", "E2E", correo)).status()).toBe(200);
    await page.reload();
    const registrado = page.locator("article").filter({ hasText: correo });
    await expect(registrado.getByText("Registrado", { exact: true })).toBeVisible();
    await expect(registrado.getByText("Persona autorizada E2E", { exact: true })).toBeVisible();
    await api.dispose();
  });

  test("Participantes activa y desactiva Staff de forma reversible", async ({ page }) => {
    const persona = await crearParticipanteConToken({
      nombre: `Staff administrable ${Date.now()}`,
      puntos: 700,
    });
    await iniciarAdmin(page);
    await page.goto(`/admin/participantes?q=${encodeURIComponent(persona.participante.nombre)}`);
    const tarjeta = page.locator("article").filter({ hasText: persona.participante.nombre });
    await tarjeta.getByRole("button", { name: "Marcar Staff" }).click();
    await expect(tarjeta.getByText("Staff", { exact: true }).first()).toBeVisible();
    await expect.poll(async () => (
      await db.participante.findUniqueOrThrow({ where: { id: persona.participante.id } })
    ).puntosTotales).toBe(0);

    const [reporteParticipantes, reporteRanking] = await page.evaluate(async () => Promise.all([
      fetch("/api/reportes/participantes").then((respuesta) => respuesta.text()),
      fetch("/api/reportes/ranking-individual").then((respuesta) => respuesta.text()),
    ]));
    expect(reporteParticipantes).toContain(persona.participante.nombre);
    expect(reporteRanking).not.toContain(persona.participante.nombre);

    await tarjeta.getByRole("button", { name: "Quitar Staff" }).click();
    await expect(tarjeta.getByRole("button", { name: "Marcar Staff" })).toBeVisible();
    await expect.poll(async () => (
      await db.participante.findUniqueOrThrow({ where: { id: persona.participante.id } })
    ).puntosTotales).toBe(700);
  });

  test("un reto permanente aparece únicamente en la categoría Permanentes", async ({ page, browser }) => {
    const titulo = `Reto en caliente ${Date.now()}`;
    const { token } = await crearParticipanteConToken({ nombre: `Participante reto caliente ${Date.now()}` });
    await iniciarAdmin(page);
    await page.goto("/admin/desafios");
    const creador = page.locator("details").first();
    await creador.locator("summary").click();
    expect(await creador.locator('select[name="dia"] option').allTextContents()).toEqual([
      "Día 1", "Día 2", "Permanentes",
    ]);
    await creador.locator('input[name="titulo"]').fill(titulo);
    await creador.locator('textarea[name="descripcion"]').fill("Creado mientras el evento está activo.");
    await creador.locator('select[name="tipo"]').selectOption("CHECK_IN");
    await creador.locator('input[name="puntos"]').fill("175");
    await creador.locator('select[name="dia"]').selectOption("0");
    await expect(creador.locator('select[name="ubicacion"]')).toHaveCount(0);
    await creador.locator('input[name="duracionMinutos"]').fill("20");
    await creador.locator('select[name="estado"]').selectOption("PUBLICADO");
    await creador.getByRole("button", { name: "Crear desafío y generar QR" }).click();
    await expect(page.getByRole("heading", { name: titulo })).toBeVisible();
    const guardado = await db.desafio.findFirstOrThrow({ where: { titulo } });
    expect(guardado.dia).toBe(0);
    expect(guardado.duracionMinutos).toBe(20);
    expect(guardado.publicadoEn).not.toBeNull();

    const contextoParticipante = await browser.newContext();
    await autenticarParticipante(contextoParticipante, token);
    const participante = await contextoParticipante.newPage();
    await participante.goto("/desafios");
    await expect(participante.getByRole("link", { name: "Día 1", exact: true })).toBeVisible();
    await expect(participante.getByRole("link", { name: "Día 2", exact: true })).toBeVisible();
    await expect(participante.getByRole("link", { name: "Permanentes", exact: true })).toBeVisible();
    await expect(participante.getByRole("heading", { name: titulo })).toHaveCount(0);
    await participante.getByRole("link", { name: "Permanentes", exact: true }).click();
    const tarjetaPermanente = participante.getByRole("link").filter({ hasText: titulo });
    await expect(tarjetaPermanente.getByRole("heading", { name: titulo })).toBeVisible();
    await expect(tarjetaPermanente).toContainText("Permanente");
    await participante.goto("/desafios?dia=2");
    await expect(participante.getByRole("heading", { name: titulo })).toHaveCount(0);
    await contextoParticipante.close();
  });

  test("cada desafío ofrece una presentación de avance, respuestas, puntos y tiempo", async ({ page }) => {
    const marca = Date.now();
    const persona = await crearParticipanteConToken({ nombre: `Avance desafío ${marca}` });
    const desafio = await db.desafio.create({
      data: {
        codigoQr: `avance-desafio-${marca}`,
        titulo: `Seguimiento en vivo ${marca}`,
        descripcion: "Permite revisar el avance en modo presentación.",
        tipo: "CHECK_IN",
        puntos: 85,
        dia: 1,
        ubicacion: "",
        estado: "PUBLICADO",
        publicadoEn: new Date(),
        duracionMinutos: 10,
        configuracion: {},
      },
    });
    await db.completitud.create({
      data: {
        participanteId: persona.participante.id,
        desafioId: desafio.id,
        puntosOtorgados: 85,
        estado: "APROBADO",
      },
    });

    await iniciarAdmin(page);
    await page.goto("/admin/desafios");
    await expect(page.getByText("Gestión en caliente", { exact: true })).toHaveCount(0);
    await expect(page.getByText("El desafío de cierre ya está creado", { exact: true })).toHaveCount(0);
    const tarjeta = page.locator("article").filter({ hasText: desafio.titulo });
    const avance = tarjeta.getByRole("link", { name: "Ver avance" });
    await expect(avance).toHaveAttribute("href", `/admin/proyeccion/desafios/${desafio.id}`);
    const editar = await tarjeta.getByText("Editar", { exact: true }).boundingBox();
    const cerrar = await tarjeta.getByRole("button", { name: "Cerrar", exact: true }).boundingBox();
    expect(Math.abs((editar?.y ?? 0) - (cerrar?.y ?? 0))).toBeLessThanOrEqual(3);

    await page.goto(`/admin/proyeccion/desafios/${desafio.id}`);
    await expect(page.getByRole("heading", { name: new RegExp(desafio.titulo) })).toBeVisible();
    const participante = page.locator("article").filter({ hasText: persona.participante.nombre });
    await expect(participante).toContainText("Respondió");
    await expect(participante).toContainText("+85");
    const tiempo = page.locator("section").filter({ hasText: "Tiempo restante" }).first();
    await expect(tiempo).toContainText(/\d+m \d{2}s/);

    const datos = await page.evaluate(async (id) => (
      await fetch(`/api/proyeccion/desafios/${id}`, { cache: "no-store" })
    ).json(), desafio.id);
    expect(datos.resumen.respondieron).toBeGreaterThanOrEqual(1);
    expect(datos.resumen.puntosOtorgados).toBeGreaterThanOrEqual(85);
  });

  test("un error al guardar un desafío se muestra en el formulario sin tumbar la página", async ({ page }) => {
    await iniciarAdmin(page);
    await page.goto("/admin/desafios");
    const creador = page.locator("details").first();
    await creador.locator("summary").click();
    await creador.locator('input[name="titulo"]').fill("Duración inválida controlada");
    await creador.locator('textarea[name="descripcion"]').fill("Comprueba la recuperación del formulario.");
    await creador.locator('select[name="tipo"]').selectOption("CHECK_IN");
    await creador.locator('select[name="dia"]').selectOption("0");
    const minutos = creador.locator('input[name="duracionMinutos"]');
    await minutos.evaluate((campo) => campo.removeAttribute("min"));
    await minutos.fill("0");
    await creador.getByRole("button", { name: "Crear desafío y generar QR" }).click();

    await expect(creador.getByRole("status")).toHaveText("Configura una duración válida en minutos.");
    await expect(page.getByRole("heading", { name: "Desafíos", level: 1 })).toBeVisible();
    await expect(page.getByText(/Application error/i)).toHaveCount(0);
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
    await creador.locator('input[name="fechaHoraObjetivo"]').fill("2026-08-04T14:00");
    await creador.locator('input[name="toleranciaMinutos"]').fill("5");
    await creador.locator('select[name="estado"]').selectOption("PUBLICADO");
    await creador.getByRole("button", { name: "Crear desafío y generar QR" }).click();

    await expect(page.getByRole("heading", { name: titulo })).toBeVisible();
    const guardado = await db.desafio.findFirstOrThrow({ where: { titulo } });
    expect(guardado.tipo).toBe("CHECK_IN");
    expect(guardado.configuracion).toMatchObject({ tipoEspecial: "PUNTUALIDAD", fechaHoraObjetivo: "2026-08-04T14:00", toleranciaMinutos: 5 });
    const tarjeta = page.locator("article").filter({ hasText: titulo });
    await expect(tarjeta.getByRole("link", { name: "Proyectar QR dinámico" })).toHaveAttribute("href", `/admin/proyeccion/puntualidad/${guardado.id}`);
    await page.goto(`/admin/proyeccion/desafios/${guardado.id}`);
    await expect(page).toHaveURL(`/admin/proyeccion/puntualidad/${guardado.id}`);
    const qr = page.getByRole("img", { name: "Código QR dinámico para registrar la llegada a tiempo" });
    await expect(qr).toBeVisible();
    const primero = await qr.getAttribute("src");
    await expect.poll(async () => qr.getAttribute("src"), { timeout: 20_000 }).not.toBe(primero);
  });

  test("administración configura el cierre del desafío con fecha y hora de Colombia", async ({ page }) => {
    const titulo = `Cierre fijo ${Date.now()}`;
    const cierreInput = fechaParaInputColombia(new Date(Date.now() + 2 * 60 * 60_000));
    await iniciarAdmin(page);
    await page.goto("/admin/desafios");
    const creador = page.locator("details").first();
    await creador.locator("summary").click();
    await creador.locator('input[name="titulo"]').fill(titulo);
    await creador.locator('textarea[name="descripcion"]').fill("Disponible hasta una fecha y hora exactas.");
    await creador.locator('select[name="tipo"]').selectOption("CHECK_IN");
    await creador.locator('input[name="puntos"]').fill("40");
    await creador.locator('select[name="dia"]').selectOption("1");
    await creador.locator('select[name="modoDuracion"]').selectOption("FECHA_HORA");
    await creador.locator('input[name="fechaHoraCierre"]').fill(cierreInput);
    await creador.locator('select[name="estado"]').selectOption("PUBLICADO");
    await creador.getByRole("button", { name: "Crear desafío y generar QR" }).click();

    await expect(page.getByRole("heading", { name: titulo })).toBeVisible();
    const guardado = await db.desafio.findFirstOrThrow({ where: { titulo } });
    expect(guardado.duracionMinutos).toBeNull();
    expect(guardado.disponibleHasta?.toISOString()).toBe(fechaHoraColombiaComoFecha(cierreInput).toISOString());
  });

  test("editar un campo conserva tipo, duración e instrucciones sin cambios", async ({ page }) => {
    const marca = Date.now();
    const cierre = new Date("2026-08-10T20:15:00.000Z");
    const desafio = await db.desafio.create({
      data: {
        codigoQr: `edicion-segura-${marca}`,
        titulo: `Edición segura ${marca}`,
        descripcion: "Descripción original",
        tipo: "EVIDENCIA_FOTO",
        puntos: 75,
        dia: 1,
        ubicacion: "",
        estado: "BORRADOR",
        duracionMinutos: null,
        disponibleHasta: cierre,
        configuracion: { instruccion: "Conserva esta instrucción", publicarEnRecuerdos: true },
      },
    });
    await iniciarAdmin(page);
    await page.goto("/admin/desafios");
    const tarjeta = page.locator("article").filter({ hasText: desafio.titulo });
    await tarjeta.getByText("Editar", { exact: true }).click();
    const formulario = tarjeta.locator("details form").last();
    await formulario.locator('textarea[name="descripcion"]').fill("Solo cambia esta descripción");
    await formulario.getByRole("button", { name: "Guardar cambios" }).click();
    await expect.poll(async () => (await db.desafio.findUniqueOrThrow({ where: { id: desafio.id } })).descripcion).toBe("Solo cambia esta descripción");
    const guardado = await db.desafio.findUniqueOrThrow({ where: { id: desafio.id } });
    expect(guardado.tipo).toBe("EVIDENCIA_FOTO");
    expect(guardado.puntos).toBe(75);
    expect(guardado.duracionMinutos).toBeNull();
    expect(guardado.disponibleHasta?.toISOString()).toBe(cierre.toISOString());
    expect(guardado.configuracion).toMatchObject({ instruccion: "Conserva esta instrucción", publicarEnRecuerdos: true });
  });

  test("crea, responde y edita una encuesta de satisfacción mixta", async ({ page }) => {
    const marca = Date.now();
    const titulo = `Encuesta mixta ${marca}`;
    await iniciarAdmin(page);
    await page.goto("/admin/desafios");
    const creador = page.locator("details").first();
    await creador.locator("summary").click();
    await creador.locator('input[name="titulo"]').fill(titulo);
    await creador.locator('textarea[name="descripcion"]').fill("Tu opinión nos ayudará a mejorar los próximos encuentros.");
    await creador.locator('select[name="tipo"]').selectOption("ENCUESTA_MIXTA");
    await expect(creador.getByText("Preguntas de la encuesta mixta", { exact: true })).toBeVisible();
    await expect(creador.getByRole("button", { name: "Agregar escala 0–10" })).toBeVisible();
    await expect(creador.getByRole("button", { name: "Agregar matriz 0–10" })).toBeVisible();
    await expect(creador.getByRole("button", { name: "Agregar respuesta abierta" })).toBeVisible();
    await creador.locator('input[name="puntos"]').fill("55");
    await creador.locator('select[name="dia"]').selectOption("0");
    await creador.locator('input[name="duracionMinutos"]').fill("45");
    await creador.locator('select[name="estado"]').selectOption("PUBLICADO");
    await creador.getByRole("button", { name: "Crear desafío y generar QR" }).click();
    await expect(page.getByRole("heading", { name: titulo })).toBeVisible();

    const desafio = await db.desafio.findFirstOrThrow({ where: { titulo } });
    expect(desafio.tipo).toBe("ENCUESTA");
    expect(desafio.puntos).toBe(55);
    expect(desafio.dia).toBe(0);
    expect(desafio.duracionMinutos).toBe(45);
    expect(esConfiguracionEncuestaMixta(desafio.configuracion)).toBe(true);
    if (!esConfiguracionEncuestaMixta(desafio.configuracion)) throw new Error("Configuración mixta inválida");
    const preguntas = desafio.configuracion.preguntas;
    expect(preguntas.map((pregunta) => pregunta.tipo)).toEqual(["ESCALA_0_10", "MATRIZ_0_10", "ABIERTA", "ABIERTA"]);

    const { participante, token } = await crearParticipanteConToken({ nombre: `Encuestado ${marca}` });
    await autenticarParticipante(page.context(), token);
    await page.goto(`/d/${desafio.codigoQr}`);
    await page.getByLabel(`${preguntas[0].titulo}: 9`).evaluate((campo: HTMLInputElement) => campo.click());
    for (const elemento of preguntas[1].elementos) {
      await page.getByLabel(`${preguntas[1].titulo}: ${elemento.texto}: 8`).evaluate((campo: HTMLInputElement) => campo.click());
    }
    await page.getByLabel(preguntas[2].titulo).fill("Las conversaciones y aprendizajes compartidos.");
    await page.getByLabel(preguntas[3].titulo).fill("Dejar más tiempo para la conversación final.");
    await page.getByRole("button", { name: "Enviar respuesta" }).click();
    await expect(page.getByText("¡Desafío completado!")).toBeVisible();
    const completitud = await db.completitud.findUniqueOrThrow({
      where: { participanteId_desafioId: { participanteId: participante.id, desafioId: desafio.id } },
    });
    expect(completitud.puntosOtorgados).toBe(55);
    expect(completitud.respuesta).toMatchObject({
      formato: "mixta",
      respuestas: {
        [preguntas[0].id]: 9,
        [preguntas[2].id]: "Las conversaciones y aprendizajes compartidos.",
      },
    });
    expect((await db.participante.findUniqueOrThrow({ where: { id: participante.id } })).puntosTotales).toBe(65);

    await page.goto("/admin/desafios");
    const tarjeta = page.locator("article").filter({ hasText: titulo });
    await tarjeta.getByText("Editar", { exact: true }).click();
    const formulario = tarjeta.locator("details form").last();
    await formulario.locator('textarea[name="descripcion"]').fill("Solo se modificó esta introducción.");
    await formulario.getByRole("button", { name: "Guardar cambios" }).click();
    await expect.poll(async () => (await db.desafio.findUniqueOrThrow({ where: { id: desafio.id } })).descripcion).toBe("Solo se modificó esta introducción.");
    const editado = await db.desafio.findUniqueOrThrow({ where: { id: desafio.id } });
    expect(editado.tipo).toBe("ENCUESTA");
    expect(editado.duracionMinutos).toBe(45);
    expect(editado.puntos).toBe(55);
    expect(editado.configuracion).toEqual(desafio.configuracion);
  });

  test("el desafío de cierre ofrece una presentación que rota las tarjetas", async ({ page }) => {
    const marca = Date.now();
    const desafio = await db.desafio.upsert({
      where: { codigoQr: CODIGO_DESAFIO_CIERRE },
      update: { estado: "PUBLICADO", duracionMinutos: 60, publicadoEn: new Date(), disponibleHasta: null },
      create: {
        codigoQr: CODIGO_DESAFIO_CIERRE,
        titulo: TITULO_DESAFIO_CIERRE,
        descripcion: "Cosecha del encuentro.",
        tipo: "ENCUESTA",
        puntos: 150,
        dia: 1,
        ubicacion: "Registro E2E",
        estado: "PUBLICADO",
        duracionMinutos: 60,
        publicadoEn: new Date(),
        configuracion: { formato: "cosecha" },
      },
    });
    const primera = await crearParticipanteConToken({ nombre: `Cosecha primera ${marca}` });
    const segunda = await crearParticipanteConToken({ nombre: `Cosecha segunda ${marca}` });
    await db.completitud.createMany({
      data: [
        {
          participanteId: primera.participante.id,
          desafioId: desafio.id,
          puntosOtorgados: 150,
          estado: "APROBADO",
          completadoEn: new Date(Date.now() - 60_000),
          respuesta: { meLlevo: "Aprendizaje uno", agradezco: "Conversación uno", activo: "Acción uno" },
        },
        {
          participanteId: segunda.participante.id,
          desafioId: desafio.id,
          puntosOtorgados: 150,
          estado: "APROBADO",
          completadoEn: new Date(),
          respuesta: { meLlevo: "Aprendizaje dos", agradezco: "Conversación dos", activo: "Acción dos" },
        },
      ],
    });

    await iniciarAdmin(page);
    await page.goto("/admin/desafios");
    const tarjetaCierre = page.locator("article").filter({ hasText: TITULO_DESAFIO_CIERRE });
    await expect(tarjetaCierre.getByRole("link", { name: "Proyectar tarjetas" })).toHaveAttribute("href", "/admin/proyeccion/cierre");
    await page.goto("/admin/proyeccion/cierre");
    await expect(page.getByText(`Cosecha segunda ${marca}`)).toBeVisible();
    await expect(page.getByText("Aprendizaje dos", { exact: true })).toBeVisible();
    await expect(page.getByText(`Cosecha primera ${marca}`)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Aprendizaje uno", { exact: true })).toBeVisible();
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
    await creador.locator('input[name="instruccion"]').fill("Toma una fotografía del encuentro.");
    await creador.locator('input[name="publicarEnRecuerdos"]').check();
    await creador.locator('select[name="estado"]').selectOption("PUBLICADO");
    await creador.getByRole("button", { name: "Crear desafío y generar QR" }).click();
    await expect(page.getByRole("heading", { name: titulo })).toBeVisible();

    const desafio = await db.desafio.findFirstOrThrow({ where: { titulo } });
    expect(desafio.configuracion).toMatchObject({ publicarEnRecuerdos: true });
    const { participante, token } = await crearParticipanteConToken({ nombre: "Autor evidencia " + marca });
    await autenticarParticipante(page.context(), token);
    await page.goto("/d/" + desafio.codigoQr);
    await expect(page.getByLabel("Comentario (opcional)")).toBeVisible();
    const tomarFoto = page.getByRole("button", { name: "Abrir cámara" });
    const galeria = page.getByLabel("Elegir de la galería");
    await expect(tomarFoto).toBeVisible();
    await expect(page.getByText("Abre la cámara del celular o la cámara web del computador.")).toBeVisible();
    await expect(galeria).toHaveAttribute("accept", "image/*");
    await expect(galeria).not.toHaveAttribute("capture", /.+/);
    await expect(page.getByText("Puedes usar la foto original; Pasaporte la comprime y optimiza automáticamente.")).toBeVisible();
    const fotoPesada = await sharp(randomBytes(1_400 * 1_000 * 3), {
      raw: { width: 1_400, height: 1_000, channels: 3 },
    }).png({ compressionLevel: 0 }).toBuffer();
    expect(fotoPesada.byteLength).toBeGreaterThan(800_000);
    const comentario = "Una conversación que vale la pena recordar";
    const api = await contextoApiParticipante(playwright.request, token);
    const respuesta = await api.post("/api/desafios/" + desafio.codigoQr + "/completar", {
      multipart: {
        evidencia: { name: "evidencia-grande.png", mimeType: "image/png", buffer: fotoPesada },
        comentario,
      },
    });
    expect(respuesta.status()).toBe(200);
    const completitud = await db.completitud.findUniqueOrThrow({
      where: { participanteId_desafioId: { participanteId: participante.id, desafioId: desafio.id } },
    });
    expect(completitud.estado).toBe("PENDIENTE");
    expect(completitud.urlEvidencia).toMatch(/\.webp$/);
    expect(completitud.respuesta).toMatchObject({ comentario });
    expect(await db.recuerdo.count({ where: { claveIdempotencia: "evidencia:" + completitud.id } })).toBe(0);

    await page.goto("/admin/evidencias");
    const tarjeta = page.locator("article").filter({ hasText: titulo });
    await expect(tarjeta.getByText(`“${comentario}”`)).toBeVisible();
    await tarjeta.getByRole("button", { name: "Aprobar" }).click();
    await expect.poll(() => db.recuerdo.count({
      where: { claveIdempotencia: "evidencia:" + completitud.id },
    })).toBe(1);
    const recuerdo = await db.recuerdo.findUniqueOrThrow({
      where: { claveIdempotencia: "evidencia:" + completitud.id },
    });
    expect(recuerdo.participanteId).toBe(participante.id);
    expect(recuerdo.visible).toBe(true);
    expect(recuerdo.descripcion).toBe(comentario);
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
    expect((await db.participante.findUniqueOrThrow({ where: { id: autorA.participante.id } })).puntosTotales).toBe(310);
    expect((await apiB.post("/api/recuerdos/" + fotoB.id + "/reaccion", { data: { tipo: "CORAZON" } })).status()).toBe(200);
    expect((await db.participante.findUniqueOrThrow({ where: { id: autorA.participante.id } })).puntosTotales).toBe(310);
    expect((await apiA.post("/api/recuerdos/" + fotoB.id + "/reaccion", { data: { tipo: "RISA" } })).status()).toBe(200);
    expect((await db.participante.findUniqueOrThrow({ where: { id: autorA.participante.id } })).puntosTotales).toBe(10);
    expect((await db.participante.findUniqueOrThrow({ where: { id: autorB.participante.id } })).puntosTotales).toBe(310);
    expect(await db.ajustePuntos.count({ where: { motivo: { startsWith: "Premio foto mas reaccionada: " } } })).toBe(1);
    await db.participante.update({ where: { id: autorB.participante.id }, data: { esStaff: true } });
    expect((await apiB.post("/api/recuerdos/" + fotoA.id + "/reaccion", { data: { tipo: "RISA" } })).status()).toBe(200);
    expect((await db.participante.findUniqueOrThrow({ where: { id: autorA.participante.id } })).puntosTotales).toBe(310);
    expect((await db.participante.findUniqueOrThrow({ where: { id: autorB.participante.id } })).puntosTotales).toBe(0);
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
