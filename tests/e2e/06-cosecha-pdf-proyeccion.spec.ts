import { expect, test } from "@playwright/test";
import { db } from "@/lib/db";
import { CODIGO_DESAFIO_CIERRE, TITULO_DESAFIO_CIERRE } from "@/lib/cosecha-config";
import { contextoApiParticipante, crearParticipanteConToken, iniciarAdmin } from "./ayudas";

async function asegurarDesafioCierre() {
  return db.desafio.upsert({
    where: { codigoQr: CODIGO_DESAFIO_CIERRE },
    update: {},
    create: {
      codigoQr: CODIGO_DESAFIO_CIERRE,
      titulo: TITULO_DESAFIO_CIERRE,
      descripcion: "Cosecha del encuentro.",
      tipo: "ENCUESTA",
      puntos: 150,
      dia: 1,
      ubicacion: "",
      estado: "PUBLICADO",
      duracionMinutos: 60,
      publicadoEn: new Date(),
      configuracion: { formato: "cosecha" },
    },
  });
}

test.describe("PDF de cierre y proyección de recuerdos", () => {
  test("cada PDF queda ligado a la respuesta y al participante correctos", async ({ playwright }) => {
    const desafio = await asegurarDesafioCierre();
    const marca = Date.now();
    const primera = await crearParticipanteConToken({ nombre: `Ana Cosecha ${marca}` });
    const segunda = await crearParticipanteConToken({ nombre: `Esteban Cosecha ${marca}` });
    const completitudPrimera = await db.completitud.create({
      data: {
        participanteId: primera.participante.id,
        desafioId: desafio.id,
        puntosOtorgados: 150,
        respuesta: { meLlevo: "Respuesta de Ana", agradezco: "Gracias de Ana", activo: "Acción de Ana" },
      },
    });
    const completitudSegunda = await db.completitud.create({
      data: {
        participanteId: segunda.participante.id,
        desafioId: desafio.id,
        puntosOtorgados: 150,
        respuesta: { meLlevo: "Respuesta de Esteban", agradezco: "Gracias de Esteban", activo: "Acción de Esteban" },
      },
    });

    const apiPrimera = await contextoApiParticipante(playwright.request, primera.token);
    const apiSegunda = await contextoApiParticipante(playwright.request, segunda.token);
    const pdfPrimera = await apiPrimera.get(`/api/cosecha?v=${completitudPrimera.id}`);
    const pdfSegunda = await apiSegunda.get(`/api/cosecha?v=${completitudSegunda.id}`);

    expect(pdfPrimera.status()).toBe(200);
    expect(pdfSegunda.status()).toBe(200);
    expect(pdfPrimera.headers()["content-type"]).toContain("application/pdf");
    expect(pdfPrimera.headers()["content-disposition"]).toContain(`ana-cosecha-${marca}-${completitudPrimera.id}`);
    expect(pdfSegunda.headers()["content-disposition"]).toContain(`esteban-cosecha-${marca}-${completitudSegunda.id}`);
    expect(pdfSegunda.headers()["cache-control"]).toContain("no-store");
    expect(pdfSegunda.headers()["cdn-cache-control"]).toBe("no-store");
    expect(Buffer.compare(await pdfPrimera.body(), await pdfSegunda.body())).not.toBe(0);

    const intentoCruzado = await apiSegunda.get(`/api/cosecha?v=${completitudPrimera.id}`);
    expect(intentoCruzado.status()).toBe(404);

    await apiPrimera.dispose();
    await apiSegunda.dispose();
  });

  test("la presentación muestra la fotografía completa sin recortarla", async ({ page }) => {
    const { participante } = await crearParticipanteConToken({ nombre: `Recuerdo completo ${Date.now()}` });
    const descripcion = `Fotografía completa ${Date.now()}`;
    await db.recuerdo.createMany({
      data: Array.from({ length: 22 }, (_, indice) => ({
        participanteId: participante.id,
        urlFoto: "/marca/logo-grupo-epm-oficial.png",
        urlMiniatura: "/marca/logo-grupo-epm-oficial.png",
        descripcion: `Recuerdo adicional ${indice + 1}`,
        visible: true,
      })),
    });
    await db.recuerdo.create({
      data: {
        participanteId: participante.id,
        urlFoto: "/marca/logo-grupo-epm-oficial.png",
        urlMiniatura: "/marca/logo-grupo-epm-oficial.png",
        descripcion,
        visible: true,
      },
    });
    await iniciarAdmin(page);
    await page.goto("/admin/proyeccion/recuerdos");
    const foto = page.getByRole("img", { name: descripcion });
    await expect(foto).toBeVisible();
    expect(await foto.evaluate((elemento) => getComputedStyle(elemento).objectFit)).toBe("contain");
    const tarjetas = page.locator("figure");
    await expect(tarjetas).toHaveCount(12);
    const favorita = page.locator('figure[data-destacado="true"]');
    await expect(favorita.getByRole("img", { name: descripcion })).toBeVisible();
    const idsPrimeraTanda = await page.locator('figure[data-destacado="false"]').evaluateAll((elementos) => elementos.map((elemento) => (elemento as HTMLElement).dataset.recuerdoId));
    await expect.poll(async () => {
      const idsActuales = await page.locator('figure[data-destacado="false"]').evaluateAll((elementos) => elementos.map((elemento) => (elemento as HTMLElement).dataset.recuerdoId));
      return idsActuales.some((id) => !idsPrimeraTanda.includes(id));
    }, { timeout: 15_000 }).toBe(true);
    await expect(favorita.getByRole("img", { name: descripcion })).toBeVisible();
    const dimensiones = await tarjetas.evaluateAll((elementos) => elementos.map((elemento) => {
      const rectangulo = elemento.getBoundingClientRect();
      return { alto: rectangulo.height, abajo: rectangulo.bottom };
    }));
    expect(Math.min(...dimensiones.map(({ alto }) => alto))).toBeGreaterThan(100);
    expect(Math.max(...dimensiones.map(({ abajo }) => abajo))).toBeLessThanOrEqual(await page.evaluate(() => window.innerHeight));
  });
});
