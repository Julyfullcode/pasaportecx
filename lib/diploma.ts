import fontkit from "@pdf-lib/fontkit";
import {
  PDFDocument,
  PDFName,
  StandardFonts,
  appendBezierCurve,
  clip,
  closePath,
  endPath,
  lineTo,
  moveTo,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  type PDFFont,
  type PDFPage,
  type RGB,
} from "pdf-lib";
import { DIRECTIVA_EXPERIENCIA } from "@/lib/mensajes";

type DatosDiploma = {
  nombre: string;
  empresa: string;
  evento: string;
  organizadores: string;
  fecha: Date;
  logo?: Uint8Array;
  fuenteRegular?: Uint8Array;
  fuenteSemibold?: Uint8Array;
};

const anchoPagina = 792;
const altoPagina = 612;

function textoCentrado(pagina: PDFPage, texto: string, y: number, tamano: number, fuente: PDFFont, color: RGB) {
  const ancho = fuente.widthOfTextAtSize(texto, tamano);
  pagina.drawText(texto, { x: (anchoPagina - ancho) / 2, y, size: tamano, font: fuente, color });
}

function tamanoQueCabe(texto: string, fuente: PDFFont, maximo: number, ancho: number, minimo = 10) {
  let tamano = maximo;
  while (tamano > minimo && fuente.widthOfTextAtSize(texto, tamano) > ancho) tamano -= 0.5;
  return tamano;
}

function lineas(texto: string, fuente: PDFFont, tamano: number, anchoMaximo: number) {
  const palabras = texto.trim().split(/\s+/).filter(Boolean);
  const resultado: string[] = [];
  let actual = "";
  for (const palabra of palabras) {
    const candidata = actual ? `${actual} ${palabra}` : palabra;
    if (actual && fuente.widthOfTextAtSize(candidata, tamano) > anchoMaximo) {
      resultado.push(actual);
      actual = palabra;
    } else {
      actual = candidata;
    }
  }
  if (actual) resultado.push(actual);
  return resultado;
}

function cajaRedondeada(pagina: PDFPage, x: number, y: number, ancho: number, alto: number, radio: number, color: RGB, opacity = 1) {
  const r = Math.min(radio, ancho / 2, alto / 2);
  pagina.drawRectangle({ x: x + r, y, width: ancho - 2 * r, height: alto, color, opacity });
  pagina.drawRectangle({ x, y: y + r, width: ancho, height: alto - 2 * r, color, opacity });
  pagina.drawCircle({ x: x + r, y: y + r, size: r, color, opacity });
  pagina.drawCircle({ x: x + ancho - r, y: y + r, size: r, color, opacity });
  pagina.drawCircle({ x: x + r, y: y + alto - r, size: r, color, opacity });
  pagina.drawCircle({ x: x + ancho - r, y: y + alto - r, size: r, color, opacity });
}

function recortarCajaRedondeada(pagina: PDFPage, x: number, y: number, ancho: number, alto: number, radio: number) {
  const control = radio * 0.5522847498;
  pagina.pushOperators(
    pushGraphicsState(),
    moveTo(x + radio, y),
    lineTo(x + ancho - radio, y),
    appendBezierCurve(x + ancho - radio + control, y, x + ancho, y + radio - control, x + ancho, y + radio),
    lineTo(x + ancho, y + alto - radio),
    appendBezierCurve(x + ancho, y + alto - radio + control, x + ancho - radio + control, y + alto, x + ancho - radio, y + alto),
    lineTo(x + radio, y + alto),
    appendBezierCurve(x + radio - control, y + alto, x, y + alto - radio + control, x, y + alto - radio),
    lineTo(x, y + radio),
    appendBezierCurve(x, y + radio - control, x + radio - control, y, x + radio, y),
    closePath(),
    clip(),
    endPath(),
  );
}

function dibujarDegradado(
  pagina: PDFPage,
  x: number,
  y: number,
  ancho: number,
  alto: number,
  inicio: [number, number, number],
  fin: [number, number, number],
  radio: number,
) {
  const pasos = 64;
  recortarCajaRedondeada(pagina, x, y, ancho, alto, radio);
  for (let indice = 0; indice < pasos; indice += 1) {
    const t = indice / (pasos - 1);
    pagina.drawRectangle({
      x: x + (ancho / pasos) * indice,
      y,
      width: ancho / pasos + 1,
      height: alto,
      color: rgb(
        inicio[0] + (fin[0] - inicio[0]) * t,
        inicio[1] + (fin[1] - inicio[1]) * t,
        inicio[2] + (fin[2] - inicio[2]) * t,
      ),
    });
  }
  pagina.pushOperators(popGraphicsState());
}

function parrafoCentrado(
  pagina: PDFPage,
  texto: string,
  y: number,
  tamano: number,
  fuente: PDFFont,
  ancho: number,
  interlineado: number,
  color: RGB,
  maximoLineas = 3,
) {
  lineas(texto, fuente, tamano, ancho)
    .slice(0, maximoLineas)
    .forEach((renglon, indice) => textoCentrado(pagina, renglon, y - indice * interlineado, tamano, fuente, color));
}

