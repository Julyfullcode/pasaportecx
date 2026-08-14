import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { TITULO_DESAFIO_CIERRE, type RespuestasCosecha } from "@/lib/cosecha-config";
import { storage } from "@/lib/storage";

export type DatosTarjetaCosechaPng = {
  nombre: string;
  empresa: string;
  evento: string;
  respuestas: RespuestasCosecha;
  urlFoto?: string | null;
};

const ANCHO = 1200;
const ALTO = 2000;
const FUENTE_REGULAR = join(process.cwd(), "public", "fuentes", "Poppins-Regular.ttf");
const FUENTE_SEMIBOLD = join(process.cwd(), "public", "fuentes", "Poppins-SemiBold.ttf");

export function nombreCosechaSeguro(valor: string) {
  return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "participante";
}

function escaparPango(valor: string) {
  return valor.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

type TextoRenderizado = { buffer: Buffer; ancho: number; alto: number };

async function renderizarTexto(
  valor: string,
  ancho: number,
  tamano: number,
  color: string,
  semibold = false,
  alineacion: "left" | "centre" = "left",
): Promise<TextoRenderizado> {
  const buffer = await sharp({
    text: {
      text: `<span foreground="${color}">${escaparPango(valor.trim() || " ")}</span>`,
      font: `Poppins ${tamano}`,
      fontfile: semibold ? FUENTE_SEMIBOLD : FUENTE_REGULAR,
      width: ancho,
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

async function textoAjustado(
  valor: string,
  ancho: number,
  altoMaximo: number,
  tamanoMaximo: number,
  tamanoMinimo: number,
  color: string,
  semibold = false,
  alineacion: "left" | "centre" = "left",
) {
  let ultimo = await renderizarTexto(valor, ancho, tamanoMaximo, color, semibold, alineacion);
  for (let tamano = tamanoMaximo; tamano >= tamanoMinimo; tamano -= 2) {
    const candidato = tamano === tamanoMaximo
      ? ultimo
      : await renderizarTexto(valor, ancho, tamano, color, semibold, alineacion);
    if (candidato.alto <= altoMaximo) return candidato;
    ultimo = candidato;
  }

  let limite = Math.max(24, Math.floor(valor.length * altoMaximo / Math.max(ultimo.alto, 1)));
  while (limite >= 24) {
    const abreviado = `${valor.slice(0, limite).trimEnd()}…`;
    const candidato = await renderizarTexto(abreviado, ancho, tamanoMinimo, color, semibold, alineacion);
    if (candidato.alto <= altoMaximo) return candidato;
    limite -= 12;
  }
  return ultimo;
}

async function leerFoto(url: string) {
  if (url.startsWith("/uploads/")) return storage.leer(url);
  if (url.startsWith("/")) return readFile(join(process.cwd(), "public", url.replace(/^\/+/, "")));
  throw new Error("Ruta de foto no compatible");
}

async function avatar(url: string | null | undefined, nombre: string, tamano: number) {
  const mascara = Buffer.from(`<svg width="${tamano}" height="${tamano}"><circle cx="${tamano / 2}" cy="${tamano / 2}" r="${tamano / 2}" fill="white"/></svg>`);
  try {
    if (!url) throw new Error("Sin foto");
    return sharp(await leerFoto(url)).rotate().resize(tamano, tamano, { fit: "cover", position: "centre" }).composite([{ input: mascara, blend: "dest-in" }]).png().toBuffer();
  } catch {
    const iniciales = nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((parte) => parte[0]?.toUpperCase()).join("") || "CX";
    const inicialesPng = await textoAjustado(iniciales, tamano, Math.round(tamano * 0.58), Math.round(tamano * 0.34), Math.round(tamano * 0.25), "#ffffff", true, "centre");
    return sharp({ create: { width: tamano, height: tamano, channels: 4, background: "#0e7c6e" } })
      .composite([{ input: inicialesPng.buffer, left: 0, top: Math.round((tamano - inicialesPng.alto) / 2) }, { input: mascara, blend: "dest-in" }])
      .png()
      .toBuffer();
  }
}

export async function generarTarjetaCosechaPng(datos: DatosTarjetaCosechaPng) {
  const avatarTamano = 200;
  const posiciones = [770, 1100, 1430];
  const respuestas = [datos.respuestas.meLlevo, datos.respuestas.agradezco, datos.respuestas.activo];
  const etiquetas = ["Me llevo", "Agradezco", "Activo"];
  const colores = ["#087aa8", "#0e7c6e", "#5c8f1d"];

  const [logo, foto, titulo, evento, nombre, empresa, subtitulo, reflexion, ...textosRespuesta] = await Promise.all([
    readFile(join(process.cwd(), "public", "marca", "logo-grupo-epm-blanco.png")).then((archivo) => sharp(archivo).resize(240, 70, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()),
    avatar(datos.urlFoto, datos.nombre, avatarTamano),
    textoAjustado(TITULO_DESAFIO_CIERRE, 900, 105, 44, 34, "#ffffff", true, "centre"),
    textoAjustado(datos.evento, 880, 58, 26, 18, "#d9edf0", false, "centre"),
    textoAjustado(datos.nombre, 650, 112, 44, 30, "#0b3b60", true),
    textoAjustado(datos.empresa, 650, 42, 28, 20, "#52616b"),
    textoAjustado("Mi cosecha personal", 650, 38, 24, 20, "#0e7c6e", true),
    textoAjustado("Lo que cosechamos hoy inspira la experiencia que construiremos mañana.", 960, 42, 23, 18, "#0e7c6e", true, "centre"),
    ...respuestas.map((respuesta) => textoAjustado(respuesta, 865, 180, 30, 18, "#4f5e68")),
  ]);
  const etiquetasPng = await Promise.all(etiquetas.map((etiqueta, indice) => textoAjustado(etiqueta, 350, 48, 32, 26, colores[indice], true)));

  const altoPerfil = nombre.alto + empresa.alto + subtitulo.alto + 24;
  const perfilTextoY = 430 + Math.max(28, Math.round((300 - altoPerfil) / 2));
  const empresaY = perfilTextoY + nombre.alto + 12;
  const subtituloY = empresaY + empresa.alto + 8;

  const fondo = Buffer.from(`<svg width="${ANCHO}" height="${ALTO}" viewBox="0 0 ${ANCHO} ${ALTO}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="cabecera" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0b3b60"/><stop offset="1" stop-color="#0e7c6e"/></linearGradient>
      <linearGradient id="r1" x1="0" x2="1"><stop stop-color="#e8f7fb"/><stop offset="1" stop-color="#effaf2"/></linearGradient>
      <linearGradient id="r2" x1="0" x2="1"><stop stop-color="#effaf2"/><stop offset="1" stop-color="#e8f7fb"/></linearGradient>
      <linearGradient id="r3" x1="0" x2="1"><stop stop-color="#f2f9e8"/><stop offset="1" stop-color="#e8f7fb"/></linearGradient>
    </defs>
    <rect width="${ANCHO}" height="${ALTO}" fill="#eff8fa"/>
    <circle cx="1160" cy="70" r="230" fill="#8cc63f" opacity=".14"/>
    <circle cx="20" cy="1940" r="210" fill="#0e7c6e" opacity=".08"/>
    <rect x="50" y="50" width="1100" height="1900" rx="66" fill="#fff"/>
    <rect x="80" y="80" width="1040" height="320" rx="54" fill="url(#cabecera)"/>
    <circle cx="1060" cy="120" r="135" fill="#8cc63f" opacity=".18"/>
    <rect x="110" y="430" width="980" height="300" rx="46" fill="#f7fbfc" stroke="#dcecf1" stroke-width="2"/>
    <circle cx="250" cy="580" r="112" fill="#087aa8" opacity=".10"/>
    <circle cx="250" cy="580" r="104" fill="#fff"/>
    <rect x="110" y="770" width="980" height="300" rx="42" fill="url(#r1)"/>
    <rect x="110" y="1100" width="980" height="300" rx="42" fill="url(#r2)"/>
    <rect x="110" y="1430" width="980" height="300" rx="42" fill="url(#r3)"/>
    <circle cx="155" cy="821" r="14" fill="#087aa8"/>
    <circle cx="155" cy="1151" r="14" fill="#0e7c6e"/>
    <circle cx="155" cy="1481" r="14" fill="#5c8f1d"/>
    <rect x="140" y="864" width="6" height="176" rx="3" fill="#087aa8" opacity=".42"/>
    <rect x="140" y="1194" width="6" height="176" rx="3" fill="#0e7c6e" opacity=".42"/>
    <rect x="140" y="1524" width="6" height="176" rx="3" fill="#5c8f1d" opacity=".42"/>
    <circle cx="110" cy="1858" r="7" fill="#8cc63f"/>
    <circle cx="1090" cy="1858" r="7" fill="#0e7c6e"/>
  </svg>`);

  const overlays: sharp.OverlayOptions[] = [
    { input: logo, left: 480, top: 105 },
    { input: titulo.buffer, left: 150, top: 188 },
    { input: evento.buffer, left: 160, top: 324 },
    { input: foto, left: 150, top: 480 },
    { input: nombre.buffer, left: 390, top: perfilTextoY },
    { input: empresa.buffer, left: 390, top: empresaY },
    { input: subtitulo.buffer, left: 390, top: subtituloY },
    { input: reflexion.buffer, left: 120, top: 1838 },
  ];

  posiciones.forEach((y, indice) => {
    overlays.push({ input: etiquetasPng[indice].buffer, left: 185, top: y + 28 });
    overlays.push({ input: textosRespuesta[indice].buffer, left: 165, top: y + 94 });
  });

  return sharp(fondo).composite(overlays).png({ compressionLevel: 7, adaptiveFiltering: false }).toBuffer();
}
