import { expect, test } from "@playwright/test";
import { db } from "@/lib/db";
import { asegurarActividadUniverso } from "@/lib/actividad";
import { PREGUNTA_UNIVERSO_ID, TARJETAS_UNIVERSO } from "@/lib/universo-experiencia";
import { autenticarParticipante, crearParticipanteConToken } from "./ayudas";

test("el universo revela una tarjeta aleatoria y guarda la misión del participante", async ({ browser }) => {
  const actividadBase = await asegurarActividadUniverso();
  const codigoAcceso = `universo-${Date.now()}`;
  const actividad = await db.actividad.update({
    where: { id: actividadBase.id },
    data: { codigoAcceso, estado: "PUBLICADA", puntosHabilitados: true, puntos: 25 },
  });
  const { participante, token } = await crearParticipanteConToken({ nombre: `Explorador ${Date.now()}` });
  const contexto = await browser.newContext();
  await autenticarParticipante(contexto, token);
  const page = await contexto.newPage();

  await page.goto(`/a/${actividad.codigoAcceso}`);
  await expect(page.getByTestId("universo-tarjetas")).toBeVisible();
  await expect(page.getByRole("heading", { name: "El universo de la experiencia" })).toBeVisible();
  await expect(page.getByTestId("mazo-universo")).toBeVisible();
  await page.getByRole("button", { name: "Activar la órbita" }).click();
  await expect(page.getByText("Buscando tu señal…")).toBeVisible();
  await expect(page.getByTestId("tarjeta-universo-revelada")).toBeVisible({ timeout: 3_000 });

  const tituloTarjeta = await page.getByTestId("tarjeta-universo-revelada").getByRole("heading").textContent();
  expect(TARJETAS_UNIVERSO.some((tarjeta) => tarjeta.titulo === tituloTarjeta)).toBe(true);
  const reflexion = "Voy a convertir esta señal en una conversación concreta con mi equipo.";
  await page.getByTestId("reflexion-universo").fill(reflexion);
  await page.getByRole("button", { name: "Poner mi misión en órbita" }).click();
  await expect(page.getByText("Misión puesta en órbita")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(`“${reflexion}”`)).toBeVisible();

  const respuesta = await db.respuestaActividad.findUniqueOrThrow({
    where: { actividadId_participanteId_preguntaId: { actividadId: actividad.id, participanteId: participante.id, preguntaId: PREGUNTA_UNIVERSO_ID } },
  });
  expect(respuesta.respuesta).toMatchObject({ reflexion });
  expect((await db.participacionActividad.findUniqueOrThrow({ where: { actividadId_participanteId: { actividadId: actividad.id, participanteId: participante.id } } })).puntosOtorgados).toBe(25);
  expect((await db.participante.findUniqueOrThrow({ where: { id: participante.id } })).puntosTotales).toBe(35);
  await contexto.close();
});
