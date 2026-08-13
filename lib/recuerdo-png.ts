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
    renderizarTexto(`Corazón ${datos.corazones}`, chipAncho - 16, chipTamano, "#0b3b60", true, "left"),
    renderizarTexto(`Risa ${datos.risas}`, chipAncho - 16, chipTamano, "#0b3b60", true, "left"),
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
  const composiciones: sharp.OverlayOptions[] = [
    { input: { create: { width: ancho, height: Math.max(5, Math.round(ancho * 0.005)), channels: 4, background: "#8cc63f" } }, left: 0, top: 0 },
    { input: comentario.buffer, left: margen, top: margen },
    { input: { create: { width: ancho - margen * 2, height: 2, channels: 4, background: "#dce6eb" } }, left: margen, top: divisorY },
    { input: avatar, left: margen, top: datosY },
    { input: nombre.buffer, left: textoX, top: datosY },
    { input: empresa.buffer, left: textoX, top: datosY + nombre.alto + 6 },
    { input: { create: { width: chipAncho, height: chipAlto, channels: 4, background: "#f1f5f9" } }, left: chip1X, top: chipY },
    { input: { create: { width: chipAncho, height: chipAlto, channels: 4, background: "#f1f5f9" } }, left: chip2X, top: chipY },
    { input: corazon.buffer, left: chip1X + Math.max(8, Math.round((chipAncho - corazon.ancho) / 2)), top: chipY + Math.max(2, Math.round((chipAlto - corazon.alto) / 2)) },
    { input: risa.buffer, left: chip2X + Math.max(8, Math.round((chipAncho - risa.ancho) / 2)), top: chipY + Math.max(2, Math.round((chipAlto - risa.alto) / 2)) },
  ];
  const franjaBuffer = await franja.composite(composiciones).png({ compressionLevel: 7 }).toBuffer();
  return sharp({ create: { width: ancho, height: alto + altoFranja, channels: 4, background: "#ffffff" } })
    .composite([{ input: foto, left: 0, top: 0 }, { input: franjaBuffer, left: 0, top: alto }])
    .png({ compressionLevel: 7, adaptiveFiltering: false })
    .toBuffer();
}