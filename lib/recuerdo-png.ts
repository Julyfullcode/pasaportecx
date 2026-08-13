import { join } from "node:path";
import sharp from "sharp";
import { storage } from "@/lib/storage";

export type DatosRecuerdoPng = {
  urlFoto: string;
  comentario?: string | null;
  autor: string;
  empresa: string;
  urlFotoAutor?: string | null;
  corazones: number;
  risas: number;
};

const FUENTE_REGULAR = join(process.cwd(), "public", "fuentes", "Poppins-Regular.ttf");
const FUENTE_SEMIBOLD = join(process.cwd(), "public", "fuentes", "Poppins-SemiBold.ttf");

export function nombrePngSeguro(valor: string) {
  return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "recuerdo";
}

function escaparPango(valor: string) {
  return valor.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

async function prepararFoto(url: string) {
  const origen = await storage.leer(url);
  const foto = await sharp(origen).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).png({ compressionLevel: 7 }).toBuffer();
  const metadata = await sharp(foto).metadata();
  if (!metadata.width || !metadata.height) throw new Error("No fue posible obtener las dimensiones del recuerdo.");
  return { foto, ancho: metadata.width, alto: metadata.height };
}

type TextoRenderizado = { buffer: Buffer; ancho: number; alto: number };

async function renderizarTexto(texto: string, ancho: number, tamano: number, color: string, semibold = false, alineacion: "left" | "right" = "left"): Promise<TextoRenderizado> {
  const buffer = await sharp({
    text: {
      text: `<span foreground="${color}">${escaparPango(texto)}</span>`,
      font: `Poppins ${tamano}`,
      fontfile: semibold ? FUENTE_SEMIBOLD : FUENTE_REGULAR,
      width: Math.max(1, Math.floor(ancho)),
      align: alineacion,
      rgba: true,
      wrap: "word-char",
      spacing: 0,
      dpi: 72,
    },
  }).png().toBuffer();
  const metadata = await sharp(buffer).metadata();
  return { buffer, ancho: metadata.width || ancho, alto: metadata.height || tamano * 2 };
}

