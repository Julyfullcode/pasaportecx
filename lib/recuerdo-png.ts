import { readFile } from "node:fs/promises";
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

type TextoSvg = { tamano: number; interlineado: number; lineas: string[] };

export function nombrePngSeguro(valor: string) {
  return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "recuerdo";
}

function xml(valor: string) {
  return valor.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function envolver(texto: string, limite: number) {
  const palabras = texto.trim().replace(/\s+/g, " ").split(" ").filter(Boolean);
  const resultado: string[] = [];
  let actual = "";
  for (const palabra of palabras) {
    const candidata = actual ? `${actual} ${palabra}` : palabra;
    if (actual && candidata.length > limite) { resultado.push(actual); actual = palabra; }
    else actual = candidata;
  }
  if (actual) resultado.push(actual);
  return resultado.length ? resultado : [""];
}

function ajustar(texto: string, ancho: number, maximo: number, minimo: number): TextoSvg {
  const tamano = Math.max(minimo, Math.min(maximo, Math.round(ancho / 28)));
  const limite = Math.max(13, Math.floor(ancho / (tamano * 0.54)));
  const lineas = envolver(texto, limite);
  return { tamano, interlineado: tamano * 1.2, lineas };
}

function tspans(texto: TextoSvg, x: number, y: number) {
  return texto.lineas.map((linea, indice) => `<tspan x="${x}" y="${y + indice * texto.interlineado}">${xml(linea)}</tspan>`).join("");
}

let promesaFuentes: Promise<string> | undefined;
function fuentesSvg() {
  promesaFuentes ??= Promise.all([
    readFile(join(process.cwd(), "public", "fuentes", "Poppins-Regular.ttf")),
    readFile(join(process.cwd(), "public", "fuentes", "Poppins-SemiBold.ttf")),
  ]).then(([regular, semibold]) => `<style>@font-face{font-family:Poppins;src:url(data:font/ttf;base64,${regular.toString("base64")});font-weight:400}@font-face{font-family:Poppins;src:url(data:font/ttf;base64,${semibold.toString("base64")});font-weight:600 900}text{font-family:Poppins,sans-serif}</style>`);
  return promesaFuentes;
}

function iniciales(nombre: string) {
  return nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((parte) => parte[0]?.toUpperCase()).join("") || "CX";
}

async function prepararFoto(url: string) {
  const origen = await storage.leer(url);
  const foto = await sharp(origen).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).png({ compressionLevel: 7 }).toBuffer();
  const metadata = await sharp(foto).metadata();
  if (!metadata.width || !metadata.height) throw new Error("No fue posible obtener las dimensiones del recuerdo.");
  return { foto, ancho: metadata.width, alto: metadata.height };
}

async function avatarData(url: string | null | undefined, tamano: number) {
  if (!url) return undefined;
  try {
    const origen = await storage.leer(url);
    const avatar = await sharp(origen).rotate().resize(tamano, tamano, { fit: "cover" }).png({ compressionLevel: 7 }).toBuffer();
    return `data:image/png;base64,${avatar.toString("base64")}`;
  } catch { return undefined; }
}
export async function generarRecuerdoPng(datos: DatosRecuerdoPng) {
  const [{ foto, ancho, alto }, fuentes] = await Promise.all([prepararFoto(datos.urlFoto), fuentesSvg()]);
  const margen = Math.max(22, Math.round(ancho * 0.04));
  const avatarTamano = Math.max(58, Math.min(104, Math.round(ancho * 0.11)));
  const comentario = ajustar(datos.comentario?.trim() || "Un momento que nos conecta", ancho - margen * 2, 34, 16);
  const altoComentario = Math.ceil(comentario.lineas.length * comentario.interlineado);
  const altoDatos = Math.max(avatarTamano, 76);
  const altoFranja = margen + altoComentario + Math.round(margen * 0.7) + altoDatos + margen;
  const avatar = await avatarData(datos.urlFotoAutor, avatarTamano);
  const svg = crearFranjaSvg(datos, fuentes, ancho, altoFranja, margen, avatarTamano, comentario, avatar);
  const franja = await sharp(Buffer.from(svg)).png({ compressionLevel: 7 }).toBuffer();
  return sharp({ create: { width: ancho, height: alto + altoFranja, channels: 4, background: "#ffffff" } })
    .composite([{ input: foto, top: 0, left: 0 }, { input: franja, top: alto, left: 0 }])
    .png({ compressionLevel: 7, adaptiveFiltering: false })
    .toBuffer();
}

