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
const ALTO = 1690;
const FUENTE_REGULAR = join(process.cwd(), "public", "fuentes", "Poppins-Regular.ttf");
const FUENTE_SEMIBOLD = join(process.cwd(), "public", "fuentes", "Poppins-SemiBold.ttf");

export function nombreCosechaSeguro(valor: string) {
  return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "participante";
}

function escaparPango(valor: string) {
  return valor.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

async function texto(
  valor: string,
  ancho: number,
  alto: number,
  tamano: number,
  color: string,
  semibold = false,
  alineacion: "left" | "centre" = "left",
) {
  return sharp({
    text: {
      text: `<span foreground="${color}">${escaparPango(valor.trim())}</span>`,
      font: `Poppins ${tamano}`,
      fontfile: semibold ? FUENTE_SEMIBOLD : FUENTE_REGULAR,
      width: ancho,
      height: alto,
      align: alineacion,
      rgba: true,
      wrap: "word-char",
      spacing: 0,
    },
  }).png().toBuffer();
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
    const altoTexto = Math.round(tamano * 0.55);
    const inicialesPng = await texto(iniciales, tamano, altoTexto, Math.round(tamano * 0.34), "#ffffff", true, "centre");
    return sharp({ create: { width: tamano, height: tamano, channels: 4, background: "#0e7c6e" } })
      .composite([{ input: inicialesPng, left: 0, top: Math.round((tamano - altoTexto) / 2) }, { input: mascara, blend: "dest-in" }])
      .png()
      .toBuffer();
  }
}

export async function generarTarjetaCosechaPng(datos: DatosTarjetaCosechaPng) {
  const avatarTamano = 190;
  const posiciones = [700, 970, 1240];
  const respuestas = [datos.respuestas.meLlevo, datos.respuestas.agradezco, datos.respuestas.activo];
  const etiquetas = ["Me llevo", "Agradezco", "Activo"];
  const colores = ["#087aa8", "#0e7c6e", "#5c8f1d"];

  const [logo, foto, titulo, evento, nombre, empresa, subtitulo, reflexion, ...textosRespuesta] = await Promise.all([
    readFile(join(process.cwd(), "public", "marca", "logo-grupo-epm-blanco.png")).then((archivo) => sharp(archivo).resize(240, 70, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()),
    avatar(datos.urlFoto, datos.nombre, avatarTamano),
    texto(TITULO_DESAFIO_CIERRE, 900, 105, 43, "#ffffff", true, "centre"),
    texto(datos.evento, 880, 52, 24, "#d9edf0", false, "centre"),
    texto(datos.nombre, 680, 105, 46, "#0b3b60", true),
    texto(datos.empresa, 680, 50, 27, "#52616b"),
    texto("Mi cosecha personal", 680, 44, 25, "#0e7c6e", true),
    texto("Lo que cosechamos hoy inspira la experiencia que construiremos mañana.", 980, 48, 23, "#0e7c6e", true, "centre"),
    ...respuestas.map((respuesta) => texto(respuesta, 900, 150, 30, "#4f5e68")),
  ]);
  const etiquetasPng = await Promise.all(etiquetas.map((etiqueta, indice) => texto(etiqueta, 350, 52, 32, colores[indice], true)));

  const fondo = Buffer.from(`<svg width="${ANCHO}" height="${ALTO}" viewBox="0 0 ${ANCHO} ${ALTO}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="cabecera" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0b3b60"/><stop offset="1" stop-color="#0e7c6e"/></linearGradient>
      <linearGradient id="r1" x1="0" x2="1"><stop stop-color="#e8f7fb"/><stop offset="1" stop-color="#effaf2"/></linearGradient>
      <linearGradient id="r2" x1="0" x2="1"><stop stop-color="#effaf2"/><stop offset="1" stop-color="#e8f7fb"/></linearGradient>
      <linearGradient id="r3" x1="0" x2="1"><stop stop-color="#f2f9e8"/><stop offset="1" stop-color="#e8f7fb"/></linearGradient>
    </defs>
    <rect width="${ANCHO}" height="${ALTO}" fill="#eff8fa"/>
    <circle cx="1160" cy="70" r="230" fill="#8cc63f" opacity=".14"/>
    <circle cx="20" cy="1640" r="190" fill="#0e7c6e" opacity=".08"/>
    <rect x="50" y="50" width="1100" height="1590" rx="66" fill="#fff"/>
    <rect x="80" y="80" width="1040" height="300" rx="54" fill="url(#cabecera)"/>
    <circle cx="1060" cy="120" r="135" fill="#8cc63f" opacity=".18"/>
    <rect x="110" y="410" width="980" height="250" rx="46" fill="#f7fbfc"/>
    <circle cx="240" cy="535" r="105" fill="#087aa8" opacity=".12"/>
    <circle cx="240" cy="535" r="99" fill="#fff"/>
    <rect x="110" y="700" width="980" height="240" rx="42" fill="url(#r1)"/>
    <rect x="110" y="970" width="980" height="240" rx="42" fill="url(#r2)"/>
    <rect x="110" y="1240" width="980" height="240" rx="42" fill="url(#r3)"/>
    <circle cx="155" cy="752" r="15" fill="#087aa8"/>
    <circle cx="155" cy="1022" r="15" fill="#0e7c6e"/>
    <circle cx="155" cy="1292" r="15" fill="#5c8f1d"/>
    <circle cx="110" cy="1566" r="7" fill="#8cc63f"/>
    <circle cx="1090" cy="1566" r="7" fill="#0e7c6e"/>
  </svg>`);

  const overlays: sharp.OverlayOptions[] = [
    { input: logo, left: 480, top: 105 },
    { input: titulo, left: 150, top: 185 },
    { input: evento, left: 160, top: 310 },
    { input: foto, left: 145, top: 440 },
    { input: nombre, left: 360, top: 452 },
    { input: empresa, left: 360, top: 555 },
    { input: subtitulo, left: 360, top: 608 },
    { input: reflexion, left: 110, top: 1542 },
  ];

  posiciones.forEach((y, indice) => {
    overlays.push({ input: etiquetasPng[indice], left: 185, top: y + 26 });
    overlays.push({ input: textosRespuesta[indice], left: 150, top: y + 80 });
  });

  return sharp(fondo).composite(overlays).png({ compressionLevel: 7, adaptiveFiltering: false }).toBuffer();
}