async function prepararAvatar(url: string | null | undefined, nombre: string, tamano: number) {
  const mascara = Buffer.from(`<svg width="${tamano}" height="${tamano}"><circle cx="${tamano / 2}" cy="${tamano / 2}" r="${tamano / 2}" fill="white"/></svg>`);
  try {
    if (!url) throw new Error("Sin foto");
    const origen = await storage.leer(url);
    return sharp(origen).rotate().resize(tamano, tamano, { fit: "cover" }).composite([{ input: mascara, blend: "dest-in" }]).png().toBuffer();
  } catch {
    const iniciales = nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((parte) => parte[0]?.toUpperCase()).join("") || "CX";
    const texto = await renderizarTexto(iniciales, tamano, Math.round(tamano * 0.34), "#ffffff", true, "left");
    return sharp({ create: { width: tamano, height: tamano, channels: 4, background: "#0e7c6e" } }).composite([
      { input: texto.buffer, left: Math.max(0, Math.round((tamano - texto.ancho) / 2)), top: Math.max(0, Math.round((tamano - texto.alto) / 2)) },
      { input: mascara, blend: "dest-in" },
    ]).png().toBuffer();
  }
}
export async function generarRecuerdoPng(datos: DatosRecuerdoPng) {
  const { foto, ancho, alto } = await prepararFoto(datos.urlFoto);
  const margen = Math.max(20, Math.round(ancho * 0.035));
  const avatarTamano = Math.max(56, Math.min(100, Math.round(ancho * 0.1)));
  const comentarioTamano = Math.max(16, Math.min(32, Math.round(ancho / 30)));
  const nombreTamano = Math.max(15, Math.min(27, Math.round(ancho / 36)));
  const empresaTamano = Math.max(13, Math.round(nombreTamano * 0.72));
  const chipTamano = Math.max(12, Math.round(nombreTamano * 0.72));
  const chipAncho = Math.max(90, Math.round(ancho * 0.13));
  const chipsTotal = chipAncho * 2 + Math.round(margen * 0.4);
  const anchoNombre = Math.max(100, ancho - margen * 3 - avatarTamano - chipsTotal);

  const [comentario, nombre, empresa, corazon, risa, avatar] = await Promise.all([
    renderizarTexto(datos.comentario?.trim() || "Un momento que nos conecta", ancho - margen * 2, comentarioTamano, "#0b3b60", true),
    renderizarTexto(datos.autor, anchoNombre, nombreTamano, "#0b3b60", true),
    renderizarTexto(datos.empresa, anchoNombre, empresaTamano, "#64748b"),
    renderizarTexto(String(datos.corazones), chipAncho - 42, chipTamano, "#0b3b60", true, "left"),
    renderizarTexto(String(datos.risas), chipAncho - 42, chipTamano, "#0b3b60", true, "left"),
    prepararAvatar(datos.urlFotoAutor, datos.autor, avatarTamano),
  ]);

  const separacion = Math.max(10, Math.round(margen * 0.35));
  const divisorY = margen + comentario.alto + separacion;
  const datosY = divisorY + separacion;
  const altoDatos = Math.max(avatarTamano, nombre.alto + empresa.alto + 8);
  const altoFranja = datosY + altoDatos + margen;
  const franja = sharp({ create: { width: ancho, height: altoFranja, channels: 4, background: "#ffffff" } });
  const chipAlto = Math.max(42, Math.round(avatarTamano * 0.56));
  const chip2X = ancho - margen - chipAncho;
  const chip1X = chip2X - separacion - chipAncho;
  const chipY = datosY + Math.round((altoDatos - chipAlto) / 2);
  const textoX = margen + avatarTamano + separacion;
  const altoBloquePersona = nombre.alto + empresa.alto + 6;
  const textoY = datosY + Math.max(0, Math.round((altoDatos - altoBloquePersona) / 2));
  const corazonIconoTamano = Math.max(18, Math.round(chipAlto * 0.38));
  const corazonGrupoAncho = corazonIconoTamano + 6 + corazon.ancho;
  const corazonIconoX = chip1X + Math.round((chipAncho - corazonGrupoAncho) / 2);
  const corazonTextoX = corazonIconoX + corazonIconoTamano + 6;
  const corazonIcono = Buffer.from(`<svg width="${corazonIconoTamano}" height="${corazonIconoTamano}" viewBox="0 0 24 24"><path fill="#e11d48" d="M12 21s-7.2-4.35-9.6-8.46C.35 9.03 1.8 4.5 5.85 3.3A5.2 5.2 0 0 1 12 5.2a5.2 5.2 0 0 1 6.15-1.9c4.05 1.2 5.5 5.73 3.45 9.24C19.2 16.65 12 21 12 21Z"/></svg>`);
  const risaIconoTamano = corazonIconoTamano;
  const risaGrupoAncho = risaIconoTamano + 6 + risa.ancho;
  const risaIconoX = chip2X + Math.round((chipAncho - risaGrupoAncho) / 2);
  const risaTextoX = risaIconoX + risaIconoTamano + 6;
  const risaIcono = Buffer.from(`<svg width="${risaIconoTamano}" height="${risaIconoTamano}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#facc15"/><path d="M7 10c1.2-1.4 2.4-1.4 3.6 0M13.4 10c1.2-1.4 2.4-1.4 3.6 0" fill="none" stroke="#713f12" stroke-width="1.7" stroke-linecap="round"/><path d="M7.2 13.2h9.6c-.55 3-2.15 4.6-4.8 4.6s-4.25-1.6-4.8-4.6Z" fill="#fff" stroke="#713f12" stroke-width="1.2" stroke-linejoin="round"/></svg>`);
  const composiciones: sharp.OverlayOptions[] = [
    { input: { create: { width: ancho, height: Math.max(5, Math.round(ancho * 0.005)), channels: 4, background: "#8cc63f" } }, left: 0, top: 0 },
    { input: comentario.buffer, left: margen, top: margen },
    { input: { create: { width: ancho - margen * 2, height: 2, channels: 4, background: "#dce6eb" } }, left: margen, top: divisorY },
    { input: avatar, left: margen, top: datosY },
    { input: nombre.buffer, left: textoX, top: textoY },
    { input: empresa.buffer, left: textoX, top: textoY + nombre.alto + 6 },
    { input: { create: { width: chipAncho, height: chipAlto, channels: 4, background: "#f1f5f9" } }, left: chip1X, top: chipY },
    { input: { create: { width: chipAncho, height: chipAlto, channels: 4, background: "#f1f5f9" } }, left: chip2X, top: chipY },
    { input: corazonIcono, left: corazonIconoX, top: chipY + Math.round((chipAlto - corazonIconoTamano) / 2) },
    { input: corazon.buffer, left: corazonTextoX, top: chipY + Math.max(2, Math.round((chipAlto - corazon.alto) / 2)) },
    { input: risaIcono, left: risaIconoX, top: chipY + Math.round((chipAlto - risaIconoTamano) / 2) },
    { input: risa.buffer, left: risaTextoX, top: chipY + Math.max(2, Math.round((chipAlto - risa.alto) / 2)) },
  ];
  const franjaBuffer = await franja.composite(composiciones).png({ compressionLevel: 7 }).toBuffer();
  return sharp({ create: { width: ancho, height: alto + altoFranja, channels: 4, background: "#ffffff" } })
    .composite([{ input: foto, left: 0, top: 0 }, { input: franjaBuffer, left: 0, top: alto }])
    .png({ compressionLevel: 7, adaptiveFiltering: false })
    .toBuffer();
}