export async function generarDiplomaPdf(datos: DatosDiploma) {
  const documento = await PDFDocument.create();
  documento.registerFontkit(fontkit);
  documento.setTitle(`Certificado de participación - ${datos.nombre}`);
  documento.setSubject(datos.evento);
  documento.setAuthor(datos.organizadores || "Grupo EPM");

  const pagina = documento.addPage([anchoPagina, altoPagina]);
  const normal = datos.fuenteRegular
    ? await documento.embedFont(datos.fuenteRegular, { subset: true })
    : await documento.embedFont(StandardFonts.Helvetica);
  const semibold = datos.fuenteSemibold
    ? await documento.embedFont(datos.fuenteSemibold, { subset: true })
    : await documento.embedFont(StandardFonts.HelveticaBold);
  const azul = rgb(0.043, 0.153, 0.255);
  const azulProfundo = rgb(0.043, 0.231, 0.376);
  const teal = rgb(0.055, 0.486, 0.431);
  const verde = rgb(0.463, 0.741, 0.118);
  const gris = rgb(0.31, 0.37, 0.42);
  const blanco = rgb(1, 1, 1);
  const fondo = rgb(0.945, 0.975, 0.978);

  pagina.drawRectangle({ x: 0, y: 0, width: anchoPagina, height: altoPagina, color: fondo });
  pagina.drawCircle({ x: 760, y: 580, size: 140, color: verde, opacity: 0.12 });
  pagina.drawCircle({ x: 14, y: 22, size: 105, color: azul, opacity: 0.08 });
  cajaRedondeada(pagina, 18, 18, 756, 576, 34, blanco);

  dibujarDegradado(pagina, 30, 448, 732, 134, [0.043, 0.153, 0.255], [0.055, 0.486, 0.431], 28);
  pagina.drawCircle({ x: 716, y: 565, size: 75, color: verde, opacity: 0.2 });
  pagina.drawCircle({ x: 670, y: 470, size: 44, color: blanco, opacity: 0.07 });

  if (datos.logo) {
    try {
      const logo = await documento.embedPng(datos.logo);
      const escala = Math.min(148 / logo.width, 30 / logo.height);
      pagina.drawImage(logo, { x: 52, y: 537, width: logo.width * escala, height: logo.height * escala });
    } catch {
      pagina.drawText("Grupo EPM", { x: 52, y: 544, size: 16, font: normal, color: blanco });
    }
  } else {
    pagina.drawText("Grupo EPM", { x: 52, y: 544, size: 16, font: normal, color: blanco });
  }

  textoCentrado(pagina, "Certificado de participación", 500, 29, semibold, blanco);
  const lineasEvento = lineas(datos.evento, normal, 13, 610).slice(0, 2);
  lineasEvento.forEach((renglon, indice) => textoCentrado(pagina, renglon, 470 - indice * 17, 13, normal, blanco));

  textoCentrado(pagina, "Este reconocimiento es para", 415, 13, normal, gris);
  const tamanoNombre = tamanoQueCabe(datos.nombre, semibold, 39, 680, 20);
  textoCentrado(pagina, datos.nombre, 367, tamanoNombre, semibold, azulProfundo);

  const afiliacion = datos.empresa;
  const anchoAfiliacion = Math.min(430, normal.widthOfTextAtSize(afiliacion, 11.5) + 44);
  cajaRedondeada(pagina, (anchoPagina - anchoAfiliacion) / 2, 328, anchoAfiliacion, 31, 15.5, rgb(0.925, 0.968, 0.985));
  textoCentrado(pagina, afiliacion, 338, tamanoQueCabe(afiliacion, normal, 11.5, anchoAfiliacion - 24, 8.5), normal, azul);

  parrafoCentrado(
    pagina,
    `Por su participación activa en ${datos.evento}, un espacio para conectarnos, compartir aprendizajes y avanzar juntos en la construcción de experiencias más simples y confiables.`,
    294,
    12.5,
    normal,
    650,
    18,
    gris,
    3,
  );

  dibujarDegradado(pagina, 78, 180, 636, 82, [0.9, 0.97, 0.93], [0.87, 0.95, 0.98], 26);
  pagina.drawCircle({ x: 108, y: 221, size: 19, color: verde, opacity: 0.85 });
  pagina.drawCircle({ x: 684, y: 221, size: 19, color: teal, opacity: 0.2 });
  parrafoCentrado(pagina, DIRECTIVA_EXPERIENCIA, 225, 16.5, semibold, 540, 22, azulProfundo, 2);

  const fecha = new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Bogota",
  }).format(datos.fecha);
  textoCentrado(pagina, fecha, 144, 10.5, normal, gris);

  const organizadores = datos.organizadores.trim() || "Grupo EPM";
  parrafoCentrado(pagina, `Organizado por ${organizadores}`, 117, 10, normal, 650, 14, teal, 2);

  dibujarDegradado(pagina, 44, 43, 704, 48, [0.043, 0.153, 0.255], [0.055, 0.486, 0.431], 22);
  textoCentrado(pagina, "Encontrarnos nos inspira para avanzar juntos", 61, 12, semibold, blanco);

  const preferencias = documento.catalog.getOrCreateViewerPreferences();
  preferencias.setFitWindow(true);
  preferencias.setCenterWindow(true);
  preferencias.setDisplayDocTitle(true);
  documento.catalog.set(PDFName.of("PageLayout"), PDFName.of("SinglePage"));
  documento.catalog.set(PDFName.of("PageMode"), PDFName.of("UseNone"));
  documento.catalog.set(PDFName.of("OpenAction"), documento.context.obj([pagina.ref, PDFName.of("Fit")]));

  return documento.save();
}
