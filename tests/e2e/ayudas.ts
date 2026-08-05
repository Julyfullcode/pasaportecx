import { createHash, randomBytes } from "node:crypto";
import type { APIRequestContext, BrowserContext, Page } from "@playwright/test";
import type { APIRequest } from "playwright-core";
import { db } from "@/lib/db";

export const BASE_URL = "http://127.0.0.1:3000";
export const EMPRESA_ID = "empresa-e2e";
export const PUNTOS_REGISTRO = 25;

export const fotoPng = {
  name: "foto.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  ),
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function iniciarAdmin(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Usuario").fill("e2e-admin");
  await page.getByLabel("Contraseña").fill("E2E-Segura-123!");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL(/\/admin$/);
}

export async function crearParticipanteConToken({
  nombre,
  puntos = PUNTOS_REGISTRO,
  esStaff = false,
}: {
  nombre: string;
  puntos?: number;
  esStaff?: boolean;
}) {
  const sufijo = randomBytes(6).toString("hex");
  const token = randomBytes(32).toString("base64url");
  const participante = await db.participante.create({
    data: {
      nombre,
      empresaId: EMPRESA_ID,
      urlFoto: "/marca/logo-grupo-epm-oficial.png",
      codigoRecuperacion: sufijo.toUpperCase(),
      puntosRegistro: puntos,
      puntosTotales: esStaff ? 0 : puntos,
      esStaff,
      sesiones: {
        create: {
          tokenHash: hashToken(token),
          expiraEn: new Date(Date.now() + 60 * 60 * 1000),
        },
      },
    },
  });
  return { participante, token };
}

export async function autenticarParticipante(context: BrowserContext, token: string) {
  await context.addCookies([{ name: "pasaporte_participante", value: token, url: BASE_URL }]);
}

export async function contextoApiParticipante(request: APIRequest, token: string) {
  return request.newContext({
    baseURL: BASE_URL,
    extraHTTPHeaders: { Cookie: `pasaporte_participante=${token}` },
  });
}

export async function registrarPorApi(
  api: APIRequestContext,
  nombre: string,
  apellidos = "Prueba",
  correo = `registro-${randomBytes(10).toString("hex")}@example.com`,
) {
  await db.correoAutorizado.upsert({
    where: { correo },
    update: {},
    create: { correo },
  });
  return api.post("/api/registro", {
    multipart: {
      correo,
      nombres: nombre,
      apellidos,
      empresaId: EMPRESA_ID,
      aceptaDatos: "on",
      foto: fotoPng,
    },
  });
}