function crearFranjaSvg(datos: DatosRecuerdoPng, fuentes: string, ancho: number, alto: number, margen: number, avatarTamano: number, comentario: TextoSvg, avatar?: string) {
  const divisorY = margen + comentario.lineas.length * comentario.interlineado + margen * 0.35;
  const avatarY = Math.round(divisorY + margen * 0.55);
  const avatarX = margen;
  const centroAvatarX = avatarX + avatarTamano / 2;
  const centroAvatarY = avatarY + avatarTamano / 2;
  const textoX = avatarX + avatarTamano + Math.round(margen * 0.55);
  const nombreTamano = Math.max(16, Math.min(28, Math.round(ancho / 34)));
  const empresaTamano = Math.max(13, Math.round(nombreTamano * 0.7));
  const chipAlto = Math.max(42, Math.round(avatarTamano * 0.58));
  const chipAncho = Math.max(94, Math.round(ancho * 0.12));
  const separacion = Math.max(10, Math.round(margen * 0.4));
  const chip2X = ancho - margen - chipAncho;
  const chip1X = chip2X - separacion - chipAncho;
  const chipY = Math.round(avatarY + (avatarTamano - chipAlto) / 2);
  const avatarSvg = avatar
    ? `<image href="${avatar}" x="${avatarX}" y="${avatarY}" width="${avatarTamano}" height="${avatarTamano}" preserveAspectRatio="xMidYMid slice" clip-path="url(#avatar)"/>`
    : `<circle cx="${centroAvatarX}" cy="${centroAvatarY}" r="${avatarTamano / 2}" fill="#0e7c6e"/><text x="${centroAvatarX}" y="${centroAvatarY + avatarTamano * 0.1}" text-anchor="middle" font-size="${avatarTamano * 0.32}" font-weight="700" fill="#fff">${xml(iniciales(datos.autor))}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}"><defs><clipPath id="avatar"><circle cx="${centroAvatarX}" cy="${centroAvatarY}" r="${avatarTamano / 2}"/></clipPath>${fuentes}</defs>
    <rect width="${ancho}" height="${alto}" fill="#fff"/><rect width="${ancho}" height="${Math.max(6, Math.round(ancho * 0.006))}" fill="#8cc63f"/>
    <text font-size="${comentario.tamano}" font-weight="600" fill="#0b3b60">${tspans(comentario, margen, margen + comentario.tamano)}</text>
    <line x1="${margen}" y1="${divisorY}" x2="${ancho - margen}" y2="${divisorY}" stroke="#dce6eb" stroke-width="2"/>
    ${avatarSvg}<circle cx="${centroAvatarX}" cy="${centroAvatarY}" r="${avatarTamano / 2}" fill="none" stroke="#0e7c6e" stroke-width="3"/>
    <text x="${textoX}" y="${avatarY + nombreTamano}" font-size="${nombreTamano}" font-weight="700" fill="#0b3b60">${xml(datos.autor)}</text>
    <text x="${textoX}" y="${avatarY + nombreTamano + empresaTamano * 1.6}" font-size="${empresaTamano}" font-weight="400" fill="#64748b">${xml(datos.empresa)}</text>
    <rect x="${chip1X}" y="${chipY}" width="${chipAncho}" height="${chipAlto}" rx="${chipAlto / 2}" fill="#f1f5f9"/><text x="${chip1X + chipAncho / 2}" y="${chipY + chipAlto * 0.66}" text-anchor="middle" font-size="${Math.max(14, chipAlto * 0.36)}" font-weight="700" fill="#0b3b60">Corazón ${datos.corazones}</text>
    <rect x="${chip2X}" y="${chipY}" width="${chipAncho}" height="${chipAlto}" rx="${chipAlto / 2}" fill="#f1f5f9"/><text x="${chip2X + chipAncho / 2}" y="${chipY + chipAlto * 0.66}" text-anchor="middle" font-size="${Math.max(14, chipAlto * 0.36)}" font-weight="700" fill="#0b3b60">Risa ${datos.risas}</text>
  </svg>`;
}