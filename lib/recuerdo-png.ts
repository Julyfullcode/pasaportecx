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

export function nombrePngSeguro(valor: string) {
  return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "recuerdo";
}

function xml(valor: string) {
  return valor.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function envolver(texto: string, limite: number) {
  const palabras = texto.trim().replace(/\s+/g, " ").split(" ").filter(Boolean);
  const resultado: string[] = [];
  let actual = "";
  for (const palabra of palabras) {
    const candidata = actual ? `${actual} ${palabra}` : palabra;
    if (actual && candidata.length > limite) {
      resultado.push(actual);
      actual = palabra;
    } else actual = candidata;
  }
  if (actual) resultado.push(actual);
  return resultado.length ? resultado : [""];
}

function ajustar(texto: string, ancho: number, alto: number, maximo: number, minimo: number) {
  for (let tamano = maximo; tamano >= minimo; tamano--) {
    const contenido = envolver(texto, Math.max(12, Math.floor(ancho / (tamano * 0.55))));
    const interlineado = tamano * 1.18;
    if (contenido.length * interlineado <= alto) return { tamano, interlineado, contenido };
  }
  return { tamano: minimo, interlineado: minimo * 1.12, contenido: envolver(texto, Math.floor(ancho / (minimo * 0.55))) };
}

function tspans(texto: ReturnType<typeof ajustar>, x: number, y: number) {
  return texto.contenido.map((linea, indice) => `<tspan x="${x}" y="${y + indice * texto.interlineado}">${xml(linea)}</tspan>`).join("");
}

async function imagenData(url: string | null | undefined, ancho: number, alto: number, fit: "cover" | "contain") {
  if (!url) return undefined;
  try {
    const origen = await storage.leer(url);
    const imagen = await sharp(origen).rotate().resize(ancho, alto, { fit, background: { r: 15, g: 24, b: 39, alpha: 1 } }).png({ compressionLevel: 6 }).toBuffer();
    return `data:image/png;base64,${imagen.toString("base64")}`;
  } catch {
    return undefined;
  }
}

function iniciales(nombre: string) {
  return nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((parte) => parte[0]?.toUpperCase()).join("") || "CX";
}
export async function generarRecuerdoPng(datos: DatosRecuerdoPng) {
  const [foto, avatar] = await Promise.all([
    imagenData(datos.urlFoto, 1200, 920, "contain"),
    imagenData(datos.urlFotoAutor, 112, 112, "cover"),
  ]);
  const comentario = ajustar(datos.comentario?.trim() || "Un momento que nos conecta", 1064, 116, 31, 17);
  const autor = ajustar(datos.autor, 590, 72, 29, 20);
  const fotoSvg = foto
    ? `<image href="${foto}" width="1200" height="920" preserveAspectRatio="xMidYMid meet"/>`
    : `<rect width="1200" height="920" fill="#101827"/><text x="600" y="475" text-anchor="middle" font-size="40" fill="#ffffff99">Foto no disponible</text>`;
  const avatarSvg = avatar
    ? `<image href="${avatar}" x="68" y="1100" width="112" height="112" preserveAspectRatio="xMidYMid slice" clip-path="url(#avatar)"/>`
    : `<circle cx="124" cy="1156" r="56" fill="#0e7c6e"/><text x="124" y="1170" text-anchor="middle" font-size="28" font-weight="700" fill="#fff">${xml(iniciales(datos.autor))}</text>`;
  return crearPng(datos, fotoSvg, avatarSvg, comentario, autor);
}

async function crearPng(datos: DatosRecuerdoPng, fotoSvg: string, avatarSvg: string, comentario: ReturnType<typeof ajustar>, autor: ReturnType<typeof ajustar>) {
  const svg = crearSvg(datos, fotoSvg, avatarSvg, comentario, autor);
  return sharp(Buffer.from(svg)).png({ compressionLevel: 7, adaptiveFiltering: false }).toBuffer();
}
function crearSvg(datos: DatosRecuerdoPng, fotoSvg: string, avatarSvg: string, comentario: ReturnType<typeof ajustar>, autor: ReturnType<typeof ajustar>) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1280" viewBox="0 0 1200 1280">
    <defs><clipPath id="avatar"><circle cx="124" cy="1156" r="56"/></clipPath></defs>
    <rect width="1200" height="1280" fill="#101827"/>${fotoSvg}
    <rect y="920" width="1200" height="360" fill="#fff"/><rect y="920" width="1200" height="10" fill="#8cc63f"/>
    <text font-family="Arial,sans-serif" font-size="${comentario.tamano}" font-weight="700" fill="#0b3b60">${tspans(comentario, 68, 985)}</text>
    <line x1="68" y1="1070" x2="1132" y2="1070" stroke="#dce6eb" stroke-width="2"/>
    ${avatarSvg}<circle cx="124" cy="1156" r="56" fill="none" stroke="#0e7c6e" stroke-width="3"/>
    <text font-family="Arial,sans-serif" font-size="${autor.tamano}" font-weight="700" fill="#0b3b60">${tspans(autor, 205, 1137)}</text>
    <text x="205" y="1208" font-family="Arial,sans-serif" font-size="22" fill="#64748b">${xml(datos.empresa)}</text>
    <rect x="844" y="1116" width="132" height="74" rx="37" fill="#f1f5f9"/><text x="910" y="1164" text-anchor="middle" font-family="Arial,sans-serif" font-size="25" font-weight="700" fill="#0b3b60">♥ ${datos.corazones}</text>
    <rect x="992" y="1116" width="140" height="74" rx="37" fill="#f1f5f9"/><text x="1062" y="1164" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" font-weight="700" fill="#0b3b60">Risas ${datos.risas}</text>
  </svg>`;
}