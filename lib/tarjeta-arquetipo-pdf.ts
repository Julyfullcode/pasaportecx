import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import type { PlanetaArquetipo } from "@/lib/universo-arquetipos";

function escapar(texto: string) {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function envolver(texto: string, maximo: number) {
  const lineas: string[] = []; let linea = "";
  for (const palabra of texto.trim().split(/\s+/)) {
    const candidata = linea ? `${linea} ${palabra}` : palabra;
    if (candidata.length > maximo && linea) { lineas.push(linea); linea = palabra; } else linea = candidata;
  }
  if (linea) lineas.push(linea);
  return lineas;
}

function tspans(lineas: string[], x: number, y: number, salto: number) {
  return lineas.map((linea, indice) => `<tspan x="${x}" y="${y + indice * salto}">${escapar(linea)}</tspan>`).join("");
}

export async function generarTarjetaArquetipoPdf({ planeta, ruta, nombre }: { planeta: PlanetaArquetipo; ruta: PlanetaArquetipo[]; nombre: string }) {
  const [regular, semibold] = await Promise.all([
    readFile(join(process.cwd(), "public", "fuentes", "Poppins-Regular.ttf")),
    readFile(join(process.cwd(), "public", "fuentes", "Poppins-SemiBold.ttf")),
  ]);
  const estrellas = Array.from({ length: 95 }, (_, indice) => {
    const x = (indice * 137) % 880 + 10; const y = (indice * 223) % 1160 + 10; const radio = 1 + indice % 3; const opacidad = .16 + indice % 5 * .1;
    return `<circle cx="${x}" cy="${y}" r="${radio}" fill="#fff" opacity="${opacidad}"/>`;
  }).join("");
  const titulo = envolver(planeta.arquetipo, 22); const descripcion = envolver(planeta.descripcion, 48);
  const rutaSvg = ruta.map((item, indice) => {
    const columna = indice % 2; const fila = Math.floor(indice / 2); const x = 76 + columna * 365; const y = 900 + fila * 48;
    return `<circle cx="${x}" cy="${y - 8}" r="15" fill="${item.color}"/><text x="${x}" y="${y - 2}" text-anchor="middle" class="semibold" font-size="17" fill="#071a38">${indice + 1}</text><text x="${x + 27}" y="${y}" class="semibold" font-size="22" fill="#EAF2F8">${escapar(item.nombre)}</text>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
    <defs>
      <style>@font-face{font-family:Poppins;src:url(data:font/ttf;base64,${regular.toString("base64")})}@font-face{font-family:Poppins;src:url(data:font/ttf;base64,${semibold.toString("base64")});font-weight:700}.regular{font-family:Poppins}.semibold{font-family:Poppins;font-weight:700}</style>
      <linearGradient id="fondo" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${planeta.colorProfundo}"/><stop offset=".55" stop-color="#071a38"/><stop offset="1" stop-color="#02060e"/></linearGradient>
      <radialGradient id="orbe" cx="32%" cy="26%"><stop stop-color="#fff"/><stop offset=".09" stop-color="${planeta.color}"/><stop offset=".62" stop-color="${planeta.colorProfundo}"/><stop offset="1" stop-color="#050817"/></radialGradient>
      <filter id="brillo"><feGaussianBlur stdDeviation="18"/></filter>
    </defs>
    <rect width="900" height="1200" fill="url(#fondo)"/>${estrellas}
    <circle cx="725" cy="70" r="300" fill="${planeta.color}" opacity=".18" filter="url(#brillo)"/><circle cx="725" cy="70" r="285" fill="url(#orbe)"/>
    <rect x="62" y="78" width="405" height="64" rx="32" fill="#fff" opacity=".13"/><text x="92" y="120" class="semibold" font-size="24" fill="#EAF2F8" letter-spacing="2">${escapar(planeta.tema.toUpperCase())}</text>
    <text x="66" y="374" class="semibold" font-size="24" fill="${planeta.color}" letter-spacing="4">${escapar(planeta.nombre.toUpperCase())}</text>
    <text x="66" y="450" class="semibold" font-size="64" fill="#fff">${tspans(titulo, 66, 450, 72)}</text>
    <text x="66" y="${490 + titulo.length * 72}" class="regular" font-size="29" fill="#EAF2F8" opacity=".84">${tspans(descripcion, 66, 490 + titulo.length * 72, 41)}</text>
    <line x1="66" y1="835" x2="834" y2="835" stroke="#fff" opacity=".15"/><text x="66" y="875" class="semibold" font-size="22" fill="${planeta.color}" letter-spacing="3">TU RUTA SUGERIDA</text>${rutaSvg}
    <text x="66" y="1124" class="semibold" font-size="38" fill="#fff">Grupo·epm</text><text x="834" y="1090" text-anchor="end" class="regular" font-size="18" fill="#EAF2F8" opacity=".62">Tarjeta de</text><text x="834" y="1123" text-anchor="end" class="semibold" font-size="22" fill="#fff">${escapar(nombre)}</text>
  </svg>`;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  const documento = await PDFDocument.create(); const pagina = documento.addPage([900, 1200]); const imagen = await documento.embedPng(png); pagina.drawImage(imagen, { x: 0, y: 0, width: 900, height: 1200 });
  return documento.save();
}
