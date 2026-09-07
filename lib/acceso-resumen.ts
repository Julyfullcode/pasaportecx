import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_ACCESO_RESUMEN = "acceso_presentacion_resumen";
const HASH_CODIGO_PREDETERMINADO = "08eb6bbf5dfa8b2e73f5576821650d2ff34ea31d1fc3d18bf837a4a7cbf66fb0";

function codigoConfigurado() {
  return process.env.RESUMEN_PRESENTACION_CODIGO?.trim();
}

function identificadorDeCodigo() {
  return codigoConfigurado() || HASH_CODIGO_PREDETERMINADO;
}

function firmaAcceso() {
  const secreto = process.env.AUTH_SECRET || "pasaporte-cx-resumen-evento";
  return createHmac("sha256", secreto).update(`resumen:${identificadorDeCodigo()}`).digest("hex");
}

export function codigoResumenCorrecto(valor: string) {
  const codigo = codigoConfigurado();
  const recibido = codigo
    ? Buffer.from(valor.trim())
    : createHash("sha256").update(valor.trim()).digest();
  const esperado = codigo
    ? Buffer.from(codigo)
    : Buffer.from(HASH_CODIGO_PREDETERMINADO, "hex");
  return recibido.length === esperado.length && timingSafeEqual(recibido, esperado);
}

export async function tieneAccesoResumen() {
  return (await cookies()).get(COOKIE_ACCESO_RESUMEN)?.value === firmaAcceso();
}

export async function concederAccesoResumen() {
  (await cookies()).set(COOKIE_ACCESO_RESUMEN, firmaAcceso(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/admin/proyeccion/resumen",
  });
}
