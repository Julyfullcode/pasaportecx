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

const ANCHO = 1600;
const ALTO = 920;
const FUENTE_REGULAR = join(process.cwd(), "public", "fuentes", "Poppins-Regular.ttf");
const FUENTE_SEMIBOLD = join(process.cwd(), "public", "fuentes", "Poppins-SemiBold.ttf");
const FUENTE_EMOJI = join(process.cwd(), "public", "fuentes", "NotoColorEmoji.ttf");

export function nombreCosechaSeguro(valor: string) {
  return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "participante";
}

function escaparPango(valor: string) {
  return valor.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

type TextoRenderizado = { buffer: Buffer; ancho: number; alto: number };

async function cargarFuenteEmoji() {
  await sharp({ text: { text: "😀", font: "Noto Color Emoji 16", fontfile: FUENTE_EMOJI, rgba: true } }).png().toBuffer();
}

async function renderizarTexto(
  valor: string,
  ancho: number,
  tamano: number,
  color: string,
  semibold = false,
  alineacion: "left" | "centre" = "left",
): Promise<TextoRenderizado> {
  const contenido = valor.trim() || " ";
  const buffer = await sharp({
    text: {
      text: `<span foreground="${color}" weight="${semibold ? 600 : 400}" font_family="Poppins, Noto Color Emoji">${escaparPango(contenido)}</span>`,
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
  await cargarFuenteEmoji();
  const avatarTamano = 180;
  const posiciones = [205, 415, 625];
  const respuestas = [datos.respuestas.meLlevo, datos.respuestas.agradezco, datos.respuestas.activo];
  const etiquetas = ["Me llevo", "Agradezco", "Activo"];
  const colores = ["#087aa8", "#0e7c6e", "#5c8f1d"];

  const [logo, foto, titulo, evento, nombre, empresa, subtitulo, reflexion, ...textosRespuesta] = await Promise.all([
    readFile(join(process.cwd(), "public", "marca", "logo-grupo-epm-blanco.png")).then((archivo) => sharp(archivo).resize(220, 64, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()),
    avatar(datos.urlFoto, datos.nombre, avatarTamano),
    textoAjustado(TITULO_DESAFIO_CIERRE, 930, 56, 40, 30, "#ffffff", true, "centre"),
    textoAjustado(datos.evento, 880, 30, 22, 17, "#d9edf0", false, "centre"),
    textoAjustado(datos.nombre, 350, 100, 38, 25, "#0b3b60", true, "centre"),
    textoAjustado(datos.empresa, 350, 66, 24, 18, "#52616b", false, "centre"),
    textoAjustado("Mi cosecha personal", 350, 32, 22, 18, "#0e7c6e", true, "centre"),
    textoAjustado("Lo que cosechamos hoy inspira la experiencia que construiremos mañana.", 940, 30, 20, 16, "#0e7c6e", true, "centre"),
    ...respuestas.map((respuesta) => {
      const longitud = respuesta.trim().length;
      const tamano = longitud <= 55 ? 40 : longitud <= 110 ? 36 : longitud <= 180 ? 32 : longitud <= 300 ? 27 : 23;
      return textoAjustado(respuesta, 880, 96, tamano, 18, "#4f5e68");
    }),
  ]);
  const etiquetasPng = await Promise.all(etiquetas.map((etiqueta, indice) => textoAjustado(etiqueta, 350, 42, 30, 25, colores[indice], true)));

  const panelPerfilX = 75;
  const panelPerfilY = 205;
  const panelPerfilAncho = 420;
  const panelPerfilAlto = 605;
  const separacionFotoPerfil = 36;
  const altoPerfil = nombre.alto + 10 + empresa.alto + 8 + subtitulo.alto;
  const altoContenidoPerfil = avatarTamano + separacionFotoPerfil + altoPerfil;
  const fotoX = panelPerfilX + Math.round((panelPerfilAncho - avatarTamano) / 2);
  const fotoY = panelPerfilY + Math.round((panelPerfilAlto - altoContenidoPerfil) / 2);
  const fotoCentroX = fotoX + Math.round(avatarTamano / 2);
  const fotoCentroY = fotoY + Math.round(avatarTamano / 2);
  const perfilTextoY = fotoY + avatarTamano + separacionFotoPerfil;
  const empresaY = perfilTextoY + nombre.alto + 10;
  const subtituloY = empresaY + empresa.alto + 8;
  const centrarEnPanelPerfil = (texto: TextoRenderizado) => panelPerfilX + Math.round((panelPerfilAncho - texto.ancho) / 2);
  const reflexionY = 847;
  const puntoFooterY = reflexionY + Math.round(reflexion.alto / 2);
  const centrarHorizontal = (texto: TextoRenderizado) => Math.round((ANCHO - texto.ancho) / 2);

  const fondo = Buffer.from(`<svg width="${ANCHO}" height="${ALTO}" viewBox="0 0 ${ANCHO} ${ALTO}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="cabecera" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0b3b60"/><stop offset="1" stop-color="#0e7c6e"/></linearGradient>
      <linearGradient id="r1" x1="0" x2="1"><stop stop-color="#e8f7fb"/><stop offset="1" stop-color="#effaf2"/></linearGradient>
      <linearGradient id="r2" x1="0" x2="1"><stop stop-color="#effaf2"/><stop offset="1" stop-color="#e8f7fb"/></linearGradient>
      <linearGradient id="r3" x1="0" x2="1"><stop stop-color="#f2f9e8"/><stop offset="1" stop-color="#e8f7fb"/></linearGradient>
    </defs>
    <rect width="${ANCHO}" height="${ALTO}" fill="#eff8fa"/>
    <circle cx="1545" cy="25" r="190" fill="#8cc63f" opacity=".14"/>
    <circle cx="20" cy="900" r="150" fill="#0e7c6e" opacity=".08"/>
    <rect x="50" y="30" width="1500" height="860" rx="58" fill="#fff"/>
    <rect x="75" y="55" width="1450" height="125" rx="38" fill="url(#cabecera)"/>
    <circle cx="1465" cy="62" r="112" fill="#8cc63f" opacity=".18"/>
    <rect x="${panelPerfilX}" y="${panelPerfilY}" width="${panelPerfilAncho}" height="${panelPerfilAlto}" rx="42" fill="#f7fbfc" stroke="#dcecf1" stroke-width="2"/>
    <circle cx="${fotoCentroX}" cy="${fotoCentroY}" r="101" fill="#087aa8" opacity=".10"/>
    <circle cx="${fotoCentroX}" cy="${fotoCentroY}" r="94" fill="#fff"/>
    <rect x="520" y="205" width="1005" height="185" rx="36" fill="url(#r1)"/>
    <rect x="520" y="415" width="1005" height="185" rx="36" fill="url(#r2)"/>
    <rect x="520" y="625" width="1005" height="185" rx="36" fill="url(#r3)"/>
    <circle cx="565" cy="242" r="13" fill="#087aa8"/>
    <circle cx="565" cy="452" r="13" fill="#0e7c6e"/>
    <circle cx="565" cy="662" r="13" fill="#5c8f1d"/>
    <rect x="550" y="276" width="6" height="91" rx="3" fill="#087aa8" opacity=".42"/>
    <rect x="550" y="486" width="6" height="91" rx="3" fill="#0e7c6e" opacity=".42"/>
    <rect x="550" y="696" width="6" height="91" rx="3" fill="#5c8f1d" opacity=".42"/>
    <circle cx="305" cy="${puntoFooterY}" r="7" fill="#8cc63f"/>
    <circle cx="1295" cy="${puntoFooterY}" r="7" fill="#0e7c6e"/>
  </svg>`);

  const overlays: sharp.OverlayOptions[] = [
    { input: logo, left: 115, top: 86 },
    { input: titulo.buffer, left: 505, top: 65 },
    { input: evento.buffer, left: 530, top: 133 },
    { input: foto, left: fotoX, top: fotoY },
    { input: nombre.buffer, left: centrarEnPanelPerfil(nombre), top: perfilTextoY },
    { input: empresa.buffer, left: centrarEnPanelPerfil(empresa), top: empresaY },
    { input: subtitulo.buffer, left: centrarEnPanelPerfil(subtitulo), top: subtituloY },
    { input: reflexion.buffer, left: centrarHorizontal(reflexion), top: reflexionY },
  ];

  posiciones.forEach((y, indice) => {
    overlays.push({ input: etiquetasPng[indice].buffer, left: 595, top: y + 18 });
    overlays.push({ input: textosRespuesta[indice].buffer, left: 575, top: y + 68 });
  });

  return sharp(fondo).composite(overlays).png({ compressionLevel: 7, adaptiveFiltering: false }).toBuffer();
}
