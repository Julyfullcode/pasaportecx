import { createHmac, timingSafeEqual } from "node:crypto";

export const INTERVALO_QR_PUNTUALIDAD_MS = 15_000;
const GRACIA_LECTURA_MS = 5_000;

function secretoQr() {
  return process.env.AUTH_SECRET
    ?? process.env.SUPABASE_SERVICE_ROLE_KEY
    ?? "pasaporte-cx-desarrollo-qr-puntualidad";
}

function firma(codigo: string, intervalo: number) {
  return createHmac("sha256", secretoQr())
    .update(`puntualidad:${codigo}:${intervalo}`)
    .digest("base64url");
}

export function crearTokenQrPuntualidad(codigo: string, ahora = new Date()) {
  const intervalo = Math.floor(ahora.getTime() / INTERVALO_QR_PUNTUALIDAD_MS);
  return `${intervalo}.${firma(codigo, intervalo)}`;
}

export function validarTokenQrPuntualidad(codigo: string, token: string, ahora = new Date()) {
  const [intervaloTexto, firmaRecibida, extra] = token.split(".");
  if (extra || !/^\d+$/.test(intervaloTexto) || !/^[A-Za-z0-9_-]{43}$/.test(firmaRecibida ?? "")) return false;
  const intervalo = Number(intervaloTexto);
  if (!Number.isSafeInteger(intervalo)) return false;
  const emitidoEn = intervalo * INTERVALO_QR_PUNTUALIDAD_MS;
  const refrescaEn = emitidoEn + INTERVALO_QR_PUNTUALIDAD_MS;
  const tiempo = ahora.getTime();
  if (tiempo < emitidoEn || tiempo > refrescaEn + GRACIA_LECTURA_MS) return false;
  const esperada = Buffer.from(firma(codigo, intervalo));
  const recibida = Buffer.from(firmaRecibida);
  return esperada.length === recibida.length && timingSafeEqual(esperada, recibida);
}

export function datosQrPuntualidad(codigo: string, origen: string, ahora = new Date()) {
  const intervalo = Math.floor(ahora.getTime() / INTERVALO_QR_PUNTUALIDAD_MS);
  const refrescaEn = (intervalo + 1) * INTERVALO_QR_PUNTUALIDAD_MS;
  const url = new URL(`/d/${encodeURIComponent(codigo)}`, origen.replace(/\/$/, ""));
  url.searchParams.set("llegada", crearTokenQrPuntualidad(codigo, ahora));
  return {
    url: url.toString(),
    refrescaEn: new Date(refrescaEn).toISOString(),
    vigenciaMs: Math.max(500, refrescaEn - ahora.getTime()),
  };
}
