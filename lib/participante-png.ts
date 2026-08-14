import { join } from "node:path";
import sharp from "sharp";
import { storage } from "@/lib/storage";

export type DatosParticipantePng = {
  nombre: string;
  empresa: string;
  urlFoto: string;
  urlLogoEmpresa?: string | null;
};

const FUENTE = join(process.cwd(), "public", "fuentes", "Poppins-SemiBold.ttf");

export function nombreParticipanteSeguro(valor: string) {
  return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "participante";
}

function escaparPango(valor: string) {
  return valor.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

async function texto(texto: string, ancho: number, tamano: number, color: string) {
  const buffer = await sharp({ text: {
    text: `<span foreground="${color}">${escaparPango(texto)}</span>`,
    font: `Poppins ${tamano}`,
    fontfile: FUENTE,
    width: ancho,
    rgba: true,
    wrap: "word-char",
    spacing: 0,
    dpi: 72,
  } }).png().toBuffer();
  const metadatos = await sharp(buffer).metadata();
  return { buffer, ancho: metadatos.width || ancho, alto: metadatos.height || tamano * 2 };
}

async function fotoCircular(url: string, tamano: number) {
  const origen = await storage.leer(url);
  const mascara = Buffer.from(`<svg width="${tamano}" height="${tamano}"><circle cx="${tamano / 2}" cy="${tamano / 2}" r="${tamano / 2}" fill="white"/></svg>`);
  return sharp(origen).rotate().resize(tamano, tamano, { fit: "cover" }).composite([{ input: mascara, blend: "dest-in" }]).png().toBuffer();
}

async function logoEmpresa(url: string | null | undefined, ancho: number, alto: number) {
  if (!url) return undefined;
  try {
    return await sharp(await storage.leer(url)).rotate().resize(ancho, alto, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toBuffer();
  } catch { return undefined; }
}
export async function generarParticipantePng(datos: DatosParticipantePng) {
  const ancho = 1000;
  const alto = 620;
  const fotoTamano = 360;
  const [foto, nombre, empresa, logo] = await Promise.all([
    fotoCircular(datos.urlFoto, fotoTamano),
    texto(datos.nombre, 430, 58, "#ffffff"),
    texto(datos.empresa, 260, 31, "#d9edf0"),
    logoEmpresa(datos.urlLogoEmpresa, 170, 76),
  ]);
  const fotoX = 78;
  const fotoY = Math.round((alto - fotoTamano) / 2);
  const textoX = 510;
  const empresaFilaAlto = Math.max(96, empresa.alto);
  const bloqueAlto = nombre.alto + 34 + empresaFilaAlto;
  const bloqueY = Math.max(70, Math.round((alto - bloqueAlto) / 2));
  const empresaY = bloqueY + nombre.alto + 34;
  const fondo = Buffer.from(`<svg width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="f" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#0d536b"/><stop offset="1" stop-color="#27877c"/></linearGradient></defs><rect width="${ancho}" height="${alto}" rx="54" fill="url(#f)"/><rect x="8" y="8" width="${ancho - 16}" height="${alto - 16}" rx="48" fill="none" stroke="#ffffff33" stroke-width="3"/><circle cx="${fotoX + fotoTamano / 2}" cy="${fotoY + fotoTamano / 2}" r="${fotoTamano / 2 + 9}" fill="#fff"/></svg>`);
  const overlays: sharp.OverlayOptions[] = [
    { input: foto, left: fotoX, top: fotoY },
    { input: nombre.buffer, left: textoX, top: bloqueY },
  ];
  if (logo) agregarEmpresaConLogo(overlays, logo, empresa.buffer, empresa.alto, textoX, empresaY);
  else overlays.push({ input: empresa.buffer, left: textoX, top: empresaY + Math.max(0, Math.round((empresaFilaAlto - empresa.alto) / 2)) });
  return sharp(fondo).composite(overlays).png({ compressionLevel: 7, adaptiveFiltering: false }).toBuffer();
}
function agregarEmpresaConLogo(overlays: sharp.OverlayOptions[], logo: Buffer, empresa: Buffer, empresaAlto: number, x: number, y: number) {
  const logoAncho = 170;
  const logoAlto = 76;
  const caja = Buffer.from(`<svg width="194" height="96" xmlns="http://www.w3.org/2000/svg"><rect width="194" height="96" rx="14" fill="#fff"/></svg>`);
  overlays.push({ input: caja, left: x, top: y });
  overlays.push({ input: logo, left: x + 12, top: y + 10 });
  overlays.push({ input: empresa, left: x + logoAncho + 42, top: y + Math.max(0, Math.round((logoAlto + 20 - empresaAlto) / 2)) });
}
