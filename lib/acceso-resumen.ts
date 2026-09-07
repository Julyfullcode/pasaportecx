import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_ACCESO_RESUMEN = "acceso_presentacion_resumen";
const HASH_CODIGO_PREDETERMINADO = "041d38e523791d81621a02de2eb4d0b9cdc7438e92952761b39dc2091fa29701";

function identificadorDeCodigo() {
  return HASH_CODIGO_PREDETERMINADO;
}

function firmaAcceso() {
  const secreto = process.env.AUTH_SECRET || "pasaporte-cx-resumen-evento";
  return createHmac("sha256", secreto).update(`resumen:${identificadorDeCodigo()}`).digest("hex");
}

export function codigoResumenCorrecto(valor: string) {
  const recibido = createHash("sha256").update(valor.trim()).digest();
  const esperado = Buffer.from(HASH_CODIGO_PREDETERMINADO, "hex");
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
