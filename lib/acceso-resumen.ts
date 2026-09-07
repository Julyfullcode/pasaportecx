import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_ACCESO_RESUMEN = "acceso_presentacion_resumen";
const CODIGO_PREDETERMINADO = "Experiencia";

function codigoConfigurado() {
  return process.env.RESUMEN_PRESENTACION_CODIGO?.trim() || CODIGO_PREDETERMINADO;
}

function firmaAcceso() {
  const secreto = process.env.AUTH_SECRET || "pasaporte-cx-resumen-evento";
  return createHmac("sha256", secreto).update(`resumen:${codigoConfigurado()}`).digest("hex");
}

export function codigoResumenCorrecto(valor: string) {
  const recibido = Buffer.from(valor.trim());
  const esperado = Buffer.from(codigoConfigurado());
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
